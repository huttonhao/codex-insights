import type { DataQualityStatus } from "../model/dataQuality.js";
import type { PriorityLevel } from "../model/narrative.js";
import type { TopicMaturity } from "../model/topic.js";
import type { I18nContext } from "./locale.js";
import { t } from "./t.js";

export function formatList(items: string[]): string {
  return items.filter(Boolean).join(", ");
}

export function formatCount(ctx: I18nContext, count: number): string {
  return new Intl.NumberFormat(ctx.locale).format(count);
}

export function formatUnknown(ctx: I18nContext): string {
  return t(ctx, "common.notDetected");
}

export function formatSeverity(
  ctx: I18nContext,
  severity: "recommended" | "strongly_recommended" | "critical"
): string {
  return t(ctx, `severity.${severity}`);
}

export function formatMaturity(ctx: I18nContext, maturity: TopicMaturity): string {
  return t(ctx, `maturity.${maturity}`);
}

export function formatPriority(ctx: I18nContext, priority: PriorityLevel): string {
  return t(ctx, `priority.${priority}`);
}

export function formatDataQualityStatus(
  ctx: I18nContext,
  status: DataQualityStatus
): string {
  return t(ctx, `dataQuality.status.${status}`);
}

export function formatBoolean(ctx: I18nContext, value: boolean | undefined): string {
  if (value === undefined) return t(ctx, "common.notDetected");
  return value ? t(ctx, "common.yes") : t(ctx, "common.no");
}
