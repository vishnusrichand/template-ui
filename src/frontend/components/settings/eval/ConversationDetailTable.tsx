import { useState } from 'react';
import type { Turn, ConvStats } from './eval-types';
import { friendlyMetricName, friendlyConversationName, friendlyTagName } from './eval-utils';

interface ConversationDetailTableProps {
  turns: Turn[];
  byConversation?: Record<string, ConvStats>;
  activeTag?: string;
  availableTags?: string[];
  onTagChange?: (tag: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  hitl: 'bg-purple-900/40 text-purple-300',
  tool_use: 'bg-emerald-900/40 text-emerald-300',
  retrieval: 'bg-amber-900/40 text-amber-300',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? 'bg-blue-900/40 text-blue-300';
}

export function ConversationDetailTable({
  turns,
  byConversation,
  activeTag,
  availableTags = [],
  onTagChange,
}: ConversationDetailTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped: Record<string, Turn[]> = {};
  for (const t of turns) {
    const conv = t.conversation_group_id ?? 'unknown';
    if (!grouped[conv]) grouped[conv] = [];
    grouped[conv].push(t);
  }

  const filteredEntries = Object.entries(grouped).filter(([, convTurns]) => {
    if (!activeTag || activeTag === 'all') return true;
    return convTurns.some((t) => t.tag === activeTag);
  });

  if (filteredEntries.length === 0 && availableTags.length === 0) return null;

  const showChips = availableTags.length > 0 && !!onTagChange;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Conversations
        </p>
        {showChips && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter by tag:</span>
            {['all', ...availableTags].map((tag) => (
              <button
                key={tag}
                onClick={() => onTagChange?.(tag)}
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  (activeTag ?? 'all') === tag
                    ? 'bg-primary border-primary text-white'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                {tag === 'all' ? 'All' : friendlyTagName(tag)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No conversations match this tag.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(([conv, convTurns]) => {
            const isOpen = expanded[conv] ?? true;
            const convStats = byConversation?.[conv];
            const pass = convStats?.pass ?? 0;
            const fail = convStats?.fail ?? 0;
            const total = pass + fail;
            const rate = total > 0 ? Math.round((pass / total) * 100) : null;
            const convTag = convTurns[0]?.tag;

            return (
              <div key={conv} className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [conv]: !isOpen }))}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/30 hover:bg-secondary/50 text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {friendlyConversationName(conv)}
                    {convTag && (
                      <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${tagColor(convTag)}`}>
                        {friendlyTagName(convTag)}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    {rate != null && (
                      <span className={`text-xs font-semibold ${
                        fail === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {rate}%
                      </span>
                    )}
                    {total > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {pass}/{total} checks
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '54%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-t border-border bg-secondary/10 text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Metric</th>
                        <th className="px-3 py-2 font-medium">Result</th>
                        <th className="px-3 py-2 font-medium tabular-nums">Score</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {convTurns.map((turn, i) => {
                        const isPass = (turn.result ?? '').toUpperCase() === 'PASS';
                        const isFail = (turn.result ?? '').toUpperCase() === 'FAIL';
                        return (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 font-medium text-foreground truncate">
                              {friendlyMetricName(turn.metric_identifier ?? '')}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-block rounded-full px-2 py-0.5 font-semibold ${
                                isPass
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : isFail
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                    : 'bg-secondary text-secondary-foreground'
                              }`}>
                                {turn.result ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2 tabular-nums text-foreground">
                              {turn.score != null ? Number(turn.score).toFixed(2) : '—'}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground break-words">
                              {turn.reason ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
