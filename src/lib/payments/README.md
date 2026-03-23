# Payment module notes (developer)

This folder defines a modular payment architecture where route handlers call the service layer only.

## Provider integrations

- `gateways/payment-gateway.ts`: provider-agnostic interface consumed by the service layer.
- `gateways/sham-cash-gateway.ts`: Sham Cash placeholder gateway (mock implementation today).
- `gateways/syriatel-cash-gateway.ts`: Syriatel Cash placeholder gateway (mock implementation today).
- `gateways/mock-payment-gateway.ts`: shared mock helpers used by placeholder providers.
- `gateways/provider-http.ts`: retained shared HTTP helpers for future real provider integration.
- `payment-service.ts`: orchestration and DB status transitions only.

## Verification flow

1. `/api/payments/create` creates a `Payment` and a `PaymentAttempt` (`PENDING -> SUBMITTED`).
2. `/api/payments/submit-proof` stores transaction reference/proof metadata on the attempt.
3. `/api/payments/verify-mock` verifies via the selected gateway (`SUBMITTED -> VERIFYING -> PAID|FAILED`).
4. Payment and order records are updated based on final attempt status.

> Current behavior is intentionally mock-first. Real provider API calls can be added inside each gateway without changing service or route contracts.
