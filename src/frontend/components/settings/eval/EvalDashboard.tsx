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
    trigger,
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

      <EvalStatusBar
        status={isRunning || triggerState.status === 'loading' ? 'in_progress' : evalState.status}
        score={evalState.score}
        pass={evalState.pass}
        fail={evalState.fail}
        error={evalState.error}
        createdAt={evalState.createdAt}
      />

      {trends && <MetricTrendsSection data={trends} />}

      {hasHistory && history && (
        <EvalRunsTable
          runs={history.runs}
          onViewReport={setReportData}
        />
      )}

      {evalState.status === 'no_dataset' && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {evalState.message || 'No eval dataset configured. Add test cases via the Dataset UI before running evaluation.'}
        </div>
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
