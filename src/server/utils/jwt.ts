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
 * Reads DEVELOPER_GROUP and USER_GROUP env vars.
 * Both empty → 'developer' (open).
 * Only DEVELOPER_GROUP set → members are developer; others denied.
 * Only USER_GROUP set → members are viewer (no eval / developer page); others denied.
 * Both set: DEVELOPER_GROUP → developer, USER_GROUP → viewer, neither → denied.
 * Called from OIDC login and from the gateway-token path (AUTH_ENABLED=false).
 */
export function resolveRole(
  payload: Record<string, unknown>,
): "developer" | "viewer" | "denied" {
  const devGroup = process.env.DEVELOPER_GROUP?.trim();
  const userGroup = process.env.USER_GROUP?.trim();

  if (!devGroup && !userGroup) return "developer";

  const realmAccess = payload["realm_access"] as Record<string, unknown> | undefined;
  const roles = ((realmAccess?.["roles"] as string[] | undefined) ?? []).map(r => r.toLowerCase());

  if (devGroup && roles.includes(devGroup.toLowerCase())) return "developer";
  if (userGroup && roles.includes(userGroup.toLowerCase())) return "viewer";
  return "denied";
}
