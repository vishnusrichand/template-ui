import { useCallback, useEffect, useRef, useState } from 'react';
import { buildAppPath } from '../lib/app-paths';
import { useEvalStatus, type EvalState } from './useEvalStatus';
import { useEvalHistory } from './useEvalHistory';
import { useEvalTrends } from './useEvalTrends';
import type {
  ActionState,
  EvalRow,
  EvalHistoryResponse,
  EvalTrendsResponse,
} from '../components/settings/eval/eval-types';

export interface EvalDashboardState {
  evalState: EvalState;
  isRunning: boolean;
  result: EvalRow | null;
  prevScore: number | null;
  history: EvalHistoryResponse | null;
  trends: EvalTrendsResponse | null;
  triggerState: ActionState;
  trigger: (force: boolean) => Promise<void>;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
}

export function useEvalDashboard(): EvalDashboardState {
  const evalState = useEvalStatus();
  const { data: history, refetch: refetchHistory } = useEvalHistory();
  const { data: trends, refetch: refetchTrends } = useEvalTrends();

  const [result, setResult] = useState<EvalRow | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [triggerState, setTriggerState] = useState<ActionState>({
    status: 'idle',
    message: '',
  });
  const [detailOpen, setDetailOpen] = useState(false);

  const prevStatusRef = useRef(evalState.status);
  const resultRef = useRef(result);
  resultRef.current = result;

  const isRunning =
    evalState.status === 'in_progress' || evalState.status === 'not_started';

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(
        buildAppPath('/api/proxy/agent/evals/results'),
        { credentials: 'same-origin' },
      );
      if (!res.ok) return;
      const data = (await res.json()) as EvalRow;
      setPrevScore(resultRef.current?.eval_score ?? null);
      setResult(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const wasRunning =
      prevStatusRef.current === 'in_progress' ||
      prevStatusRef.current === 'not_started';
    const isNowComplete = evalState.status === 'completed';

    if (wasRunning && isNowComplete) {
      void fetchResults();
      void refetchHistory();
      void refetchTrends();
    }

    if (
      prevStatusRef.current === 'unknown' &&
      (evalState.status === 'completed' || evalState.status === 'failed')
    ) {
      void fetchResults();
    }

    prevStatusRef.current = evalState.status;
  }, [evalState.status, fetchResults, refetchHistory, refetchTrends]);

  const trigger = useCallback(
    async (force: boolean) => {
      const path = force
        ? '/api/proxy/agent/evals/force-trigger'
        : '/api/proxy/agent/evals/trigger';

      setTriggerState({ status: 'loading', message: '' });
      try {
        const res = await fetch(buildAppPath(path), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          setTriggerState({
            status: 'error',
            message: (data.detail as string) || res.statusText,
          });
          return;
        }

        if ((data as { cached?: boolean }).cached) {
          setTriggerState({
            status: 'success',
            message: 'Already complete — showing latest result.',
          });
          await fetchResults();
          void refetchHistory();
          void refetchTrends();
          return;
        }

        if (
          data.eval_status === 'in_progress' &&
          (data as { message?: string }).message
        ) {
          setTriggerState({
            status: 'success',
            message: 'Eval already running — check back shortly.',
          });
          return;
        }

        setTriggerState({
          status: 'success',
          message: 'Eval queued — running in background.',
        });
      } catch (e) {
        setTriggerState({ status: 'error', message: String(e) });
      }
    },
    [fetchResults, refetchHistory, refetchTrends],
  );

  return {
    evalState,
    isRunning,
    result,
    prevScore,
    history,
    trends,
    triggerState,
    trigger,
    detailOpen,
    setDetailOpen,
  };
}
