# Book — Arabic-first PWA Bookstore

`Book` is an Arabic-first digital bookstore built with Next.js App Router. It currently supports catalog browsing, authenticated checkout for digital offers, payment-attempt lifecycle management behind pluggable gateways, user library access, and a baseline reader flow.

## Technology Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Cookie-based credentials authentication (signed HTTP-only session cookie)

## Quick Start (Local Development)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local env file:

   ```bash
   cp .env.example .env
   ```

3. Run database setup and development server:

   ```bash
   npm run prisma:migrate -- --name init
   npm run prisma:seed
   npm run dev
   ```

> Seed currently creates an admin account (`admin@book.local` / `AdminPass123!`).

---

## Sprint 3: Production Launch Readiness (Docker/VPS)

This repository includes a production-first Docker/VPS deployment flow with explicit migration ordering, startup env validation, healthchecks, and operational runbooks.

### Deployment artifacts

- `Dockerfile`: multi-stage production image.
- `docker-compose.prod.yml`: production orchestration for `db`, one-off `migrate`, and `app`.
- `docker-compose.app.yml`: app + one-off `migrate` (for managed PostgreSQL).
- `docker-compose.monitoring.yml`: production monitoring stack (`prometheus`, `grafana`, `loki`, `promtail`, `uptime-kuma`, exporters).
- `.env.production.example`: complete production variable template including mount and compose overrides.
- `monitoring/`: observability configs, dashboards, alert rules, and operator runbooks.

### Build/start contract

- Build image contents: `npm run build`
- Run app server only: `npm run start`
- Run migrations only: `npm run prisma:migrate:deploy`

> Production startup order is migration-first, app-second. Do **not** use `prisma migrate dev` in production.

---

## Production Environment Variables (exact)

Startup validation runs via `src/instrumentation.ts` and `src/lib/env.ts`.

### Required

- `NODE_ENV=production`
- `DATABASE_URL`
- `AUTH_SECRET` (minimum 32 chars)
- `NEXTAUTH_URL` (absolute URL)
- `APP_BASE_URL` (absolute URL)
- `BOOK_STORAGE_PROVIDER` (`local` | `s3` | `r2`)
- `PAYMENT_GATEWAY_MODE` (`mock` | `live`)
- `PAYMENT_LIVE_PROVIDERS` (comma-separated: `SHAM_CASH`, `SYRIATEL_CASH`) when live mode is used. If omitted, live mode defaults to `SHAM_CASH`.
- `ALLOW_MOCK_PAYMENTS=false` in production
- `ALLOW_MOCK_PAYMENT_VERIFICATION=false` in production
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### Required when `BOOK_STORAGE_PROVIDER=s3|r2`

- `BOOK_STORAGE_S3_ACCESS_KEY_ID`
- `BOOK_STORAGE_S3_SECRET_ACCESS_KEY`
- `BOOK_STORAGE_S3_PUBLIC_BUCKET`

### Required when `PAYMENT_GATEWAY_MODE=live`

Select at least one provider via `PAYMENT_LIVE_PROVIDERS` and fully configure only the selected providers.

**Sham Cash (if enabled/selected)**
- `SHAM_CASH_API_BASE_URL`
- `SHAM_CASH_API_KEY`
- `SHAM_CASH_DESTINATION_ACCOUNT`

**Syriatel Cash (if enabled/selected)**
- `SYRIATEL_CASH_API_BASE_URL`
- `SYRIATEL_CASH_API_KEY`
- `SYRIATEL_CASH_DESTINATION_ACCOUNT`

Optional override (defaults to `/find_tx`):
- `SYRIATEL_CASH_FIND_TX_PATH`


Use `.env.production.example` as the source of truth.

---

## Verify Deployed Branch/Commit Before Payment Debugging

To quickly detect deployment drift versus local/main code:

1. Check deployed metadata:

   ```bash
   curl -fsS https://<your-domain>/api/version
   ```

