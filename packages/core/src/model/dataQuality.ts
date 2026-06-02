export type DataQualityStatus = "ok" | "partial" | "missing" | "unavailable";

export interface DataQuality {
  source: string;
  status: DataQualityStatus;
  reason: string;
  attemptedSources: string[];
  warnings: string[];
}

export interface DataQualityInput {
  source: string;
  status: DataQualityStatus;
  reason: string;
  attemptedSources?: string[];
  warnings?: string[];
}

export function createDataQualityRecord(input: DataQualityInput): DataQuality {
  return {
    source: input.source,
    status: input.status,
    reason: input.reason,
    attemptedSources: input.attemptedSources ?? [],
    warnings: input.warnings ?? []
  };
}

export function mergeDataQuality(records: DataQuality[]): DataQuality[] {
  const merged = new Map<string, DataQuality>();

  for (const record of records) {
    const key = `${record.source}:${record.status}:${record.reason}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...record,
        attemptedSources: [...record.attemptedSources],
        warnings: [...record.warnings]
      });
      continue;
    }

    existing.attemptedSources = unique([
      ...existing.attemptedSources,
      ...record.attemptedSources
    ]);
    existing.warnings = unique([...existing.warnings, ...record.warnings]);
  }

  return [...merged.values()];
}

export function hasUnavailableData(records: DataQuality[]): boolean {
  return records.some(
    (record) => record.status === "missing" || record.status === "unavailable"
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
