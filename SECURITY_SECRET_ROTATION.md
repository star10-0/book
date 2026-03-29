# SECURITY_SECRET_ROTATION.md

This runbook defines the minimum incident response for secret exposure in `book`.

## Scope
Rotate immediately if any of the following are exposed in logs, screenshots, chat, commits, backups, or third-party systems:
- `AUTH_SECRET`
- `DATABASE_URL` and/or database user password
- `SHAM_CASH_API_KEY`
- `SYRIATEL_CASH_API_KEY`
- `KV_REST_API_TOKEN`

## Storage rules
- Never commit real secrets to git.
- Local development secrets: `.env` only (uncommitted).
- Production secrets: host-level `.env.production` or platform-managed secret manager.
- Keep `.env.example` and `.env.production.example` as placeholders only.

## Standard rotation workflow (all secrets)
1. Identify exposure window and impacted environments (dev/staging/prod).
2. Generate a new secret/credential from the upstream provider.
3. Update secret storage (`.env.production` or host/platform secret manager).
4. Redeploy/restart application services so new values are loaded.
5. Revoke/disable old secret where supported.
6. Verify health-critical flows.
7. Record incident details (what rotated, when, by whom).

---

## AUTH_SECRET
Used to sign/authenticate application sessions.

### Rotate
1. Generate a new random secret (minimum 32 chars, recommended 64+).
2. Set both:
   - `AUTH_SECRET`
   - `NEXTAUTH_SECRET` (same value)
3. Redeploy app.
4. Invalidate old sessions as needed by policy (rotation will generally force re-authentication).

### Impact
- Existing sessions may become invalid.
- Users may need to sign in again.

---

## DATABASE_URL / database password
`DATABASE_URL` contains database credentials and connection details.

### Rotate
1. Create a new database password (or new DB user with least privilege).
2. Update database user credential in PostgreSQL.
3. Update `DATABASE_URL` in secret storage.
4. Restart/redeploy app and migration jobs that use this URL.
5. Revoke old password/user.

### Impact
- Brief connection interruptions during restart.
- Failed queries if app uses stale credentials.

---

## SHAM_CASH_API_KEY
Used for Sham Cash payment verification calls.

### Rotate
1. Generate/reissue key in Sham Cash merchant/admin console.
2. Update `SHAM_CASH_API_KEY` in secret storage.
3. Redeploy/restart app.
4. Revoke old key in Sham Cash.
5. Run a controlled payment verification test.

### Impact
- Payment verification can fail until all services use new key.

---

## SYRIATEL_CASH_API_KEY
Used for Syriatel Cash manual-transfer/find_tx verification calls.

### Rotate
1. Generate/reissue key in Syriatel Cash merchant/admin console.
2. Update `SYRIATEL_CASH_API_KEY` in secret storage.
3. Redeploy/restart app.
4. Revoke old key in Syriatel Cash.
5. Run a controlled Syriatel verification test.

### Impact
- Syriatel payment verification can fail until services are restarted.

---

## KV_REST_API_TOKEN
Used for Redis REST rate-limiting/auth guards.

### Rotate
1. Create a new REST token in your KV/Upstash provider.
2. Update `KV_REST_API_TOKEN` in secret storage.
3. Redeploy/restart app.
4. Revoke old token.
5. Verify auth/payment rate limiting paths and app health.

### Impact
- Rate limiting may temporarily fail open/closed depending on runtime behavior.

---

## Post-rotation verification checklist
- `GET /api/health` returns success.
- Authentication works (login/logout/session refresh).
- Checkout and payment verification flows work for enabled providers.
- No env validation errors at startup.
- Monitoring/alerts do not show secret-auth failures.