2. Compare to your local branch:

   ```bash
   git rev-parse HEAD
   git show -s --format='%H %D' HEAD
   ```

3. If you track `main` locally/remotely, compare against it directly:

   ```bash
   git fetch origin
   git rev-parse origin/main
   git log --oneline --decorate --max-count=20 origin/main..HEAD
   git log --oneline --decorate --max-count=20 HEAD..origin/main
   ```

`/api/version` reports the commit SHA/branch when your platform exposes them (for example Vercel, Railway, Render), and also reports payment mode/provider selection to speed up checkout troubleshooting. It also reports `syriatelIntegration=manual_transfer_find_tx_v1` to confirm the new Syriatel contract is active.

---

## Exact Production Deployment Steps (Docker/VPS)

1. Install Docker Engine + Docker Compose plugin.
2. Clone repository into a stable path (example: `/opt/book`).
3. Create persistent directories:

   ```bash
   mkdir -p /opt/book/volumes/postgres-data
   mkdir -p /opt/book/volumes/public-uploads
   mkdir -p /opt/book/volumes/private-uploads
   ```

4. Create env file:

   ```bash
   cp /opt/book/.env.production.example /opt/book/.env.production
   ```

5. Fill real URLs, secrets, storage credentials, and payment provider credentials.
6. Start production stack:

   ```bash
   cd /opt/book
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

   Drift-recovery redeploy (force fresh code/image, skip stale cache):

   ```bash
   cd /opt/book
   git fetch origin
   git checkout main
   git reset --hard origin/main
   docker compose -f docker-compose.prod.yml --env-file .env.production down
   docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache --pull
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

7. Verify migration succeeded before app traffic:

   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs --tail=200 migrate app
   ```

8. Verify runtime health endpoint:

   ```bash
   curl -fsS http://127.0.0.1:${APP_PORT:-3000}/api/health
   ```

9. Put app behind TLS reverse proxy (Nginx/Caddy/Traefik), and ensure proxy forwards `x-forwarded-host` and `x-forwarded-proto`.

### Managed PostgreSQL deployment

```bash
docker compose -f docker-compose.app.yml --env-file .env.production up -d --build
```

This runs `migrate` first, then starts `app`.

### Production monitoring deployment (Compose / VPS)

Start app + monitoring together:

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.monitoring.yml \
  --env-file .env.production \
  up -d --build
```

For managed PostgreSQL:

```bash
docker compose \
  -f docker-compose.app.yml \
  -f docker-compose.monitoring.yml \
  --env-file .env.production \
  up -d --build
```

Key UIs:
- Grafana: `http://<host>:3300`
- Uptime Kuma: `http://<host>:3301`

Full setup details, alerts, and runbooks are documented in `monitoring/README.md` and `monitoring/runbooks/OPERATIONS.md`.

### Redeploy to latest Syriatel implementation (manual-transfer + `find_tx`)

Use this when production appears to run older Syriatel code or reports missing legacy Syriatel env keys.

1. Update deployment source to latest `main` commit:

   ```bash
   cd /opt/book
   git fetch origin --prune
   git checkout main
   git reset --hard origin/main
   git rev-parse --short HEAD
   ```

2. Update `.env.production` for current Syriatel flow:
   - Keep only:
     - `SYRIATEL_CASH_API_BASE_URL`
     - `SYRIATEL_CASH_API_KEY`
     - `SYRIATEL_CASH_DESTINATION_ACCOUNT`
     - optional `SYRIATEL_CASH_FIND_TX_PATH`
   - Remove deprecated keys if present:
     - `SYRIATEL_CASH_MERCHANT_ID`
     - `SYRIATEL_CASH_CREATE_PAYMENT_PATH`
     - `SYRIATEL_CASH_VERIFY_PAYMENT_PATH`

