# Book — Arabic-first PWA Bookstore Foundation

`Book` is a production-grade starter for an Arabic-first digital bookstore using Next.js App Router.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Cookie-based authentication (credentials, signed server session)

## Current Scope

- Arabic-first UI with global RTL layout
- Home page and placeholder routes:
  - `/`
  - `/books`
  - `/admin`
- Production-ready Prisma schema for catalog, orders, payments, access, reading progress, and book asset metadata
- Environment template for local setup
- Architecture ready for digital purchase/rental workflows and future physical books
- PWA setup included: manifest, service worker registration, and conservative runtime caching

## Project Structure

```text
.
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── admin/page.tsx
│   │   ├── books/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── site-header.tsx
│   └── lib/
│       └── prisma.ts
├── .env.example
└── package.json
```


## Progressive Web App (PWA)

This project now includes a text-only PWA setup (no binary icons committed):

- Manifest: `public/manifest.webmanifest`
- Service worker script: `public/sw.js`
- Service worker registration: `src/components/pwa/sw-register.tsx` (enabled in production only)
- Manifest + placeholder icon metadata wired in `src/app/layout.tsx`

### Caching Strategy

The service worker is intentionally conservative:

- **Cache-first** for same-origin static build assets (e.g. `/_next/static/*`, CSS, JS, fonts).
- **Network-first** for navigation requests with offline fallback to cached shell routes (`/` and `/books`).
- **No service-worker caching** for dynamic or user-specific areas:
  - `/api/*`
  - `/account*`
  - `/admin*`
  - `/checkout*`
  - `/reader*`

This helps keep authenticated/session-sensitive pages fresh and reduces risk of stale personalized content.

### Text-only PWA Icon Source + Generation

This repository keeps the icon pipeline text-only by default:

- SVG source icon: `public/icons/source-book-icon.svg`
- Generator script: `scripts/generate-pwa-icons.ts`
- NPM command: `npm run icons:generate`

Generated binary files are intentionally ignored in Git and should be generated locally when needed.

#### Prerequisite

Install **ImageMagick** locally (command name `magick` or `convert`). The script uses ImageMagick to rasterize the SVG and build an `.ico` file.

#### Generate required icons

Run:

```bash
npm run icons:generate
```

This creates the following files in `public/icons/`:

- `icon-192.png` (`192x192`)
- `icon-512.png` (`512x512`)
- `apple-touch-icon.png` (`180x180`)
- `favicon.ico` (multi-size icon generated from the PNG outputs)

After generating icons, run checks:

```bash
npm run lint
npm run typecheck
```

## Database Setup (Prisma + PostgreSQL)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment file:

   ```bash
   cp .env.example .env
   ```

3. Set environment variables in `.env`:

   - `DATABASE_URL` (PostgreSQL connection string)
   - `AUTH_SECRET` (long random secret for signing session cookies)

4. Generate Prisma Client:

   ```bash
   npm run prisma:generate
   ```

5. Create and apply a local migration:

   ```bash
   npm run prisma:migrate -- --name init_bookstore
   ```

6. (Optional) Validate the Prisma schema:

   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/book" npx prisma validate
   ```

7. Start the app:

   ```bash
   npm run dev
   ```

## Seed Demo Data

After running migrations, seed the database with realistic demo data:

```bash
npm run prisma:seed
```

The seed script creates/updates:

- 1 admin user (`admin@book.local` / `AdminPass123!`)
- 1 user account (`demo@book.local` / `UserPass123!`)
- 3 authors
- 5 categories
- 8 digital books with Arabic descriptions and cover placeholders
- Mixed digital offers (purchase and rental), including books that support both

The seed is safely rerunnable: it uses upserts for unique records and refreshes book offers per seeded book to avoid duplicates.

## Schema Design Notes

- `BookOffer` models purchasable/rentable offers per book (purchase vs rental, pricing, optional rental duration).
- `Order` + `OrderItem` keeps commercial history immutable via snapshot fields.
- `Payment` separates transaction lifecycle from order lifecycle and keeps provider metadata extensible.
- `AccessGrant` is the entitlement source of truth for digital access (perpetual purchase or time-boxed rental).
- `Book.format` already supports future physical products without adding shipping tables yet.

## Book Asset File Management (Scaffolding)

- `BookFile` now supports metadata records for:
  - cover images (`COVER_IMAGE` + optional dimensions/blur metadata)
  - EPUB (`EPUB` + optional package/version metadata)
  - PDF (`PDF` + optional version/page-count metadata)
- Storage provider is abstracted with provider-aware fields (`LOCAL`, `S3`, `CLOUDFLARE_R2`) to prepare for future S3/R2 upload flows.
- Admin page includes early scaffolding to associate file records with books without implementing a full upload workflow yet.
- Optional env flag: `BOOK_STORAGE_PROVIDER=local|s3|r2`.

## Payment Module

- Payment providers are integrated through `PaymentGateway` implementations while API route handlers remain provider-agnostic.
- Active route handlers:
  - `POST /api/payments/create`
  - `POST /api/payments/submit-proof`
  - `POST /api/payments/verify-mock` (legacy endpoint name retained; now performs real provider verification)
- Payment attempts are persisted in `PaymentAttempt` with status flow:
  - `PENDING -> SUBMITTED -> VERIFYING -> PAID | FAILED`
- Provider-specific logic is isolated in gateway classes under `src/lib/payments/gateways`.
- Provider responses are logged with sensitive fields redacted.

### Required Payment Provider Environment Variables

Set these values only on the server (do **not** expose as `NEXT_PUBLIC_*`):

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


## Authentication

This project now uses a production-oriented credentials flow with signed HTTP-only cookies:

- Sign up: `/auth/sign-up`
- Sign in: `/auth/sign-in`
- Sign out: available from the main header after login
- Protected account pages: `/account/*`
- Protected admin pages: `/admin/*` (requires `ADMIN` role)

### Required Auth Environment Variables

```bash
AUTH_SECRET="replace-with-a-long-random-secret"
```

Generate a secure value with:

```bash
openssl rand -base64 32
```

## Quality Checks

Use these scripts regularly during development:

```bash
npm run lint
npm run typecheck
npm run test
npm run prisma:generate
```

## Next Suggested Steps

- Add route handlers for catalog, checkout, payment webhook handling, and reader APIs.
- Implement entitlement checks around `AccessGrant` for reader access control.
- Add admin CRUD for books, offers, and files.


## Local Development Reliability Notes

To keep local development stable, this project now includes a Prisma generation hook before development and production builds:

- `predev` runs `prisma generate` automatically before `npm run dev`
- `prebuild` runs `prisma generate` automatically before `npm run build`

This helps prevent stale Prisma Client artifacts after schema changes.

### Recovery Checklist (when `npm run dev` fails)

Run the following in order:

```bash
npm install
npm run prisma:generate
npm run lint
npm run typecheck
npm run test
npm run dev
```

If Prisma schema changed recently, also ensure your DB schema is current:

```bash
npm run prisma:migrate
```


### PostCSS/Tailwind dependency fix

If `npm run dev` fails with `Cannot find module 'autoprefixer'`, ensure the CSS toolchain dependencies are installed explicitly:

```bash
npm install -D tailwindcss postcss autoprefixer
```

`postcss.config.mjs` should include both plugins:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Font strategy for offline/local development

To avoid Google Fonts network fetch failures during local development, the layout uses the local/system Arabic-friendly stack (`Noto Sans Arabic`, `Noto Kufi Arabic`, `Tahoma`, `Arial`, `system-ui`) via Tailwind `font-sans` instead of runtime Google font fetching.
