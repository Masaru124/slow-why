import type { SlowWhyConfig } from "./types";

/**
 * Default configuration values for the slow-why middleware.
 *
 * These defaults are merged with any user-supplied overrides at startup.
 * They are tuned for typical development workloads:
 *
 * - `threshold: 500`           — Only analyze requests slower than 500 ms.
 * - `nPlusOneThreshold: 5`     — Flag queries that repeat >= 5 times.
 * - `slowExternalThreshold: 0.4` — Flag a fetch if it consumes >= 40% of total time.
 * - `eventBlockingThreshold: 20` — Ignore event-loop delays under 20 ms.
 */
export const DEFAULT_CONFIG: SlowWhyConfig = {
  threshold: 500,
  enableNPlusOne: true,
  enableSlowExternal: true,
  enableEventBlocking: true,
  nPlusOneThreshold: 5,
  slowExternalThreshold: 0.4,
  eventBlockingThreshold: 20,
};