3. Rebuild and redeploy app image:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache app
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d migrate app
   ```

4. Verify running container is on the expected commit and healthy:

   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs --tail=200 app
   curl -fsS http://127.0.0.1:${APP_PORT:-3000}/api/health
   ```

5. Smoke-check checkout Syriatel flow:
   - Open checkout page.
   - Select `Syriatel Cash`.
   - Confirm instructions mention manual transfer + entering transaction number + verify via `find_tx`.
   - Create payment and confirm no `PAYMENT_PROVIDER_ENV_MISSING` error for legacy Syriatel keys.

---

## Exact Staging Checklist

1. Copy production template and set staging domain values for `APP_BASE_URL` and `NEXTAUTH_URL`.
2. Keep `PAYMENT_GATEWAY_MODE=mock` in staging unless full live gateway verification is intentionally being tested.
3. Keep `ALLOW_MOCK_PAYMENTS=false` and `ALLOW_MOCK_PAYMENT_VERIFICATION=false` by default; enable temporarily only for controlled QA windows.
4. Deploy with `docker-compose.prod.yml` using staging env.
5. Confirm `migrate` exited successfully and `app` is healthy.
6. Validate smoke flows:
   - sign up/sign in
   - checkout create order
   - payment attempt creation and status verification path
   - library access
   - reader open flow
7. Confirm structured logs include JSON lines and request IDs.
8. Confirm backups execute and can be restored in a staging restore drill.

---

## Persistence, Storage, and Repo Hygiene

### Persistent paths

- Postgres data: `/var/lib/postgresql/data` (container)
- Public uploads: `/app/public/uploads` (container)
- Private uploads: `/app/storage/private/uploads` (container)

### Object storage expectations

- Prefer `BOOK_STORAGE_PROVIDER=s3|r2` for public launch durability.
- Local filesystem mode is supported, but requires stable host disks and backups of both upload paths.

### Repo hygiene rule

- Uploaded user/content files must never be committed to Git.
- `public/uploads`, `storage/private/uploads`, and host `volumes/` are intentionally gitignored.

---

## Operations Readiness

### Structured logging

- Use JSON logs (already implemented in `src/lib/observability/logger.ts`).
- Preserve `requestId` in route logs for traceability.
- Collect stdout/stderr from Docker (`docker compose logs`) into your log sink when available.

### Minimal observability

- Health endpoint: `GET /api/health`
- Container healthcheck is wired to `/api/health`.
- Error visibility: inspect app logs for `"level":"error"` records.
- Alerts (minimum):
  - container unhealthy/restart loop
  - migration job failure
  - high rate of 5xx responses via reverse proxy metrics

---

## Backups, Restore, and Rollback

### Backup basics

- PostgreSQL logical backup example:

  ```bash
  docker compose -f docker-compose.prod.yml exec -T db \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backup_$(date +%F_%H%M%S).sql
  ```

- Upload backup example:

  ```bash
  tar -czf uploads_$(date +%F_%H%M%S).tar.gz volumes/public-uploads volumes/private-uploads
  ```

- Run an on-demand backup before every production rollout.

### Restore basics

1. Stop app traffic.
2. Restore DB dump:

   ```bash
   cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
   ```

3. Restore uploads tarball to `volumes/public-uploads` and `volumes/private-uploads`.
4. Restart services and run smoke checks.

### Rollback procedure

1. Keep previous known-good image tag available.
2. If app regression only, redeploy previous app image tag.
3. If schema/data mismatch, restore DB + uploads from pre-release backup, then redeploy previous image.
4. Re-run health + smoke checks before reopening traffic.

---

## Current Launch Blockers / Remaining Items

Before broad public launch:

1. Centralized logs/metrics/alerting stack is still environment-specific (outside this repo).
2. Backup restore drills should be scheduled and evidenced operationally.

---

## Validation Commands

Run after meaningful changes:

```bash
npm run lint
npm run typecheck
npm run test
```
