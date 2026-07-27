export function friendlyMetricName(key: string): string {
  return key
    .replace(/^(custom|geval|deepeval|nlp|ragas):/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function friendlyConversationName(key: string): string {
  return key
    .replace(/_[a-f0-9]{12}$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function computeDelta(
  current: number,
  previous: number,
): { value: number; direction: 'up' | 'down' | 'same' } {
  const diff = Math.round((current - previous) * 100);
  if (diff > 0) return { value: diff, direction: 'up' };
  if (diff < 0) return { value: Math.abs(diff), direction: 'down' };
  return { value: 0, direction: 'same' };
}

export function friendlyTagName(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
