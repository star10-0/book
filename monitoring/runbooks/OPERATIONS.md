# Book Ops Runbook

## 1) Check health

```bash
curl -i https://<app-domain>/api/health
```

Expected: `200` with `status=ok` and `database=ok`.
If `503`/`degraded`: check DB connectivity and app logs.

## 2) Check version

```bash
curl -sS https://<app-domain>/api/version | jq
```

Confirm commit SHA/branch and payment mode/provider fields.

## 3) Investigate 500/502 errors

1. Grafana → **Book - System Health** (`API 5xx Rate`).
2. Grafana → **Book - Logs & Request Tracing** filter `level="error"`.
3. Terminal logs:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml logs --since=30m app
```

4. For verify-specific failures:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml logs --since=30m app | rg "/api/payments/verify|Failed to verify payment"
```

## 4) Investigate payment failures

1. Grafana → **Book - Payment Flow Health**.
2. Check `Payment Failure Reasons` panel.
3. Filter logs by payment route + `requestId` label in Loki.
4. Verify provider env and mode:

```bash
curl -sS https://<app-domain>/api/version | jq '.mode, .liveProviders, .syriatelIntegration'
```

## 5) Check logs

- Grafana Explore → Loki query examples:
  - `{compose_service="app"}`
  - `{compose_service="app", level="error"}`
  - `{compose_service="app", requestId="<uuid>"}`

## 6) Check dashboards

- System health dashboard for app/db/container/disk state.
- Payment dashboard for create/submit/verify behavior and failure ratios.
- Logs dashboard for requestId-centric investigations.

## 7) Verify alerts

In Prometheus UI:

```bash
# from host
curl -sS http://127.0.0.1:9090/api/v1/rules | jq '.data.groups[].name'
```

Check active alerts:

```bash
curl -sS http://127.0.0.1:9090/api/v1/alerts | jq
```

## 8) Rollback procedure

1. Redeploy previous known-good image/commit.
2. Ensure migration compatibility before rollback if schema changed.
3. Confirm:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml ps
curl -fsS https://<app-domain>/api/health
curl -fsS https://<app-domain>/api/version
```

4. Watch payment error-rate and 5xx panels for 15+ minutes.

## 9) After deploy checklist

1. `migrate` completed successfully (no loop/fail).
2. `/api/health` is `ok`.
3. `/api/version` SHA matches deployed commit.
4. Payment create/submit/verify smoke tests pass.
5. No critical alerts firing.

## 10) Smoke test

- Sign in as test user.
- Create order.
- Create payment attempt.
- Submit proof (if provider requires).
- Verify payment.
- Confirm order appears in library and reader opens.
- Confirm metrics increment and logs contain route + requestId.
