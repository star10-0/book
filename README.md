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
- PWA-ready foundation (manifest + service worker integration planned next)

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

## Payment Module (Mock-ready)

- Added modular payment architecture with provider interfaces and gateway placeholders.
- New route handlers:
  - `POST /api/payments/create`
  - `POST /api/payments/verify-mock`
- Payment attempts are persisted in `PaymentAttempt` with status flow:
  - `PENDING -> SUBMITTED -> VERIFYING -> PAID | FAILED`
- Provider-specific logic is isolated in gateway classes under `src/lib/payments/gateways`.
- Developer integration notes: `src/lib/payments/README.md`.


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

```bash
npm run lint
npm run prisma:generate
npm run typecheck
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
