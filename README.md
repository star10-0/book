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

## Sprint 5: Deployment and Production Readiness

This repository now includes an explicit production deployment flow for Docker/VPS with persistent local storage.

### Deployment artifacts

- `Dockerfile`: multi-stage production image.
- `docker-compose.prod.yml`: production orchestration for `db`, one-off `migrate`, and `app`.
- `docker-compose.app.yml`: app-only deployment (use with managed PostgreSQL).
- `.env.production.example`: complete production variable template including mount and compose overrides.

### Production build/start contract

- Build: `npm run build`
- Runtime start: `npm run start`
- Production-safe start (migration + app): `npm run start:prod`
- Migration only: `npm run prisma:migrate:deploy`

`docker-compose.prod.yml` runs migration in a dedicated one-off `migrate` service before starting `app`.

---

## Production Environment Variables

The app validates environment variables at server startup (`src/instrumentation.ts`) and throws in production for missing/invalid required values.

### Required in production

- `DATABASE_URL`
- `AUTH_SECRET` (minimum 32 chars)
- `NEXTAUTH_URL` (absolute URL)
- `APP_BASE_URL` (absolute URL)
- `BOOK_STORAGE_PROVIDER` (`local` | `s3` | `r2`)
- `BOOK_STORAGE_S3_ACCESS_KEY_ID`, `BOOK_STORAGE_S3_SECRET_ACCESS_KEY`, `BOOK_STORAGE_S3_PUBLIC_BUCKET` (when `BOOK_STORAGE_PROVIDER=s3|r2`)
- `PAYMENT_GATEWAY_MODE` (`mock` | `live`)
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

### Conditionally required

When `PAYMENT_GATEWAY_MODE=live`, also set:

- `SHAM_CASH_API_BASE_URL`
- `SHAM_CASH_API_KEY`
- `SHAM_CASH_MERCHANT_ID`
- `SHAM_CASH_DESTINATION_ACCOUNT`
- `SHAM_CASH_CREATE_PAYMENT_PATH`
- `SHAM_CASH_VERIFY_PAYMENT_PATH`
- `SHAM_CASH_WEBHOOK_SECRET`

Use `.env.production.example` as the source of truth for production setup.

---

## Prisma Production Flow (No `migrate dev`)

Production uses **deploy-only** migrations:

```bash
npm run prisma:migrate:deploy
```

Do **not** run `prisma migrate dev` in production.

### Required migration/start order

1. Start PostgreSQL.
2. Wait for DB health/readiness.
3. Run `prisma migrate deploy`.
4. Start Next.js app.

In Docker production (`docker-compose.prod.yml`), this order is enforced via service dependencies:

- `db` must be healthy.
- `migrate` must exit successfully.
- then `app` starts.

---

## Persistent Storage Requirements (Docker/VPS)

Persist these paths to avoid data loss:

- `public/uploads` (container path: `/app/public/uploads`)
- `storage/private/uploads` (container path: `/app/storage/private/uploads`)

When using bundled Postgres, also persist:

- `/var/lib/postgresql/data`

`docker-compose.prod.yml` defaults to host bind mounts under `./volumes/*` and can be overridden with:

- `PUBLIC_UPLOADS_PATH`
- `PRIVATE_UPLOADS_PATH`
- `POSTGRES_DATA_PATH`

This keeps **local filesystem storage** viable for single-VPS production rollouts.

## Object Storage (S3 / compatible)

The app now supports real object storage for uploads and protected reader files.

- `BOOK_STORAGE_PROVIDER=s3|r2` enables S3-compatible mode.
- `BOOK_STORAGE_S3_ENDPOINT` is optional (use it for R2/MinIO/other compatible providers).
- Cover images (`COVER_IMAGE`) are stored in the public bucket and can expose `BOOK_STORAGE_PUBLIC_BASE_URL`.
- Reader assets (`PDF`/`EPUB`) are stored in private storage and delivered through short-lived signed URLs after access checks.
- Local storage remains fully supported via `BOOK_STORAGE_PROVIDER=local`.


---

## Staging Deployment (Docker)

1. Prepare env file:

   ```bash
   cp .env.production.example .env.production
   ```

2. Fill staging domain and secrets.
3. Build + launch:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

4. Check migration and app logs:

   ```bash
   docker compose -f docker-compose.prod.yml logs -f migrate app
   ```

5. Smoke test core flows (auth, checkout, library, reader).

## Production Deployment on VPS (Exact Steps)

1. Install Docker Engine + Docker Compose plugin on the VPS.
2. Clone repo into a stable path, e.g. `/opt/book`.
3. Create persistent directories:

   ```bash
   mkdir -p /opt/book/volumes/postgres-data
   mkdir -p /opt/book/volumes/public-uploads
   mkdir -p /opt/book/volumes/private-uploads
   ```

4. Prepare environment:

   ```bash
   cp /opt/book/.env.production.example /opt/book/.env.production
   ```

5. Edit `.env.production` with real values (URLs, secrets, DB credentials, KV credentials).
6. Start services:

   ```bash
   cd /opt/book
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

7. Verify rollout:

   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs --tail=200 migrate app
   ```

8. Put app behind TLS reverse proxy (Nginx/Caddy/Traefik) and point domain to `APP_BASE_URL`/`NEXTAUTH_URL`.

### App-only deployment (managed PostgreSQL)

```bash
docker compose -f docker-compose.app.yml --env-file .env.production up -d --build
```

Use external `DATABASE_URL` in `.env.production`.

---

## Operations Basics

### Backups

- PostgreSQL: scheduled logical backup or volume snapshots.
- Uploads: snapshot both mounted paths together:
  - `public/uploads`
  - `storage/private/uploads`
- Take an on-demand backup before every production release.

### Restore (minimum)

1. Stop app traffic.
2. Restore PostgreSQL from selected backup point.
3. Restore both upload mounts from the same point-in-time window.
4. Restart services and run smoke tests.

### Rollback expectations

- Keep previous Docker image/tag available.
- Application-only regressions: rollback app image.
- Schema-breaking releases: restore DB + upload volumes to pre-release snapshot, then redeploy previous image.

---

## Current Launch Blockers / Risks

Before true large-scale public launch:

1. Object storage is available (`BOOK_STORAGE_PROVIDER=s3|r2`), but production must still enforce secure key rotation and bucket-level policies.
2. Syriatel Cash live integration is still placeholder.
3. Full production observability stack (centralized logs/metrics/alerts) is not yet codified in this repo.
4. Disaster recovery is documented, but automated backup verification is still an operational responsibility.

---

## Validation Commands

Run after meaningful changes:

```bash
npm run lint
npm run typecheck
npm run test
```
