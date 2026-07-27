import { useEffect, useState } from 'react';

let runningStartTime: number | null = null;

interface EvalStatusBarProps {
  status: string | null;
  score: number | null;
  pass: number;
  fail: number;
}

export function EvalStatusBar({ status, score, pass, fail }: EvalStatusBarProps) {
  const [elapsed, setElapsed] = useState('');

  const isRunning = status === 'in_progress' || status === 'not_started';

  useEffect(() => {
    if (isRunning && runningStartTime == null) {
      runningStartTime = Date.now();
    }
    if (!isRunning) {
      runningStartTime = null;
      setElapsed('');
    }
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || runningStartTime == null) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - runningStartTime!) / 1000);
      if (secs < 60) setElapsed(`${secs}s`);
      else setElapsed(`${Math.floor(secs / 60)}m ${secs % 60}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  if (!status || status === 'unknown') return null;

  if (isRunning) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 px-3 py-2">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Evaluating…</span>
        {elapsed && <span className="text-xs text-blue-500 dark:text-blue-400 ml-auto">{elapsed}</span>}
      </div>
    );
  }

  if (status === 'completed' || status === 'passed') {
    const pct = score != null ? Math.round(score * 100) : null;
    const isGood = pct == null || pct >= 70;

    return (
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
        isGood
          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
          : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
      }`}>
        <span className={`text-sm ${
          isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isGood ? '✓' : '✗'}
        </span>
        <span className={`text-sm font-medium ${
          isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-700 dark:text-red-300'
        }`}>
          {pct != null ? `${pct}%` : 'Completed'}
        </span>
        <span className="text-xs text-muted-foreground">
          {pass} passed · {fail} failed
        </span>
      </div>
    );
  }

  if (status === 'failed' || status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2">
        <span className="text-red-600 dark:text-red-400">✗</span>
        <span className="text-sm font-medium text-red-700 dark:text-red-300">Eval failed</span>
        {(pass > 0 || fail > 0) && (
          <span className="text-xs text-muted-foreground">
            {pass} passed · {fail} failed
          </span>
        )}
      </div>
    );
  }

  return null;
}
