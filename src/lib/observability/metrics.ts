type Labels = Record<string, string | number | boolean | undefined | null>;

interface CounterMetric {
  readonly name: string;
  readonly help: string;
  readonly labelNames: string[];
  values: Map<string, number>;
}

const METRIC_PREFIX = "book_";

const counters = new Map<string, CounterMetric>();
const gauges = new Map<string, number>();

function normalizeLabels(labelNames: string[], labels?: Labels) {
  return labelNames.map((label) => String(labels?.[label] ?? "unknown"));
}

function labelsToKey(labelValues: string[]) {
  return labelValues.join("\u0001");
}

function formatLabels(labelNames: string[], labelValues: string[]) {
  if (labelNames.length === 0) {
    return "";
  }

  const pairs = labelNames.map((name, index) => `${name}="${labelValues[index]?.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"')}"`);
  return `{${pairs.join(",")}}`;
}

function createCounter(name: string, help: string, labelNames: string[] = []) {
  const metricName = `${METRIC_PREFIX}${name}`;
  const existing = counters.get(metricName);
  if (existing) return existing;

  const metric: CounterMetric = {
    name: metricName,
    help,
    labelNames,
    values: new Map(),
  };

  counters.set(metricName, metric);
  return metric;
}

const apiResponsesTotal = createCounter(
  "api_responses_total",
  "Total API responses grouped by route and status code.",
  ["route", "status", "status_class"],
);
const paymentEventsTotal = createCounter(
  "payment_events_total",
  "Payment lifecycle events by flow, outcome, and reason.",
  ["flow", "outcome", "reason"],
);
const healthChecksTotal = createCounter("health_checks_total", "Application health checks by result.", ["result"]);

export function incrementCounter(metric: CounterMetric, labels?: Labels, value = 1) {
  const labelValues = normalizeLabels(metric.labelNames, labels);
  const key = labelsToKey(labelValues);
  const current = metric.values.get(key) ?? 0;
  metric.values.set(key, current + value);
}

export function setGauge(name: string, value: number) {
  gauges.set(`${METRIC_PREFIX}${name}`, value);
}

export function recordApiResponse(input: {
  route: string;
  status: number;
}) {
  const statusClass = `${Math.floor(input.status / 100)}xx`;

  incrementCounter(apiResponsesTotal, {
    route: input.route,
    status: String(input.status),
    status_class: statusClass,
  });
}

export function recordPaymentEvent(input: {
  flow: "create" | "submit_proof" | "verify";
  outcome: "success" | "failure";
  reason: string;
}) {
  incrementCounter(paymentEventsTotal, input);
}

export function recordHealthCheck(result: "ok" | "degraded") {
  incrementCounter(healthChecksTotal, { result });
}

function renderCounters() {
  const chunks: string[] = [];

  for (const metric of counters.values()) {
    chunks.push(`# HELP ${metric.name} ${metric.help}`);
    chunks.push(`# TYPE ${metric.name} counter`);

    for (const [key, value] of metric.values.entries()) {
      const labelValues = key.split("\u0001");
      chunks.push(`${metric.name}${formatLabels(metric.labelNames, labelValues)} ${value}`);
    }
  }

  return chunks;
}

function renderGauges() {
  const chunks: string[] = [];

  for (const [name, value] of gauges.entries()) {
    chunks.push(`# TYPE ${name} gauge`);
    chunks.push(`${name} ${value}`);
  }

  return chunks;
}

export function renderPrometheusMetrics() {
  setGauge("process_uptime_seconds", process.uptime());

  return [...renderCounters(), ...renderGauges(), ""].join("\n");
}
