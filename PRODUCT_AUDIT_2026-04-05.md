# User-Facing Product Audit — 2026-04-05 (Revised)

Scope: end-user routes and experiences only (storefront, books, curriculum, auth, account, checkout/payment, promo, purchased-content access, session behavior).

> Note: No inline code-review comments were available in-repo in this environment; this revision addresses the additional requested structure directly.

---

## 1) Concise summary

The product is broadly usable for Arabic-first browsing and protected account access, but checkout/cart consistency and payment clarity still need hardening before calling the UX professional-grade.

---

## 2) Confirmed issues only

### C1 — Cart quantity contract mismatch
- **User flow:** browse books → add same item multiple times → checkout.
- **Problem:** UI shows quantity in cart, but checkout creates single-line order item behavior.
- **Where:** `src/components/add-to-cart-button.tsx`, `src/lib/cart.ts`, `src/app/cart/page.tsx`, `src/app/api/orders/route.ts`.
- **Impact:** user expectation mismatch on what will be purchased.
- **Recommended fix:** either remove quantity semantics from UI, or implement true multi-quantity order creation from cart payload.
- **Type:** UI + backend contract issue.

### C2 — Payment method availability can be contradictory
- **User flow:** checkout → payment panel.
- **Problem:** panel can indicate no methods available while fallback provider state still exists and can drive action logic.
- **Where:** `src/components/order-payment-panel.tsx`.
- **Impact:** trust and clarity drop in the most sensitive flow (payment).
- **Recommended fix:** if no providers are available, block all payment actions and show one clear, blocking recovery message.
- **Type:** UI state robustness.

### C3 — Sham Cash QR is static while presented as transaction-specific
- **User flow:** checkout → Sham Cash instructions.
- **Problem:** hardcoded QR image (`/1/1.jpg`) is presented as if tied to live order/account/amount.
- **Where:** `src/components/order-payment-panel.tsx`.
- **Impact:** high-risk payment confusion.
- **Recommended fix:** generate QR dynamically per order, or label static image as illustrative only and remove claims.
- **Type:** UI/payment instruction integrity.

### C4 — Orders list always shows “continue payment” CTA
- **User flow:** account orders list.
- **Problem:** CTA appears regardless of order status.
- **Where:** `src/app/account/orders/page.tsx`.
- **Impact:** unnecessary loops for already-paid/non-payable orders.
- **Recommended fix:** show payment CTA only for `PENDING`; swap to summary/library actions otherwise.
- **Type:** UI logic.

### C5 — Technical config detail appears in user-facing auth errors
- **User flow:** sign in/up when server misconfigured.
- **Problem:** error copy can expose internal config key names.
- **Where:** `src/app/auth/actions.ts`.
- **Impact:** unprofessional UX and avoidable technical leakage.
- **Recommended fix:** replace with user-safe Arabic copy; keep technical detail in logs only.
- **Type:** backend error-policy surfaced in UX.

---

## 3) Likely issues (needs runtime validation)

### L1 — Reader deep-link failures may feel like generic 404 instead of access guidance
- **Where:** `src/app/reader/[accessId]/page.tsx`.
- **Why likely:** code paths can call `notFound()` for some grant states that users perceive as access issues, not missing pages.

### L2 — Empty-state conversion risk in library/rentals
- **Where:** `src/app/account/library/page.tsx`, `src/app/account/rentals/page.tsx`.
- **Why likely:** empty states are present, but direct “next best action” CTAs are weak for first-time users.

### L3 — Mixed Arabic/English payment terminology may reduce polish
- **Where:** `src/app/checkout/[orderId]/page.tsx`, `src/components/order-payment-panel.tsx`.
- **Why likely:** critical payment UI includes English labels in an Arabic-first flow.

### L4 — Payment error feedback discoverability on long/mobile layouts
- **Where:** `src/components/order-payment-panel.tsx`.
- **Why likely:** global message area can be visually distant from the failing field/action.

---

## 4) Highest-priority fixes

1. Fix cart quantity contract (C1).
2. Resolve payment availability contradiction (C2).
3. Replace static/misleading Sham Cash QR behavior (C3).
4. Status-aware account order CTAs (C4).
5. Sanitize end-user auth/config errors (C5).

---

## 5) Exact files involved

### Checkout / payments
- `src/components/order-payment-panel.tsx`
- `src/app/checkout/[orderId]/page.tsx`
- `src/app/api/payments/create/route.ts`
- `src/app/api/payments/submit-proof/route.ts`
- `src/app/api/payments/verify/route.ts`
- `src/app/api/checkout/promo/route.ts`
- `src/app/api/checkout/complete-free/route.ts`

### Cart / order creation
- `src/components/add-to-cart-button.tsx`
- `src/lib/cart.ts`
- `src/app/cart/page.tsx`
- `src/app/api/orders/route.ts`

### Auth / session / access
- `src/app/auth/actions.ts`
- `src/lib/auth-session.ts`
- `src/app/reader/[accessId]/page.tsx`

### Account UX surfaces
- `src/app/account/orders/page.tsx`
- `src/app/account/library/page.tsx`
- `src/app/account/rentals/page.tsx`

---

## 6) Recommendation: immediate fixes now vs after next audit

**Recommendation:** fix **C1–C5 immediately now** (before the next audit), because they affect payment trust, order clarity, and user-facing reliability.

Then run a short follow-up UX audit after those patches to validate likely issues L1–L4 with runtime testing (desktop + mobile viewport).
