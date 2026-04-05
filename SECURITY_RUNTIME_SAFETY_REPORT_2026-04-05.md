# Runtime Safety Report (Post-Merge Security Verification)

Date: 2026-04-05

Scope reviewed:
- src/lib/authz.ts
- src/lib/auth-session.ts
- src/lib/admin/payment-admin.ts
- src/lib/metrics-auth.ts
- src/lib/env.ts
- src/lib/observability/redaction.ts
- src/lib/payments/payment-service.ts
- src/app/api/checkout/promo/route.ts
- src/app/api/checkout/complete-free/route.ts
- src/app/admin/payments/actions.ts
- src/middleware.ts
- src/app/robots.ts

Plus targeted repository-wide searches for secret/token exposure vectors.

## Key conclusions
- Admin authorization is deny-by-default when an admin has no assigned scopes.
- Break-glass override is blocked in production unless both scope and production env gate are enabled; in non-production it is always enabled.
- Metrics auth uses Authorization Bearer token only; query-string token is rejected when token auth is configured.
- Promo/free checkout endpoints use normalized client IP and production-distributed rate limit requirement.
- Transaction reference canonicalization prioritizes dedicated DB column and safely falls back to legacy requestPayload for older rows.
- Provider payloads are sanitized/redacted before storage/logging.
- No tracked runtime .env files found; only .env.example templates are committed.

## Environment key state (repo-verifiable)
- BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED: PRESENT
- METRICS_TOKEN: PRESENT
- AUTH_SECRET: PRESENT
- DATABASE_URL: PRESENT
- KV_REST_API_URL: PRESENT
- KV_REST_API_TOKEN: PRESENT
- UPSTASH_REDIS_REST_URL: NOT_VERIFIABLE_FROM_REPO
- UPSTASH_REDIS_REST_TOKEN: NOT_VERIFIABLE_FROM_REPO
- PAYMENT_GATEWAY_MODE: PRESENT
- PAYMENT_LIVE_PROVIDERS: PRESENT
- ALLOW_MOCK_PAYMENT_VERIFICATION: PRESENT
- ALLOW_MOCK_PAYMENTS: PRESENT

## Notes
This report intentionally excludes secret values.
