/**
 * Express middleware that orchestrates the entire slow-why lifecycle.
 *
 * For every incoming request it:
 *  1. Creates an isolated `SlowWhyContext` via AsyncLocalStorage.
 *  2. Starts a setTimeout-based event-loop delay monitor.
 *  3. Wraps `res.end()` so that when the response finishes:
 *     a. The event-loop monitor is stopped.
 *     b. Total request time is computed.
 *     c. If the time exceeds the configured threshold, `analyzeRequest`
 *        runs all enabled detectors and prints a diagnostic report.
 *
 * The middleware is a no-op when `NODE_ENV === "production"`, making it
 * safe to leave in the application code permanently.
 */

import { setImmediate } from "timers";
import { DEFAULT_CONFIG } from "../config";
import { createContext, runWithContext } from "../core/context";
import { analyzeRequest } from "../analyze/analyze";
import type { SlowWhyConfig } from "../types";

/**
 * Returns an Express-compatible middleware function.
 *
 * @param options - Optional overrides for the default configuration.
 *                  Only the keys you provide are overridden; the rest
 *                  keep their default values from `DEFAULT_CONFIG`.
 *
 * @example
 * ```ts
 * app.use(slowWhy({ threshold: 200 }));
 * ```
 */
export function slowWhy(options: Partial<SlowWhyConfig> = {}) {
  const config = { ...DEFAULT_CONFIG, ...options };

  return function (req: any, res: any, next: any) {
    // Skip entirely in production — zero overhead.
    if (process.env.NODE_ENV === "production") {
      return next();
    }

    try {
      // 1. Create a fresh per-request tracking context.
      const context = createContext(req.path, req.method);

      // 2. Run the rest of the request inside AsyncLocalStorage
      //    so patches can access this context automatically.
      runWithContext(context, () => {

        // --- Event-loop delay monitor ---
        // Schedules a recurring setTimeout. If the callback fires later
        // than expected, the overshoot is recorded as a blockage sample.
        let monitorTimer: NodeJS.Timeout | undefined;
        let monitorStopped = false;
        const monitorIntervalMs = 10;
        let lastTick = Date.now();

        const monitorEventLoopDelay = () => {
          if (monitorStopped) return;
          const now = Date.now();
          const delay = now - lastTick - monitorIntervalMs;
          if (delay > 0) {
            context.eventLoopBlocks.push({ delay, timestamp: now });
          }
          lastTick = now;
          monitorTimer = setTimeout(monitorEventLoopDelay, monitorIntervalMs);
          // unref() so the timer doesn't keep the process alive.
          if (typeof monitorTimer.unref === "function") {
            monitorTimer.unref();
          }
        };

        // Kick off the first heartbeat tick.
        monitorTimer = setTimeout(monitorEventLoopDelay, monitorIntervalMs);
        if (typeof monitorTimer.unref === "function") {
          monitorTimer.unref();
        }

        // --- Wrap res.end() to trigger analysis after the response ---
        const originalEnd = res.end;
        res.end = function (...args: any[]) {
          // Stop the event-loop monitor immediately.
          monitorStopped = true;
          if (monitorTimer) {
            clearTimeout(monitorTimer);
          }

          // Send the response to the client first.
          const result = originalEnd.apply(this, args);

          // Defer analysis to the next tick so it doesn't add latency.
          setImmediate(() => {
            try {
              const totalTime = Date.now() - context.startTime;
              if (totalTime > config.threshold) {
                analyzeRequest(context, totalTime, config);
              }
            } catch (error: any) {
              console.error("slow-why: Error in request analysis:", error?.message ?? error);
            }
          });
          return result;
        };

        // Continue to the next middleware / route handler.
        next();
      });
    } catch (error: any) {
      // Never break the application — log and move on.
      console.error("slow-why: Error in middleware setup:", error?.message ?? error);
      next();
    }
  };
}
