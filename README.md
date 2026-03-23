# Book — Arabic-first PWA Bookstore

`Book` is an Arabic-first digital bookstore built with Next.js App Router. The current implementation supports catalog browsing, authenticated checkout for digital offers, payment-attempt lifecycle management through pluggable gateways, user library access, and a basic reader flow.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Cookie-based credentials authentication (signed HTTP-only session cookie)

## Architecture (Current)

### App layers

- **UI layer (`src/app`, `src/components`)**: Server Components by default, with client components for interactive forms and reader controls.
- **Domain/services (`src/lib`)**:
  - auth/session + password hashing
  - order creation helpers
  - payment orchestration + gateway abstraction
  - access grant issuance
  - reader helpers (locator/progress normalization)
- **Persistence**: Prisma models for users, catalog, offers, orders, payment attempts, access grants, and reading progress.
- **APIs (Route Handlers)**: focused handlers under `src/app/api/*` for orders, payment attempts, reading progress, and admin asset scaffolding.

### Payment abstraction

Payment flows are isolated behind `PaymentGateway` implementations (`src/lib/payments/gateways/*`). Route handlers call the shared `payment-service` so provider-specific logic stays out of endpoints.

## Feature status

## ✅ Complete (implemented)

- Arabic-first RTL layout and responsive storefront/account/admin shells.
- Credentials auth flow:
  - sign up / sign in / sign out
  - signed server sessions in HTTP-only cookies
  - protected `/account/*` and role-protected `/admin/*`
- Catalog browsing and book details with active digital offers.
- Authenticated order creation (`POST /api/orders`) for one digital offer at a time.
- Payment attempt lifecycle:
  - create payment attempt
  - submit proof/transaction reference
  - verify with gateway abstraction
- Access grant issuance on paid orders (purchase and rental logic).
- Library pages and reader access page tied to active grants.
- Reading progress persistence (`PATCH /api/reading-progress/[accessId]`).
- PWA baseline:
  - `manifest.webmanifest`
  - service worker registration in production
  - conservative static/shell caching strategy.

## 🧪 Mocked / scaffolded

- Admin dashboard metrics and many admin listing pages still use mock/static data.
- Cloud storage adapters (S3/R2) are prepared via interfaces/placeholders; local provider is active for development uploads.
- Reader rendering engine is placeholder-oriented for now (document source wiring exists; full EPUB/PDF experience is not production-grade yet).
- Payment provider integrations are abstracted and wired, but production readiness depends on real credentials, webhook/reconciliation strategy, and provider-specific hardening.

## 🚧 Remaining before production launch

1. **Harden payment reliability**
   - webhook/callback verification flow
   - idempotency keys + duplicate-submission protection
   - reconciliation jobs for delayed provider states.
2. **Complete admin data management**
   - replace mock admin datasets with database-backed queries/actions
   - add richer asset processing/auditing (checksums, preview generation, extraction metadata).
3. **Strengthen security posture**
   - add CSRF protection for state-changing cookie-auth endpoints
   - add rate limiting on auth/payment endpoints
   - add structured security logging and alerting.
4. **Reader productionization**
   - robust EPUB/PDF rendering controls
   - DRM/encryption strategy and signed file delivery.
5. **Operational readiness**
   - error monitoring, tracing, backups, migration rollout policy, and staging smoke tests.

## Environment setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env template:

   ```bash
   cp .env.example .env
   ```

3. Configure environment variables:

   - `DATABASE_URL` (PostgreSQL)
   - `AUTH_SECRET` (long random secret)
   - payment provider variables (if using Sham Cash / Syriatel Cash)
   - optional storage variables (for future S3/R2 providers; local is default)

4. Prisma + run:

   ```bash
   npm run prisma:migrate -- --name init
   npm run prisma:seed
   npm run dev
   ```


## Book asset storage variables (server only)

```bash
# Active provider: local | s3 | r2
BOOK_STORAGE_PROVIDER="local"
```

> Local mode stores uploads under `public/uploads/books/*` and serves them as normal static files.

## Payment provider variables (server only)

```bash
# Sham Cash
SHAM_CASH_API_BASE_URL="https://api.shamcash.example"
SHAM_CASH_API_KEY="replace-with-sham-cash-api-key"
SHAM_CASH_MERCHANT_ID="replace-with-sham-cash-merchant-id"
SHAM_CASH_CREATE_PAYMENT_PATH="/payments/create"
SHAM_CASH_VERIFY_PAYMENT_PATH="/payments/verify"
SHAM_CASH_TIMEOUT_MS="10000"

# Syriatel Cash
SYRIATEL_CASH_API_BASE_URL="https://api.syriatelcash.example"
SYRIATEL_CASH_API_KEY="replace-with-syriatel-cash-api-key"
SYRIATEL_CASH_MERCHANT_ID="replace-with-syriatel-cash-merchant-id"
SYRIATEL_CASH_CREATE_PAYMENT_PATH="/payments/create"
SYRIATEL_CASH_VERIFY_PAYMENT_PATH="/payments/verify"
SYRIATEL_CASH_TIMEOUT_MS="10000"
```

## PWA notes

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Registration component: `src/components/pwa/sw-register.tsx` (production only)
- Icon source: `public/icons/source-book-icon.svg`
- Generate icons:

  ```bash
  npm run icons:generate
  ```

## Quality checks

Run after meaningful changes:

```bash
npm run lint
npm run typecheck
npm run test
```

> `typecheck` now auto-runs `prisma generate` first to keep Prisma types synchronized.
