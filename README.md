# Book — Arabic-first PWA Bookstore Foundation

`Book` is a production-grade starter for an Arabic-first digital bookstore using Next.js App Router.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

## Current Scope

- Arabic-first UI with global RTL layout
- Home page and placeholder routes:
  - `/`
  - `/books`
  - `/admin`
- Production-ready Prisma schema for catalog, orders, payments, access, and reading progress
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

3. Set `DATABASE_URL` in `.env` to your PostgreSQL database.

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

- 1 admin user (`admin@book.local`)
- 1 demo customer user (`demo@book.local`)
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

## Payment Module (Mock-ready)

- Added modular payment architecture with provider interfaces and gateway placeholders.
- New route handlers:
  - `POST /api/payments/create`
  - `POST /api/payments/verify-mock`
- Payment attempts are persisted in `PaymentAttempt` with status flow:
  - `PENDING -> SUBMITTED -> VERIFYING -> PAID | FAILED`
- Provider-specific logic is isolated in gateway classes under `src/lib/payments/gateways`.
- Developer integration notes: `src/lib/payments/README.md`.

## Quality Checks

```bash
npm run lint
npm run typecheck
```

## Next Suggested Steps

- Add route handlers for catalog, checkout, payment webhook handling, and reader APIs.
- Implement entitlement checks around `AccessGrant` for reader access control.
- Add admin CRUD for books, offers, and files.
