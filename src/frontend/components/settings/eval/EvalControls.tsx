import type { ActionState, EvalStatus } from './eval-types';

interface EvalControlsProps {
  onTrigger: (force: boolean) => void;
  isRunning: boolean;
  triggerState: ActionState;
  forceMode: boolean;
  onForceModeChange: (force: boolean) => void;
}

function statusColor(s: EvalStatus) {
  if (s === 'success') return 'text-emerald-600 dark:text-emerald-400';
  if (s === 'error') return 'text-red-600 dark:text-red-400';
  return 'text-muted-foreground';
}

export function EvalControls({
  onTrigger,
  isRunning,
  triggerState,
  forceMode,
  onForceModeChange,
}: EvalControlsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => onTrigger(forceMode)}
          disabled={triggerState.status === 'loading' || isRunning}
          className="px-5 py-2 rounded-md bg-primary text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          style={{ color: '#ffffff' }}
        >
          {triggerState.status === 'loading' ? 'Running…' : 'Evaluate'}
        </button>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground/70 hover:text-foreground transition-colors select-none">
          <input
            type="checkbox"
            checked={forceMode}
            onChange={(e) => onForceModeChange(e.target.checked)}
            disabled={isRunning}
            className="rounded border-border accent-primary"
          />
          Force re-run
        </label>
      </div>

      {triggerState.message && (
        <p className={`text-xs ${statusColor(triggerState.status)}`}>
          {triggerState.message}
        </p>
      )}
    </div>
  );
}
