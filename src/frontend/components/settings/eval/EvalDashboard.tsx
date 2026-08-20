import { useState } from 'react';
import { useEvalDashboard } from '../../../hooks/useEvalDashboard';
import type { EvalRow } from './eval-types';
import { EvalControls } from './EvalControls';
import { EvalStatusBar } from './EvalStatusBar';
import { MetricTrendsSection } from './MetricTrendsSection';
import { EvalRunsTable } from './EvalRunsTable';
import { FullReportModal } from './FullReportModal';

export function EvalDashboard() {
  const {
    evalState,
    isRunning,
    result,
    history,
    trends,
    triggerState,
    triggeredAt,
    hasTriggered,
    trigger,
    authRequired,
    clearAuthRequired,
  } = useEvalDashboard();

  const [forceMode, setForceMode] = useState(false);
  const [reportData, setReportData] = useState<EvalRow | null>(null);

  const hasResult = result != null;
  const hasHistory = (history?.runs?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <EvalControls
        onTrigger={trigger}
        isRunning={isRunning}
        triggerState={triggerState}
        forceMode={forceMode}
        onForceModeChange={setForceMode}
      />

      {authRequired.length > 0 && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 space-y-2">
          <p className="text-sm font-medium text-yellow-800">
            Connect required services before running eval:
          </p>
          <div className="flex flex-col gap-2">
            {authRequired.map((server) => (
              <button
                key={server.name}
                className="w-fit rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                onClick={() => {
                  fetch(`/api/proxy/agent${server.connect_url}`, { method: 'POST', credentials: 'same-origin' })
                    .then((r) => r.json())
                    .then((b: { authorize_url?: string }) => {
                      if (b.authorize_url) window.open(b.authorize_url, `mcp-connect-${server.name}`, 'width=600,height=700');
                    })
                    .catch(() => undefined);
                }}
              >
                Connect {server.name.charAt(0).toUpperCase() + server.name.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-yellow-700">
            After connecting, click Evaluate again.{' '}
            <button className="underline" onClick={clearAuthRequired}>Dismiss</button>
          </p>
        </div>
      )}

      {hasTriggered && (
        <EvalStatusBar
          status={isRunning || triggerState.status === 'loading' ? 'in_progress' : evalState.status}
          score={evalState.score}
          pass={evalState.pass}
          fail={evalState.fail}
          error={evalState.error}
          triggeredAt={triggeredAt}
        />
      )}

      {trends && <MetricTrendsSection data={trends} />}

      {hasHistory && history && (
        <EvalRunsTable
          runs={history.runs}
          onViewReport={setReportData}
        />
      )}

      {!hasResult && !isRunning && !hasHistory &&
        evalState.status !== 'no_dataset' &&
        evalState.status !== 'error' &&
        evalState.status !== 'failed' && (
        <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No evaluation history yet. Run your first eval to see results and trends.
          </p>
        </div>
      )}

      {reportData && (
        <FullReportModal
          result={reportData}
          prevScore={null}
          onClose={() => setReportData(null)}
        />
      )}
    </div>
  );
}
