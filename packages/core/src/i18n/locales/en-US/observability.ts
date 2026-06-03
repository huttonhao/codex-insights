export const observabilityMessages = {
  "observability.finding.method": "Observability is evaluated across structured logs, metrics, tracing, dashboards, alerts, cost attribution, and incident docs.",
  "observability.finding.coverage": "{count}/{total} projects contain observability evidence; logs without tracing/metrics/alerts are partial at best.",
  "observability.architecture.rationale.baseline": "Logs, metrics, and tracing should form a shared baseline.",
  "observability.architecture.rationale.alerts": "Dashboards and alerts determine whether issues are noticed in time.",
  "observability.architecture.rationale.cost": "AI features also need token/cost attribution."
} as const;
