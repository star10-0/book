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

## Production Deployment Model (Current Recommendation)

Current production recommendation is **Docker/VPS with persistent local volumes** because:

- uploads are still written to local filesystem paths,
- protected reader files are streamed from private local storage,
- S3/R2 adapters are present but not fully ready for production migration,
- live payment providers are not implemented yet.

## Production Environment Variables

The app validates these settings at runtime and fails fast in production when required values are missing/invalid.

### Required in production

- `DATABASE_URL`
- `AUTH_SECRET` (minimum 32 chars)
- `NEXTAUTH_URL` (absolute HTTPS URL)
- `APP_BASE_URL` (absolute HTTPS URL)
- `BOOK_STORAGE_PROVIDER` (`local` | `s3` | `r2`)
- `PAYMENT_GATEWAY_MODE` (`mock` | `live`)

### Strongly recommended

- `NEXTAUTH_SECRET` (keep equal to `AUTH_SECRET` for consistency)
- `PORT` (optional; default `3000`)

### Payment safety guardrails

- Keep `PAYMENT_GATEWAY_MODE=mock` for first production rollout.
- Keep `ALLOW_MOCK_PAYMENT_VERIFICATION=false` on staging/production.
- Mock verification endpoint is only available when:
  - `NODE_ENV` is `development` or `test`,
  - `PAYMENT_GATEWAY_MODE=mock`,
  - `ALLOW_MOCK_PAYMENT_VERIFICATION=true`.

Use `.env.production.example` as the baseline template.

## Docker Files

- `Dockerfile`: production build + runtime image
- `docker-compose.yml`: app + PostgreSQL + persistent volumes
- `.dockerignore`: reduces build context

## Persistent Volume Requirements

You must persist these paths for Docker/VPS deployment:

- `/app/public/uploads` → maps to project `public/uploads`
- `/app/storage/private/uploads` → maps to project `storage/private/uploads`

If you use bundled PostgreSQL via compose, also persist:

- `/var/lib/postgresql/data`

## Prisma Production Flow

Production migration command:

```bash
npm run prisma:migrate:deploy
```

Do **not** run `prisma migrate dev` in production.

### Migration/startup order

1. Start PostgreSQL and wait for readiness.
2. Run `prisma migrate deploy`.
3. Start the Next.js server.

In Docker this project uses `npm run start:prod`, which runs migrate deploy before `next start`.

## Staging / Production (Docker Compose)

1. Copy env template and fill real values:

   ```bash
   cp .env.production.example .env.production
   ```

2. Build and start:

   ```bash
   docker compose --env-file .env.production up -d --build
   ```

3. Check logs:

   ```bash
   docker compose logs -f app
   ```

4. Open app at `http://<server-ip>:3000` (or behind your reverse proxy TLS domain).

## VPS Rollout Checklist

1. Provision VPS (Ubuntu/Debian), install Docker + Docker Compose plugin.
2. Clone repo on VPS.
3. Create `.env.production` from `.env.production.example`.
4. Ensure domain + TLS reverse proxy are configured (Nginx/Caddy/Traefik).
5. Run `docker compose up -d --build`.
6. Smoke-test:
   - sign in
   - create order
   - payment attempt lifecycle in mock mode
   - reader access for purchased/rented content
   - protected asset URLs return `403` for unauthorized users.

## Backup, Restore, and Rollback Basics

### Backups

- PostgreSQL: daily backup + retention policy.
- File volumes: snapshot both uploads volumes on same schedule:
  - `public/uploads`
  - `storage/private/uploads`
- Always take an on-demand DB + file snapshot before deployment.

### Restore expectations

- Restore DB backup and both file volumes from the same backup window.
- Run integrity smoke tests (login, library, reader streaming, recent orders).

### Rollback basics

- Keep previous app image tag available.
- Roll back app image first if release is bad.
- If migration changed schema incompatibly, restore database snapshot and aligned file volumes.

## Current Limitations Before True Public Launch

- Live Sham Cash and Syriatel Cash integrations are placeholders.
- `PAYMENT_GATEWAY_MODE=live` currently throws configuration errors intentionally.
- Distributed/shared rate limiting (Redis/KV) is not yet implemented.
- Object storage migration plan (S3/R2) should be completed before horizontal scaling.

## Validation Commands

Run after meaningful changes:

```bash
npm run lint
npm run typecheck
npm run test
```

## Promo Code / Discount System

The platform now includes a server-validated promo system for checkout with:

- `FREE`, `PERCENT`, and `FIXED` promo types.
- Redemption tracking per user/order/payment.
- Institution and creator restrictions.
- Scope restrictions (`PURCHASE`, `RENTAL`, `PUBLISHING_FEE`, `ANY`).
- Free-order internal completion flow (no external gateway call).

### Management

- Admin management: `/admin/promo-codes`
- Creator management: `/studio/promo-codes`

### Checkout usage

Users enter promo codes on the checkout order payment panel (`/checkout/[orderId]`). Totals are always recalculated on the server before payment attempt creation.
