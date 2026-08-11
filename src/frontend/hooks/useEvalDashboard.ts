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
  history: EvalHistoryResponse | null;
  trends: EvalTrendsResponse | null;
  triggerState: ActionState;
  trigger: (force: boolean) => Promise<void>;
}

export function useEvalDashboard(): EvalDashboardState {
  const { state: evalState, refresh: refreshStatus } = useEvalStatus();
  const { data: history, refetch: refetchHistory } = useEvalHistory();
  const { data: trends, refetch: refetchTrends } = useEvalTrends();

  const [result, setResult] = useState<EvalRow | null>(null);
  const [triggerState, setTriggerState] = useState<ActionState>({
    status: 'idle',
    message: '',
  });

  const prevStatusRef = useRef(evalState.status);
  // Keep refreshStatus stable in a ref so trigger callback can use it without re-creating
  const refreshStatusRef = useRef(refreshStatus);
  refreshStatusRef.current = refreshStatus;
  const resultRef = useRef(result);
  resultRef.current = result;

  const isRunning = evalState.status === 'in_progress';

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(
        buildAppPath('/api/proxy/agent/evals/results'),
        { credentials: 'same-origin' },
      );
      if (!res.ok) return;
      const data = (await res.json()) as EvalRow;
      setResult(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const wasRunning =
      prevStatusRef.current === 'in_progress' ||
      prevStatusRef.current === 'not_started' ||
      prevStatusRef.current === 'unknown';
    const isNowComplete = evalState.status === 'completed';
    const isNowDone =
      evalState.status === 'completed' ||
      evalState.status === 'failed' ||
      evalState.status === 'error' ||
      evalState.status === 'no_dataset';

    if (wasRunning && isNowComplete) {
      void fetchResults();
      void refetchHistory();
      void refetchTrends();
    }

    // Clear the "queued / running" trigger message once the eval reaches any
    // terminal or definitive state — including the fast-fail path where status
    // jumps from the initial 'unknown' directly to 'error' before the first poll.
    if (wasRunning && isNowDone) {
      setTriggerState({ status: 'idle', message: '' });
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
            message: (data.message as string) || (data.detail as string) || res.statusText,
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
        // Immediately refresh status so UI switches to in_progress without
        // waiting for the next scheduled poll (which may be up to 60s away).
        refreshStatusRef.current();
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
    history,
    trends,
    triggerState,
    trigger,
  };
}
