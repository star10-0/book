# Payment module notes (developer)

This folder defines a modular payment architecture where route handlers call the service layer only.

## Provider integrations

- `gateways/sham-cash-gateway.ts`: Sham Cash API create/verify integration.
- `gateways/syriatel-cash-gateway.ts`: Syriatel Cash API create/verify integration.
- `gateways/provider-http.ts`: shared provider HTTP client, timeout handling, and safe log redaction.
- `gateways/payment-gateway.ts`: provider-agnostic interface consumed by the service layer.
- `payment-service.ts`: orchestration and DB status transitions only.

## Verification flow

1. `/api/payments/create` creates a `Payment` and a `PaymentAttempt` (`PENDING -> SUBMITTED`).
2. `/api/payments/submit-proof` stores transaction reference/proof metadata on the attempt.
3. `/api/payments/verify-mock` invokes provider verification (`SUBMITTED -> VERIFYING -> PAID|FAILED`).
4. Payment and order records are updated based on final attempt status.

> Note: `/api/payments/verify-mock` keeps its legacy name for compatibility with the current UI flow, but now performs real provider verification.
