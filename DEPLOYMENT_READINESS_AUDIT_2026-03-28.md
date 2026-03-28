# Deployment Readiness Audit — 2026-03-28

## Scope Reviewed
- Runtime/env validation and startup gate (`src/lib/env.ts`, `src/instrumentation.ts`, `src/lib/prisma.ts`)
- Checkout, payments, order finalization, entitlement grants, library, and reader routes/services
- Docker and compose deployment definitions
- Monitoring stack (Prometheus/Grafana/Loki/Alertmanager/Uptime Kuma)
- Health/version/metrics endpoints
- Backup/restore and operations runbooks in `README.md` + `monitoring/`

## Deployment Tier Assessment

### 1) Local staging (single machine, no internet callbacks)
**Status: READY**

Why:
- Project has complete local setup and migration scripts (`prisma migrate dev`, `prisma migrate deploy`, seed, dev/start scripts).
- Runtime env validation exists and is enforced during server startup.
- Tests/lint/typecheck currently pass in this repository snapshot.

Conditions:
- You still must provide minimum env values (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `APP_BASE_URL`, storage + payment mode keys).
- For local QA, keep `PAYMENT_GATEWAY_MODE=mock` unless you are intentionally testing live provider verification.

### 2) VPS staging (Docker Compose)
**Status: PARTIALLY READY**

Why partially:
- Compose files implement migration-first startup (`migrate` service precedes `app`) and app healthchecks.
- Monitoring compose exists with dashboards + alert rules.
- Staging checklist exists, but requires real operator execution and verification (smoke tests, alerts, backup restore drill).

Remaining requirements:
- Fill `.env.production` with real values.
- Configure reverse proxy headers and TLS outside this repo.
- Verify monitoring alert receivers and Uptime Kuma checks after boot.

### 3) Limited production launch
**Status: PARTIALLY READY**

Why partially:
- Core purchase/rental flow, payment-attempt lifecycle, order finalization, and access-grant provisioning are implemented.
- Library and reader access are enforced against active grants and policy checks.
- Operational endpoints (`/api/health`, `/api/version`, `/api/metrics`) and runbooks exist.

Critical pre-launch dependencies still external/manual:
- Real provider credentials and destination accounts.
- Final domain/TLS/reverse-proxy hardening.
- Backup automation + proven restore drill.
- Alert delivery integration (not just local alert rules).

### 4) Broad public launch
**Status: NOT READY**

Why not ready now:
- Backup/restore is documented but not automated/enforced in code.
- Runbooks exist, but production-readiness evidence (restore drill, on-call alert routing, payment provider UAT sign-off) is still operationally manual.
- Storage durability for broad launch should use object storage (`s3`/`r2`), while template defaults to `local` requiring stronger host-level guarantees.

## Detailed Area Audit

### A) Application startup and migration flow
**Status: READY**
- Startup validates env at instrumentation/bootstrap and Prisma initialization.
- Production migration command (`prisma migrate deploy`) is separated from app start and wired into compose migration job.

### B) Docker / Docker Compose deployment readiness
**Status: READY (for baseline deployment), PARTIALLY READY (for hardened ops)**
- Multi-stage Dockerfile and production compose are present.
- `docker-compose.prod.yml` and `docker-compose.app.yml` support both bundled and managed DB deployments.
- Needs operator-owned production hardening (proxy/TLS/firewall/secrets handling).

### C) Required production environment variables
**Status: PARTIALLY READY**
- Validation is strict in production and blocks unsafe modes.
- `.env.production.example` is comprehensive.
- Real secret/URL/provider values are intentionally absent and must be filled manually.

### D) Storage mode readiness (local vs s3/r2)
**Status: PARTIALLY READY**
- Local + S3/R2 providers are implemented.
- Signed URL generation is implemented for S3-compatible providers.
- Broad production durability depends on selecting `s3/r2` and supplying all required credentials/bucket config.

### E) Payment gateway readiness (Sham Cash / Syriatel Cash)
**Status: PARTIALLY READY**
- Provider abstraction exists with live/mock modes and strict live provider env validation.
- Current implementation is manual-transfer + transaction verification (`find_tx`) style, with integrity checks.
- Sham callback endpoint exists but is optional/disabled without webhook secret; Syriatel flow is verify-driven.
- Go-live requires real gateway UAT + credentials + provider-specific operational playbook.

### F) Order finalization / entitlement / library / reader readiness
**Status: READY**
- Paid order transitions trigger access grant creation.
- Purchase dedupe and rental extension logic are implemented.
- Library and reader routes enforce active entitlement checks and rental expiry behavior.
- Protected reading assets are served only with policy+grant authorization.

### G) Health/version endpoints
**Status: READY**
- `/api/health` checks DB reachability and returns degraded status on failure.
- `/api/version` returns commit/branch metadata and payment-mode diagnostic fields.

