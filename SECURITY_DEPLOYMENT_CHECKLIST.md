# Security Deployment Checklist (Repo-Scoped)

## Keep out of Git

- Real `.env` / `.env.production` values.
- Provider API keys and database URLs.
- Exported CSV reports containing production user/payment data.
- Any ad-hoc debug dumps containing tokens/references.

## Production must NOT run with these defaults

- `BOOK_STORAGE_PROVIDER=local` unless `BOOK_STORAGE_ALLOW_LOCAL_IN_PRODUCTION_BYPASS=true` is explicitly approved for a temporary emergency.
- `PAYMENT_GATEWAY_MODE=mock` unless `PAYMENT_ALLOW_MOCK_MODE_IN_PRODUCTION_BYPASS=true` is explicitly approved for a temporary emergency.
- `ALLOW_MOCK_PAYMENTS=true`.
- `ALLOW_MOCK_PAYMENT_VERIFICATION=true`.
- `BREAK_GLASS_PAYMENT_OVERRIDE_ENABLED=true` outside an approved incident window.

## Mandatory pre-launch checks

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run security:scan:secrets`
6. `npm run security:scan:bundle`

## Emergency overrides (use sparingly)

### Local storage bypass in production

- Env: `BOOK_STORAGE_ALLOW_LOCAL_IN_PRODUCTION_BYPASS=true`
- Risk: irreversible content loss on disk failure + weaker durability.
- Required controls: incident ticket, owner approval, rollback ETA, post-incident cleanup.

### Mock payments bypass in production

- Env: `PAYMENT_ALLOW_MOCK_MODE_IN_PRODUCTION_BYPASS=true`
- Risk: non-real settlement path and billing integrity drift.
- Required controls: incident ticket, explicit freeze of real payment expectations, audit trail for all related admin actions.

