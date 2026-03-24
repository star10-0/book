# Book — Arabic-first PWA Bookstore

`Book` is an Arabic-first digital bookstore built with Next.js App Router. The current implementation supports catalog browsing, authenticated checkout for digital offers, payment-attempt lifecycle management through pluggable gateways, user library access, and a baseline reader flow.

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

## Launch-readiness status

### ✅ Complete (implemented)

- Creator-first publishing flow:
  - any authenticated user can activate writer mode from profile (`ابدأ ككاتب`)
  - dedicated creator dashboard under `/studio` for books/orders/payments/profile
  - book ownership enforced through `Book.creatorId` so creators manage only their own books
  - public creator pages available at `/creators/[slug]`
- Arabic-first RTL layout with improved keyboard navigation and mobile-friendly navigation controls.
- Credentials auth flow:
  - sign up / sign in / sign out
  - signed server sessions in HTTP-only cookies
  - protected `/account/*`, creator-protected `/studio/*`, and role-protected `/admin/*`
- Catalog browsing and book details with active digital offers.
- Authenticated offer-to-checkout flow: review selected offer on `/checkout`, create order via `POST /api/orders`, then continue on `/checkout/[orderId]` and `/orders/[orderId]/summary`.
- Payment attempt lifecycle:
  - create payment attempt
  - submit proof/transaction reference
  - verify with gateway abstraction
- Access grant issuance on paid orders (purchase and rental logic).
- Library pages and reader access page tied to active grants.
- Reading progress persistence (`PATCH /api/reading-progress/[accessId]`).
- PWA improvements:
  - installable manifest with app shortcuts and maskable icons
  - production-only service worker registration
  - offline fallback page (`/offline`) with navigation fallback in the service worker
- Metadata/SEO improvements:
  - enriched root metadata + canonical and robots directives
  - generated `robots.txt` and `sitemap.xml`
  - basic JSON-LD website schema.
- Practical security hardening:
  - stricter HTTP security headers in `next.config.ts` (CSP, HSTS, COOP/CORP)
  - same-origin guard for state-changing payment/order endpoints
  - no-store cache policy for sensitive API JSON responses.

### 🧪 Mocked / scaffolded

- Admin dashboard metrics and many admin listing pages still use mock/static data.
- Cloud storage adapters (S3/R2) are prepared via interfaces/placeholders; local provider is active for development uploads.
- Reader rendering engine is placeholder-oriented for now (document source wiring exists; full EPUB/PDF experience is not production-grade yet).
- Payment provider integrations are abstracted behind gateways, and the current implementation intentionally runs in mock mode to validate end-to-end checkout/payment UX before real provider APIs are integrated.

### 🚧 Remaining before production launch

1. **Payment reliability + compliance**
   - webhook/callback signature verification
   - idempotency keys + duplicate submission protection
   - provider reconciliation jobs and dispute workflows.
2. **Security maturity**
   - robust CSRF token strategy for all state-changing mutations (especially any non-JSON form posts)
   - rate limiting + bot protection on auth/payment endpoints
   - centralized audit/security logging, alerting, and incident runbooks.
3. **Reader productionization**
   - robust EPUB/PDF rendering controls
   - DRM/encryption strategy and signed URL delivery
   - richer offline reading/content rights behavior.
4. **Admin and operations**
   - replace remaining mock admin datasets with database-backed management
   - backups, restore drills, migration rollback policy, staging smoke tests
   - uptime monitoring, tracing, and error tracking integration.
5. **SEO/content operations**
   - real production domain + social share images
   - schema.org coverage for `Book` details pages
   - analytics and search console configuration.

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
   - `AUTH_SECRET` (long random secret used for session signing)
   - `NEXTAUTH_SECRET` (set this to the same value as `AUTH_SECRET` for compatibility with hosting tooling)
   - `NEXTAUTH_URL` (for local development: `http://localhost:3000`)
   - payment provider variables are optional during mock mode; they will be required when real provider APIs are integrated
   - optional storage variables (for future S3/R2 providers; local is default)

4. Prisma + run:

   ```bash
   npm run prisma:migrate -- --name init
   npm run prisma:seed
   npm run dev
   ```

> Seed now creates only an admin account by default (`admin@book.local` / `AdminPass123!`). Create reader accounts via sign up.

## Book asset storage variables (server only)

```bash
# Active provider: local | s3 | r2
BOOK_STORAGE_PROVIDER="local"
```

> Local mode now stores sensitive paid reader files under `storage/private/uploads/*` and serves reading/download access via protected route handlers.

## Payment provider variables (server only)

Current gateways are placeholders and operate in **mock mode** by default, so these values are not required for local development today. Keep them ready for future real integration:

```bash
# Gateway execution mode: mock | live (live integration endpoints are prepared, not yet implemented)
PAYMENT_GATEWAY_MODE="mock"

# Enable /api/payments/verify-mock only in local/test when needed
ALLOW_MOCK_PAYMENT_VERIFICATION="true"
```

> `ALLOW_MOCK_PAYMENT_VERIFICATION` is honored only when `NODE_ENV` is `development` or `test`. In production, mock verification is hard-disabled.

```bash
# Sham Cash (future real integration)
SHAM_CASH_API_BASE_URL="https://api.shamcash.example"
SHAM_CASH_API_KEY="replace-with-sham-cash-api-key"
SHAM_CASH_MERCHANT_ID="replace-with-sham-cash-merchant-id"
SHAM_CASH_CREATE_PAYMENT_PATH="/payments/create"
SHAM_CASH_VERIFY_PAYMENT_PATH="/payments/verify"
SHAM_CASH_TIMEOUT_MS="10000"

# Syriatel Cash (future real integration)
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
- Offline route: `src/app/offline/page.tsx`
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

> `typecheck` auto-runs `prisma generate` first to keep Prisma types synchronized.
