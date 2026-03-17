# AGENTS.md

## Project Overview
**Project:** `book`  
`book` is an Arabic-first Progressive Web App (PWA) bookstore focused on:
- Reading digital books
- Selling digital books
- Renting digital books
- Preparing the platform for future physical book support

---

## Technical Guidelines
- Use **Next.js App Router**.
- Use **TypeScript only**.
- Use **Tailwind CSS** for styling.
- Use **Prisma** with **PostgreSQL**.
- Prefer a **simple, maintainable architecture**.
- Keep payment providers abstracted behind clear interfaces.
- Start with **digital purchase** and **digital rental** flows only.
- Prepare architecture for future **Sham Cash** and **Syriatel Cash** integrations.
- Follow clean code practices with small, reusable components.
- Use **Server Components** where sensible.
- Use **Route Handlers** for API endpoints.
- Keep `README.md` updated when setup or developer workflow changes.
- Run lint and typecheck after meaningful changes.

---

## UI / UX Guidelines
- Arabic-first experience.
- **RTL by default**.
- Responsive layout for mobile, tablet, and desktop.
- Clean, modern interface.
- Accessible forms and buttons (labels, focus states, keyboard usability).

---

## Workflow Expectations
- Before coding, briefly summarize the implementation plan.
- After coding, summarize changed files.
- Run validation commands when available.
- Do not introduce unnecessary abstractions too early.