### H) Monitoring stack readiness
**Status: PARTIALLY READY**
- Full stack configs and alert rules are present in repo.
- Metrics endpoint and app counters exist.
- Still needs environment-side rollout and alert receiver integrations.

### I) Backup / restore readiness
**Status: PARTIALLY READY**
- Backup/restore and rollback steps are documented.
- Heartbeat metric is supported for backup freshness alerting.
- Missing: first-class automated backup job and validated periodic restore drill evidence.

### J) Reverse proxy / HTTPS readiness
**Status: PARTIALLY READY**
- Docs explicitly require proxy with forwarded host/proto and TLS.
- No in-repo Nginx/Caddy/Traefik config is provided; must be supplied on VPS.

### K) Operational risks or missing runbooks
**Status: PARTIALLY READY**
- Runbooks exist for health/version/alerts/payment diagnostics.
- Missing concrete in-repo artifacts for: on-call escalation matrix, secret rotation SOP, and automated backup execution scripts.

## Exact Blockers Before Deployment Decisions

### Blockers for VPS staging
1. Populate `.env.production` with real values and secure secrets.
2. Configure reverse proxy + TLS and verify forwarded headers.
3. Complete first smoke test pass (auth, checkout, payment verify, library, reader).

### Blockers for limited production
1. Payment provider UAT with real merchant accounts and transaction reconciliation.
2. Alert routing to real channels (email/telegram/slack/webhook).
3. Backup automation and at least one successful restore drill.

### Blockers for broad public launch
1. Move to durable object storage (`s3`/`r2`) unless VPS disk durability strategy is formally accepted.
2. Evidence of recurring backup + restore process.
3. Formalized operations/on-call runbook completeness (incident ownership + escalation + secret rotation cadence).

## Exact Missing Manual Values / Config To Provide

- Core:
  - `DATABASE_URL`
  - `AUTH_SECRET` (+ `NEXTAUTH_SECRET` parity)
  - `NEXTAUTH_URL`
  - `APP_BASE_URL`
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
- Storage (if `BOOK_STORAGE_PROVIDER=s3|r2`):
  - `BOOK_STORAGE_S3_ACCESS_KEY_ID`
  - `BOOK_STORAGE_S3_SECRET_ACCESS_KEY`
  - `BOOK_STORAGE_S3_PUBLIC_BUCKET`
  - optional region/endpoint/private bucket/public base URL overrides
- Payments live mode:
  - `PAYMENT_GATEWAY_MODE=live`
  - `PAYMENT_LIVE_PROVIDERS` selection
  - For Sham: `SHAM_CASH_API_BASE_URL`, `SHAM_CASH_API_KEY`, `SHAM_CASH_DESTINATION_ACCOUNT`
  - For Syriatel: `SYRIATEL_CASH_API_BASE_URL`, `SYRIATEL_CASH_API_KEY`, `SYRIATEL_CASH_DESTINATION_ACCOUNT`, optional `SYRIATEL_CASH_FIND_TX_PATH`
- Monitoring/ops:
  - `GRAFANA_ADMIN_PASSWORD`
  - `GRAFANA_ROOT_URL`
  - optional `METRICS_TOKEN`
  - Alertmanager receiver config (currently placeholder)
- VPS infrastructure:
  - Reverse proxy server config and certificates
  - Firewall/open ports policy
  - Backup destination and schedule

## Can we deploy now directly on a VPS without Docker on local machine?
**Yes — technically you can deploy directly on the VPS without running Docker locally first.**

Rationale:
- Repo includes end-to-end VPS compose deployment instructions and migration-first orchestration.
- Build can happen on VPS with `docker compose ... up -d --build`.
- This is contingent on filling production env values and completing reverse-proxy/TLS + smoke checks.

## Operator Checklist

### What is already ready
- Migration-first deployment topology.
- Env validation guardrails.
- Core checkout/payment/entitlement/library/reader path.
- Health/version/metrics endpoints.
- Monitoring config and dashboards in repo.

### What still needs to be filled
- All real production secrets/URLs/provider credentials.
- Reverse proxy + HTTPS configuration.
- Alert receiver destinations and uptime monitors.
- Backup automation destination/schedule.

### What must be verified before deploy
- `migrate` exits successfully on target VPS.
- `/api/health` returns `ok`, `/api/version` returns expected commit.
- End-to-end purchase/rental smoke tests with current env mode.
- Payment verification behavior against selected provider(s).
- Restore from backup in staging at least once.

### What can wait until after first deploy
- Additional SLO dashboards and synthetic journeys.
- Tracing and advanced observability enhancements.
- Multi-node/high-availability scaling.

## Final Verdict
**NOT READY YET** for broad public launch.

The codebase is strong for local/staging and close to limited production, but broad launch readiness is blocked by environment/infrastructure-operational gaps that are outside source code: real payment/UAT completion, reverse-proxy/TLS hardening, alert routing, and proven backup/restore execution.
