# Security Review

> **Note:** All three findings are pre-existing in the codebase and were not introduced by this branch. They are documented here for tracking and remediation.

---

## Vuln 1: Known-Default Session-Signing Secret

**File:** `src/server/server.ts:127`
**Severity:** High
**Category:** `auth_bypass`

### Description

When `COOKIE_SIGN` is not set, session cookies are signed with `"a secret with minimum length of 32 characters"` — the verbatim placeholder string from the `@fastify/session` README. This secret is publicly known, allowing any attacker familiar with the library docs to forge valid HMAC-signed session cookies for any user identity.

### Exploit Scenario

`COOKIE_SIGN` is absent in a dev, staging, or misconfigured production deployment. An attacker uses the known default secret to forge a `@fastify/session` cookie with `session.user.email = admin@company.com`, bypasses all SSO checks, and gains admin-level access to the application.

### Recommendation

Add a startup guard that crashes the process if `COOKIE_SIGN` is unset or too short:

```typescript
if (!process.env.COOKIE_SIGN || process.env.COOKIE_SIGN.length < 32) {
  throw new Error('COOKIE_SIGN env var is required and must be at least 32 characters');
}
```

---

## Vuln 2: Unauthenticated Header-Injection Identity Spoofing

**File:** `src/server/plugins/auth-check.plugin.ts:59`
**Severity:** High
**Category:** `auth_bypass`

### Description

When `AUTH_ENABLED=false` (gateway passthrough mode), the plugin reads `x-auth-user-email`, `x-auth-user-name`, `x-auth-user-sub`, and `x-auth-access-token` directly from HTTP request headers with no IP allowlist, HMAC validation, or gateway-origin check. `email_verified` is hardcoded to `true`. Additionally, when no email header is present, a hardcoded fallback identity (`johnwick@redhat.com`) is set — granting every unauthenticated request a fully populated session.

This mode is designed for gateway-protected deployments where an upstream proxy (Nginx, Envoy, OAuth2 Proxy) strips client-supplied headers and re-injects verified identity. The vulnerability is that this assumption is architectural and not enforced in code.

### Exploit Scenario

The server is deployed with `AUTH_ENABLED=false` behind a gateway that does not strip client-supplied `x-auth-*` headers. An attacker sends:

```
GET /api/proxy/agent/threads/search
x-auth-user-email: admin@company.com
x-auth-user-name: Admin User
```

The plugin writes those values into `request.session.user` with `email_verified: true`, and the request proceeds as a fully authenticated admin session.

### Recommendation

- Enforce gateway header stripping at the network level (verify the gateway config strips `x-auth-*` from client requests before forwarding).
- Add an IP allowlist or shared-secret/HMAC validation on injected headers so only a trusted gateway can set them.
- At minimum, log a prominent warning at startup when `AUTH_ENABLED=false` reminding operators that the gateway must strip these headers.

---

## Vuln 3: No Authentication on `/api/v1` Routes

**File:** `src/server/router/api.router.ts:65`
**Severity:** High
**Category:** `auth_bypass`

### Description

`POST /api/v1/stream` and `GET /api/v1/history/:threadId` are registered with no `preHandler`, `onRequest` hook, or auth plugin guard. The `resolveAccessToken()` call in the controller is opportunistic — if no token is present the request is proxied to the agent backend without any `Authorization` header and **no 401 is returned**. The `authPlugin` registered in `server.ts` provides OAuth2 utility routes only and adds no global auth hook.

### Exploit Scenario

An unauthenticated attacker posts to the streaming endpoint:

```
POST /api/v1/stream
Content-Type: application/json

{"message": "...", "thread_id": "x", "session_id": "y", "user_id": "z"}
```

The BFF proxies the request to the internal agent service and streams back AI responses. All thread history is similarly readable via `GET /api/v1/history/:threadId` without credentials.

### Recommendation

Register an auth guard on the `apiRoutes` scope, mirroring the pattern already used in `proxy.router.ts`. Return `401` when no valid session or token is present:

```typescript
// In api.router.ts or server.ts where apiRoutes is registered
fastify.register(apiRoutes, { prefix: '/api/v1' });

// Inside apiRoutes, add:
fastify.addHook('onRequest', authCheckPlugin);
```

Additionally, make `resolveAccessToken()` return a `401` response instead of silently continuing when no token is found.
