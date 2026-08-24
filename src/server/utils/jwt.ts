/** Base64url-decode a JWT payload segment. Returns {} on any error. */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const segment = token.split(".")[1];
    if (!segment) return {};
    const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64url").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Resolve the user's ROVER role from a decoded JWT payload.
 *
 * Reads ACCESS_ORG_NAME env var and looks for {org}_developer / {org}_viewer
 * in realm_access.roles. When ACCESS_ORG_NAME is unset → 'developer' (open).
 * Only called when AUTH_ENABLED=true.
 */
export function resolveRole(
  payload: Record<string, unknown>,
): "developer" | "viewer" | "denied" {
  const org = process.env.DEPLOYED_AGENT_ORG?.trim();
  if (!org) return "developer"; // no org configured — open access

  const realmAccess = payload["realm_access"] as Record<string, unknown> | undefined;
  const roles = (realmAccess?.["roles"] as string[] | undefined) ?? [];

  if (roles.includes(`${org}_developer`)) return "developer";
  if (roles.includes(`${org}_viewer`)) return "viewer";
  return "denied";
}
