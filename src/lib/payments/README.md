# Payment module notes (developer)

This folder defines a modular payment architecture where route handlers call the service layer only.

## Provider integrations

- `gateways/payment-gateway.ts`: provider-agnostic interface consumed by the service layer.
- `gateways/sham-cash-gateway.ts`: Sham Cash placeholder gateway (mock implementation today).
- `gateways/syriatel-cash-gateway.ts`: Syriatel Cash placeholder gateway (mock implementation today).
- `gateways/provider-integration.ts`: clean integration seam for live-vs-mock provider mode and readiness checks.
- `gateways/mock-payment-gateway.ts`: shared mock helpers used by placeholder providers.
- `gateways/provider-http.ts`: retained shared HTTP helpers for future real provider integration.
- `payment-service.ts`: orchestration, lifecycle transitions, integrity checks, and reconciliation-safe updates.
- `errors.ts`: stable payment-domain error codes used by route handlers.

## Verification flow

1. `/api/payments/create` creates a `Payment` and a `PaymentAttempt` (`PENDING -> SUBMITTED`).
2. Provider reference is normalized and checked for uniqueness/integrity across `Payment` and `PaymentAttempt`.
3. `/api/payments/submit-proof` stores transaction reference/proof metadata (only after provider reference is set).
4. `/api/payments/verify-mock` verifies via the selected gateway (`SUBMITTED -> VERIFYING -> PAID|FAILED`).
5. Finalization updates:
   - attempt terminal status + provider payload,
   - payment status with guarded transitions,
   - order status derived from payment status,
   - access grants for paid orders.

## Reconciliation safety

- Payment finalization refuses unsafe downgrades (for example `SUCCEEDED -> FAILED`).
- Provider reference mismatch between attempt/payment is treated as integrity conflict.
- Lifecycle claim step prevents concurrent verification workers from finalizing the same attempt twice.

> Current behavior remains mock-first. Real provider API calls can be added inside each gateway without changing service or route contracts.
