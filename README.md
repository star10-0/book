# Book — Arabic-first PWA Bookstore

`Book` is an Arabic-first digital bookstore built with Next.js App Router. It currently supports catalog browsing, authenticated checkout for digital offers, payment-attempt lifecycle management behind pluggable gateways, user library access, and a baseline reader flow.

## Technology Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Cookie-based credentials authentication (signed HTTP-only session cookie)

## Architecture Summary

- **UI layer (`src/app`, `src/components`)**: server components by default, client components only for interactivity.
- **Domain/services (`src/lib`)**:
  - authentication/session handling
  - order and payment orchestration
  - access grants and reader helpers
  - storage abstractions and validation
- **Persistence**: Prisma schema for users, catalog, offers, orders, payment attempts, access grants, and reading progress.
- **APIs (`src/app/api/*`)**: focused route handlers for checkout, payments, and reading progress.

## Production Readiness — Sprint 8 updates

This sprint improved production safety without broad UI redesign:

- Stronger runtime environment validation with explicit warnings/errors.
- Structured logging utility for safer operational diagnostics.
- Baseline abuse controls via in-memory rate limiting on sensitive auth/payment/order paths.
- Better deployment documentation and explicit required environment variables.
- Safer SEO host handling via `APP_BASE_URL` for metadata, sitemap, robots, and JSON-LD.
- Minor PWA cache consistency update for static assets (manifest/icons).

---

## Quick Start

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

> Seed currently creates an admin account (`admin@book.local` / `AdminPass123!`). Create reader accounts through sign-up.

---

## Required environment variables

These are required for reliable non-test runtime:

- `DATABASE_URL`
- `AUTH_SECRET` (at least 32 chars in production)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_BASE_URL` (canonical HTTPS origin for production)

## Environment variables by concern

### Runtime + Auth

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.example"
APP_BASE_URL="https://your-domain.example"
```

### Storage

```bash
# local | s3 | r2
BOOK_STORAGE_PROVIDER="local"
```

> `local` storage is acceptable in development, but not ideal for production on ephemeral hosts.

### Payments

```bash
# mock | live
PAYMENT_GATEWAY_MODE="mock"
ALLOW_MOCK_PAYMENT_VERIFICATION="false"

# Sham Cash
SHAM_CASH_API_BASE_URL="..."
SHAM_CASH_API_KEY="..."
SHAM_CASH_MERCHANT_ID="..."
SHAM_CASH_CREATE_PAYMENT_PATH="/payments/create"
SHAM_CASH_VERIFY_PAYMENT_PATH="/payments/verify"
SHAM_CASH_TIMEOUT_MS="10000"

# Syriatel Cash
SYRIATEL_CASH_API_BASE_URL="..."
SYRIATEL_CASH_API_KEY="..."
SYRIATEL_CASH_MERCHANT_ID="..."
SYRIATEL_CASH_CREATE_PAYMENT_PATH="/payments/create"
SYRIATEL_CASH_VERIFY_PAYMENT_PATH="/payments/verify"
SYRIATEL_CASH_TIMEOUT_MS="10000"
```

---

## Deployment notes

- Use Node.js 20+ and a managed PostgreSQL service.
- Run `npm run build` in CI and deploy only on successful lint/typecheck/test.
- Ensure Prisma migrations are applied before switching live traffic.
- Use HTTPS in production and set `APP_BASE_URL` to the final canonical domain.
- Keep `PAYMENT_GATEWAY_MODE=mock` outside live rollout until real provider integrations and reconciliation jobs are complete.

### Suggested rollout flow

1. Deploy to staging.
2. Run smoke tests for auth, checkout, payment attempt flow, and reader access.
3. Run DB backup snapshot.
4. Deploy production.
5. Verify monitoring/alerts and payment queue behavior.

---

## Storage assumptions and caveats

Current local provider writes:

- public assets: `public/uploads/*`
- private assets: `storage/private/uploads/*`

Production caveat:

- Container/dyno filesystem may be ephemeral.
- Use object storage (`s3`/`r2`) before scaling production traffic.
- Keep a migration plan for existing local files before switching providers.

---

## Monitoring, logging, and backup guidance

### Logging

- Route-level failures in sensitive endpoints are now logged using structured JSON.
- Avoid logging secrets, payment tokens, API keys, or raw credentials.
- Forward logs to your platform aggregator (e.g., Datadog, ELK, Cloud logging).

### Monitoring (minimum)

- Uptime checks for `/`, `/books`, and one authenticated API probe.
- Error-rate alerts on `/api/orders`, `/api/payments/create`, `/api/payments/submit-proof`, `/api/payments/verify-mock`.
- Latency SLO tracking for checkout and payment endpoints.

### Backups

- Daily PostgreSQL backups with retention policy.
- Before each production migration: on-demand snapshot.
- Quarterly restore drill to a staging environment.
- Document RPO/RTO targets and validate them with drills.

---

## Rate limiting and abuse prevention status

Implemented baseline controls:

- Auth server actions: sign-in/sign-up in-memory limits.
- Sensitive APIs: order creation + payment-related endpoints have per-IP in-memory limits.

Important limitation:

- In-memory rate limiting is per-process and resets on restart.
- For production scale, move to shared storage backed limits (Redis/KV) and add WAF/bot rules.

---

## SEO & PWA notes

- Canonical host now comes from `APP_BASE_URL`.
- `robots.txt` and `sitemap.xml` use the same canonical base URL.
- Book detail metadata now includes canonical + OpenGraph URL.
- Service worker static caching now includes manifest and icon asset extensions for consistency.

---

## Validation commands

Run these after meaningful changes:

```bash
npm run lint
npm run typecheck
npm run test
```

> `typecheck` runs `prisma generate` first.
