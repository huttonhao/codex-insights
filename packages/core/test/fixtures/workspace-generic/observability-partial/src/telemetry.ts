export function recordTrace(span: string) {
  metricsCounter(span);
  logger(span);
  return { span, telemetry: true, observability: true };
}

function metricsCounter(span: string) {
  return { span, counter: 1 };
}

function logger(span: string) {
  return { span, log: true };
}
