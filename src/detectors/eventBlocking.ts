/**
 * Event-loop blocking detector.
 *
 * During a request the middleware runs a setTimeout-based heartbeat
 * (every ~10 ms). If the callback fires later than expected, the
 * overshoot is stored as an `EventBlock`. This detector examines
 * those samples and flags requests where synchronous work caused
 * significant event-loop stalls.
 *
 * Only delays that meet or exceed the `threshold` (default 20 ms)
 * are considered "significant" — smaller jitter is normal and ignored.
 */

import type { EventBlock } from "../types";

/** The analysis result returned when event-loop blocking is detected. */
export interface EventBlockingResult {
  /** The single largest delay observed, in milliseconds. */
  maxBlock: number;
  /** Sum of all significant delays, in milliseconds. */
  totalBlockedTime: number;
  /** Percentage of total request time spent blocked. */
  percentage: number;
}

/**
 * Analyzes recorded event-loop delay samples for blocking behaviour.
 *
 * @param eventLoopBlocks - Delay samples collected by the middleware's heartbeat.
 * @param totalTime       - The total request duration in milliseconds.
 * @param threshold       - Minimum delay (ms) for a sample to count (default: 20).
 * @returns An `EventBlockingResult` if blocking was significant, or `null`.
 */
export function detectEventBlocking(
  eventLoopBlocks: EventBlock[] | undefined,
  totalTime: number | undefined,
  threshold = 20
): EventBlockingResult | null {
  if (!eventLoopBlocks || eventLoopBlocks.length === 0 || !totalTime) {
    return null;
  }

  // Keep only delays that exceed the significance threshold.
  const significantBlocks = eventLoopBlocks.filter((block) => block && block.delay >= threshold);
  if (significantBlocks.length === 0) {
    return null;
  }

  const maxBlock = Math.max(...significantBlocks.map((block) => block.delay));
  const totalBlockedTime = significantBlocks.reduce((sum, block) => sum + block.delay, 0);
  const percentage = (totalBlockedTime / totalTime) * 100;

  return { maxBlock, totalBlockedTime, percentage };
}
