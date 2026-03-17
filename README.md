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
- Prisma initialized with a starter `Book` model
- Environment template for local setup
- Architecture ready for future digital purchase/rental workflows
- PWA-ready foundation (manifest + service worker integration planned next)

## Project Structure

```text
.
├── prisma/
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

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment file:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL locally and ensure `DATABASE_URL` in `.env` is correct.

4. Generate Prisma client:

   ```bash
   npm run prisma:generate
   ```

5. Run migrations:

   ```bash
   npm run prisma:migrate
   ```

6. Start development server:

   ```bash
   npm run dev
   ```

## Quality Checks

```bash
npm run lint
npm run typecheck
```

## Next Suggested Steps

- Add web app manifest and icons.
- Add `next-pwa` or a custom service worker strategy.
- Add domain modules for catalog, purchases, and rentals.
- Add route handlers for book listing and detail APIs.
