# Payment module notes (developer)

This folder defines a modular payment architecture where route handlers call the service layer only.

## Where to connect real providers later

- `gateways/sham-cash-gateway.ts`: replace mock create/verify with real Sham Cash API calls.
- `gateways/syriatel-cash-gateway.ts`: replace mock create/verify with real Syriatel Cash API calls.
- `gateways/payment-gateway.ts`: keep this interface stable; adapt provider-specific payloads inside each gateway implementation.
- `payment-service.ts`: keep orchestration and DB status transitions here, not in route handlers.

## Mock verification flow

1. `/api/payments/create` creates a `Payment` and a `PaymentAttempt` (`PENDING -> SUBMITTED`).
2. `/api/payments/verify-mock` runs gateway mock verification (`SUBMITTED -> VERIFYING -> PAID|FAILED`).
3. Payment and order records are updated based on final attempt status.
