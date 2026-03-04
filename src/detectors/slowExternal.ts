/**
 * Slow external API call detector.
 *
 * Flags outbound `fetch` calls that dominate the total request time.
 *
 * Detection strategy (two passes):
 *  1. **Primary pass** — Check each call individually. If any single call
 *     consumes more than `threshold` (default 40%) of total request time,
 *     return it immediately.
 *  2. **Fallback pass** — If no single call exceeds the primary threshold,
 *     find the slowest call overall. If it still accounts for > 20% of the
 *     total time, report it as noteworthy.
 *
 * Returns `null` when no call is significant enough to flag.
 */

import type { HttpCall } from "../types";

/** The analysis result returned when a slow external call is detected. */
export interface SlowExternalResult {
  /** The URL that was called. */
  url: string;
  /** How long the call took, in milliseconds. */
  duration: number;
  /** Percentage of total request time consumed by this call. */
  percentage: number;
}

/**
 * Analyzes recorded HTTP calls for slow external dependencies.
 *
 * @param httpCalls - The outbound HTTP calls captured during the request.
 * @param totalTime - The total request duration in milliseconds.
 * @param threshold - Fraction (0–1) a call must exceed to be flagged (default: 0.4 = 40%).
 * @returns A `SlowExternalResult` for the worst offender, or `null`.
 */
export function detectSlowExternal(
  httpCalls: HttpCall[] | undefined,
  totalTime: number | undefined,
  threshold = 0.4
): SlowExternalResult | null {
  if (!httpCalls || httpCalls.length === 0 || !totalTime) {
    return null;
  }

  // Primary pass — flag any call exceeding the user-configured threshold.
  for (const call of httpCalls) {
    if (!call || !call.duration) continue;
    const percentage = (call.duration / totalTime) * 100;
    if (percentage > threshold * 100) {
      return { url: call.url || "unknown", duration: call.duration, percentage };
    }
  }

  // Fallback pass — report the single slowest call if it's still > 20%.
  const slowestCall = httpCalls.reduce<HttpCall | null>(
    (slowest, call) =>
      call && call.duration && (!slowest || call.duration > slowest.duration) ? call : slowest,
    null
  );
  if (slowestCall && slowestCall.duration) {
    const percentage = (slowestCall.duration / totalTime) * 100;
    if (percentage > 20) {
      return { url: slowestCall.url || "unknown", duration: slowestCall.duration, percentage };
    }
  }

  return null;
}
