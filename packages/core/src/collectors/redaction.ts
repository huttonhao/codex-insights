const secretPatterns = [
  /\b(sk-[A-Za-z0-9_-]{12,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{12,})\b/g,
  /\b(gh[pousr]_[A-Za-z0-9_]{12,})\b/g,
  /\b([A-Z0-9]{20,})\b/g,
  /((?:api[_-]?key|token|password|secret)\s*[:=]\s*["']?)([^"'\s]+)/gi
];

export interface RedactionOptions {
  redact?: boolean;
}

export function redactSensitiveText(
  value: string | undefined,
  options: RedactionOptions = {}
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (options.redact === false) {
    return value;
  }

  let redacted = value;
  for (const pattern of secretPatterns) {
    redacted = redacted.replace(pattern, (...args: string[]) => {
      if (args.length >= 4 && /[:=]/.test(args[1] ?? "")) {
        return `${args[1]}[REDACTED]`;
      }
      return "[REDACTED]";
    });
  }
  return redacted;
}

export function snippet(
  value: string | undefined,
  maxChars: number,
  options: RedactionOptions = {}
): string | undefined {
  const redacted = redactSensitiveText(value, options);
  if (redacted === undefined) {
    return undefined;
  }
  return redacted.length > maxChars
    ? `${redacted.slice(0, Math.max(0, maxChars - 14))}...[truncated]`
    : redacted;
}
