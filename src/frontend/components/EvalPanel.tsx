import React, { useState } from 'react';
import {
  Button,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Tooltip,
} from '@patternfly/react-core';
import { buildAppPath } from '../lib/app-paths';
import { useEvalStatus } from '../hooks/useEvalStatus';

export function EvalPanel() {
  const { state: eval_ } = useEvalStatus();
  const [triggering, setTriggering] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const badge = () => {
    switch (eval_.status) {
      case 'not_started':
        return <Label color="grey">Queued</Label>;
      case 'in_progress':
        return <Label color="blue">Running</Label>;
      case 'completed':
        return (
          <Label color="green">
            {eval_.score !== null ? `${Math.round(eval_.score * 100)}%` : 'Done'} —{' '}
            {eval_.pass}✓ {eval_.fail}✗
          </Label>
        );
      case 'failed':
        return <Label color="red">Failed</Label>;
      default:
        return null;
    }
  };

  const handleEvaluate = async (force = false) => {
    setTriggering(true);
    try {
      // Call trigger — agentpod handles cache check, in_progress guard, and starting the eval pod
      const triggerPath = force
        ? '/api/proxy/agent/evals/force-trigger'
        : '/api/proxy/agent/evals/trigger';
      try {
        const triggerRes = await fetch(buildAppPath(triggerPath), {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (triggerRes.ok) {
          const triggerData = (await triggerRes.json()) as Record<string, unknown>;
          if (
            (triggerData as { cached?: boolean }).cached ||
            (triggerData.eval_status === 'in_progress' &&
              (triggerData as { message?: string }).message)
          ) {
            return;
          }
        }
      } catch {
        // endpoint not available — nothing to do
        return;
      }
    } catch {
      // ignore — status polling will reflect outcome
    } finally {
      setTriggering(false);
    }
  };

  const isRunning = triggering || eval_.status === 'in_progress';

  return (
    <div
      style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--pf-global--BorderColor--100)',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
      >
        <Button
          variant="secondary"
          size="sm"
          isLoading={isRunning}
          isDisabled={isRunning}
          onClick={() => void handleEvaluate(false)}
        >
          Evaluate
        </Button>

        {eval_.status === 'completed' && (
          <Tooltip content="Force re-run, bypassing cached result">
            <Button
              variant="plain"
              size="sm"
              aria-label="Force re-evaluate"
              isDisabled={isRunning}
              onClick={() => void handleEvaluate(true)}
            >
              ↺
            </Button>
          </Tooltip>
        )}

        {badge()}
      </div>

      {eval_.status === 'completed' && (
        <Button variant="link" isInline onClick={() => setResultsOpen(true)}>
          View report
        </Button>
      )}

      <Modal
        variant={ModalVariant.small}
        isOpen={resultsOpen}
        onClose={() => setResultsOpen(false)}
        aria-label="Eval report"
      >
        <ModalHeader title="Eval Report" />
        <ModalBody>
          <p>
            <strong>Score:</strong>{' '}
            {eval_.score !== null ? `${Math.round(eval_.score * 100)}%` : '—'}
          </p>
          <p>
            <strong>Pass:</strong> {eval_.pass}&nbsp;&nbsp;
            <strong>Fail:</strong> {eval_.fail}&nbsp;&nbsp;
            <strong>Error:</strong> {eval_.error}
          </p>
          <p>
            <strong>Config hash:</strong> <code>{eval_.configHash || '—'}</code>
          </p>
        </ModalBody>
      </Modal>
    </div>
  );
}
