# SECURITY_SECRET_ROTATION

This runbook defines the minimum required rotation steps for high-impact secrets used by `book`.

## Scope

Secrets covered here:
- `AUTH_SECRET`
- `DATABASE_URL` / database password
- `SHAM_CASH_API_KEY`
- `SYRIATEL_CASH_API_KEY`
- `KV_REST_API_TOKEN`

Use this runbook when a secret is suspected exposed (logs, screenshots, chat paste, leaked `.env`, CI output, etc.).

## General incident workflow (applies to every secret)

1. **Contain**: remove exposed content from public places and limit access to affected systems.
2. **Rotate**: generate a new credential in the authoritative provider.
3. **Update runtime config**: update deployment secret storage (`.env.production` or hosting secret manager).
4. **Redeploy/restart**: ensure all running instances use the new secret.
5. **Invalidate old access**: revoke old tokens/passwords/keys.
6. **Audit**: inspect auth/payment/database logs during the exposure window.
7. **Document**: record time of exposure, rotation completion, and systems verified.

---

## 1) Rotate `AUTH_SECRET`

`AUTH_SECRET` signs authentication/session data. Exposure can allow forged or replayed sessions.

### Rotation steps
1. Generate a new high-entropy secret (minimum 32 characters).
2. Update `AUTH_SECRET` (and `NEXTAUTH_SECRET` if mirrored) in production secret storage.
3. Redeploy/restart the app.
4. Force re-authentication for users if your incident policy requires immediate session invalidation.

### Expected impact
- Existing sessions may become invalid; users may need to sign in again.

---

## 2) Rotate `DATABASE_URL` / database password

`DATABASE_URL` includes DB credentials and direct database access details.

### Rotation steps
1. Create a new database password/user credential in PostgreSQL (or managed DB console).
2. Update `DATABASE_URL` in production secret storage.
3. Restart/redeploy services that connect to PostgreSQL (app, workers, exporters using DB DSN).
4. Revoke/remove old DB credential.

### Expected impact
- Short-lived connection interruptions during restarts.
- Any service still using old credentials will fail until updated.

---

## 3) Rotate `SHAM_CASH_API_KEY`

`SHAM_CASH_API_KEY` authorizes live payment verification calls to Sham Cash.

### Rotation steps
1. Generate/reissue a new API key in the Sham Cash merchant/provider portal.
2. Update `SHAM_CASH_API_KEY` in production secret storage.
3. Redeploy/restart app instances.
4. Revoke old API key in Sham Cash.
5. Run a controlled payment verification test in production-safe conditions.

### Expected impact
- Live Sham Cash verification fails until all instances use the new key.

---

## 4) Rotate `SYRIATEL_CASH_API_KEY`

`SYRIATEL_CASH_API_KEY` authorizes Syriatel `find_tx` verification requests.

### Rotation steps
1. Generate/reissue a new API key in Syriatel Cash merchant/provider controls.
2. Update `SYRIATEL_CASH_API_KEY` in production secret storage.
3. Redeploy/restart app instances.
4. Revoke old API key.
5. Run a controlled Syriatel verification test (`manual-transfer` + `find_tx`).

### Expected impact
- Syriatel verification calls fail until all instances use the new key.

---

## 5) Rotate `KV_REST_API_TOKEN`

`KV_REST_API_TOKEN` secures Redis/Upstash REST operations used for auth/payment rate limiting.

### Rotation steps
1. Issue a new REST token from your KV provider.
2. Update `KV_REST_API_TOKEN` in production secret storage.
3. Redeploy/restart app instances.
4. Revoke old token.
5. Verify rate-limiting behavior on login/checkout paths.

### Expected impact
- Rate-limiting reads/writes may fail or degrade until all instances use the new token.

---

## Verification checklist after any rotation

- `/api/health` returns success.
- Authentication flow works (login/logout/session refresh).
- Checkout and payment verification paths work for enabled providers.
- No recurring authentication, DB auth, payment provider auth, or KV token errors in logs.

## Repository hygiene reminders

- Never commit real secrets to git.
- Keep `.env`, `.env.production`, and exported secret files out of version control.
- Use placeholder values in `.env.example` and `.env.production.example` only.
