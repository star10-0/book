# Monitoring & Alerting Bundle (Docker Compose / VPS)

This folder provides a production-practical observability stack for `book`:

- **Metrics**: Prometheus (+ app metrics endpoint + exporters)
- **Logs**: Loki + Promtail
- **Dashboards**: Grafana (provisioned datasources + dashboards)
- **Uptime checks**: Uptime Kuma (+ blackbox probes in Prometheus)
- **Alerting**: Alertmanager + Prometheus alert rules

## Services added

- `prometheus`
- `alertmanager`
- `grafana`
- `loki`
- `promtail`
- `uptime-kuma`
- `cadvisor`
- `node-exporter`
- `postgres-exporter`
- `blackbox-exporter`

## Deploy with existing production stack

```bash
cd /opt/book
cp .env.production.example .env.production
# set monitoring credentials and optional overrides

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.monitoring.yml \
  --env-file .env.production \
  up -d --build
```

For managed PostgreSQL deployments:

```bash
docker compose \
  -f docker-compose.app.yml \
  -f docker-compose.monitoring.yml \
  --env-file .env.production \
  up -d --build
```

## Required/Recommended env additions

```env
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change-this
GRAFANA_PORT=3300
GRAFANA_ROOT_URL=https://grafana.example.com

# Uptime Kuma
UPTIME_KUMA_PORT=3301

# Prometheus retention
PROMETHEUS_RETENTION=14d

# Optional: protect /api/metrics with bearer token
METRICS_TOKEN=

# Optional for managed PG if no local `db` service exists
POSTGRES_EXPORTER_DSN=postgresql://user:pass@host:5432/dbname?sslmode=require
```

## Endpoints / ports

- Grafana: `:3300`
- Uptime Kuma: `:3301`
- Prometheus: internal (`prometheus:9090`)
- Alertmanager: internal (`alertmanager:9093`)
- Loki: internal (`loki:3100`)

Put Grafana and Uptime Kuma behind your reverse proxy + auth controls.

## What is monitored

- App up/down and health endpoint status
- DB reachability through `/api/health` and PostgreSQL exporter
- API 5xx spikes from app-level counters
- Payment flow outcomes (`create`, `submit-proof`, `verify`)
- `/api/payments/verify` repeated `502`
- Container restart loops (cadvisor)
- Disk pressure (node-exporter)
- Migration failure symptom (migrate seen recently while app remains down)
- Backup heartbeat staleness (optional textfile metric)

## Backup heartbeat (optional, practical)

If your backup script writes this metric into `./volumes/monitoring/textfile/backup.prom`, Alert rules can detect stale backups:

```txt
book_backup_last_success_timestamp_seconds 1711584000
```

Example backup tail step:

```bash
echo "book_backup_last_success_timestamp_seconds $(date +%s)" > /opt/book/volumes/monitoring/textfile/backup.prom
```

## Uptime Kuma checks to configure after first boot

Create HTTP monitors for:

- `https://<app-domain>/api/health`
- `https://<app-domain>/api/version`
- `https://<app-domain>/api/payments/verify` (keyword/body check disabled; status heartbeat only)

Use notification channels (Telegram/email/webhook) from Uptime Kuma for edge reachability alerts.

## Dashboards provisioned

- **Book - System Health**
- **Book - Payment Flow Health**
- **Book - Logs & Request Tracing**

## Runbooks

See `monitoring/runbooks/OPERATIONS.md`.

## Phased approach

### 1) Minimum viable for launch

- Deploy all monitoring services from this bundle.
- Enable Uptime Kuma checks for health/version.
- Verify critical alerts fire (app down, health failing, verify 502 spike).
- Confirm dashboard + Loki logs are usable.

### 2) Recommended next improvements

- Configure Alertmanager receiver integrations (Slack/Telegram/email/webhook).
- Add reverse-proxy metrics (Nginx/Traefik) for real 502 visibility at edge.
- Add SLO panels (checkout success latency/error budgets).
- Add synthetic journey checks for checkout/library/reader.

### 3) Optional advanced hardening

- Multi-VPS remote-write for Prometheus and object storage for long retention.
- Dedicated secrets management (Docker secrets, Vault, SOPS).
- Centralized distributed tracing with OpenTelemetry.
- DB deep metrics (pgBouncer, slow query sampling, WAL/replication alerts).
