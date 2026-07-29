import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FullReportModal } from '../FullReportModal';
import type { EvalRow } from '../eval-types';

function makeResult(tags: (string | undefined)[]): EvalRow {
  return {
    eval_score: 0.8,
    pass: 4,
    fail: 1,
    results_detail: {
      turns: tags.map((tag, i) => ({
        conversation_group_id: `conv_${i}`,
        metric_identifier: 'custom:answer_correctness',
        result: 'PASS',
        score: '1.0',
        reason: 'ok',
        tag,
      })),
    },
  };
}

describe('FullReportModal tag filter', () => {
  it('does not show tag chips when no turns have tags', () => {
    render(
      <FullReportModal result={makeResult([undefined, undefined])} prevScore={null} onClose={() => {}} />
    );
    expect(screen.queryByText('All')).not.toBeInTheDocument();
  });

  it('shows tag chips when turns have tags', () => {
    render(
      <FullReportModal result={makeResult(['hitl', 'tool_use'])} prevScore={null} onClose={() => {}} />
    );
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Hitl')).toBeInTheDocument();
    expect(screen.getByText('Tool Use')).toBeInTheDocument();
  });

  it('filters conversations when a tag chip is clicked', () => {
    render(
      <FullReportModal result={makeResult(['hitl', 'tool_use'])} prevScore={null} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('Hitl'));
    // conv_0 (hitl) visible, conv_1 (tool_use) hidden
    expect(screen.getByText('Conv 0')).toBeInTheDocument();
    expect(screen.queryByText('Conv 1')).not.toBeInTheDocument();
  });

  it('resets to all conversations when All chip is clicked', () => {
    render(
      <FullReportModal result={makeResult(['hitl', 'tool_use'])} prevScore={null} onClose={() => {}} />
    );
    fireEvent.click(screen.getByText('Hitl'));
    fireEvent.click(screen.getByText('All'));
    expect(screen.getByText('Conv 0')).toBeInTheDocument();
    expect(screen.getByText('Conv 1')).toBeInTheDocument();
  });
});
