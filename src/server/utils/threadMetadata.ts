import { createHash } from 'node:crypto';

type ThreadMetadata = Record<string, unknown>;

let cachedScope: ThreadMetadata | undefined;
let cachedRawScope: string | undefined;

function rawThreadScopeMetadata(): string {
  return (process.env.THREAD_SCOPE_METADATA ?? '').trim();
}

export function getThreadScopeMetadata(): ThreadMetadata {
  if (cachedScope) {
    return cachedScope;
  }

  const raw = rawThreadScopeMetadata();
  cachedRawScope = raw;
  if (!raw) {
    cachedScope = {};
    return cachedScope;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedScope = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as ThreadMetadata)
      : {};
  } catch {
    cachedScope = {};
  }

  return cachedScope;
}

export function mergeThreadMetadata(
  userIdentity: string,
  clientMetadata?: ThreadMetadata,
): ThreadMetadata {
  return {
    user_identity: userIdentity,
    ...getThreadScopeMetadata(),
    ...(clientMetadata ?? {}),
  };
}

export function buildThreadSearchMetadata(
  userIdentity: string,
  clientMetadata?: ThreadMetadata,
): ThreadMetadata {
  return {
    user_identity: userIdentity,
    ...getThreadScopeMetadata(),
    ...(clientMetadata ?? {}),
  };
}

export function threadStorageKeySuffix(): string {
  const raw = cachedRawScope ?? rawThreadScopeMetadata();
  if (!raw) {
    return 'default';
  }
  return createHash('sha256').update(raw).digest('hex').slice(0, 12);
}
