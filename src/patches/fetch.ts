/**
 * Monkey-patch for the global `fetch` API.
 *
 * Replaces `global.fetch` with a wrapper that:
 *  1. Measures call duration.
 *  2. Extracts the URL from the various input formats (string, URL, Request).
 *  3. Records the URL, duration, HTTP status, and timestamp into the
 *     current request's `SlowWhyContext` (if one exists).
 *  4. Delegates to the original `fetch` so behaviour is unchanged.
 *
 * Network errors are still recorded (with `status: 0`) so they appear
 * in the performance report.
 *
 * Call `patchFetch()` once at application startup.
 */

import { getContext } from "../core/context";
import type { HttpCall } from "../types";

/**
 * Patches `global.fetch` to track every outbound HTTP call.
 *
 * If `fetch` is not available in the current environment (e.g. older
 * Node.js without `--experimental-fetch`), the patch is silently skipped.
 */
export function patchFetch(): void {
  try {
    const g: any = global as any;
    if (typeof g.fetch !== "function") {
      console.warn("slow-why: fetch not available, skipping patch");
      return;
    }

    const originalFetch = g.fetch as (...args: any[]) => Promise<any>;

    g.fetch = async function (input: any, init?: any) {
      const ctx = getContext();
      const start = Date.now();

      try {
        const response = await originalFetch.call(this, input, init);
        const duration = Date.now() - start;

        // Record the call if we're inside a tracked request scope.
        if (ctx) {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
              ? input.toString()
              : input.url || "";
          const httpCall: HttpCall = {
            url,
            duration,
            status: response.status,
            timestamp: start,
          };
          ctx.httpCalls.push(httpCall);
        }
        return response;
      } catch (error) {
        // Still record timing for failed requests — they contribute to slowness.
        const duration = Date.now() - start;
        if (ctx) {
          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
              ? input.toString()
              : input.url || "";
          const httpCall: HttpCall = {
            url,
            duration,
            status: 0,
            timestamp: start,
          };
          ctx.httpCalls.push(httpCall);
        }
        throw error;
      }
    };
  } catch (error: any) {
    console.warn("slow-why: Failed to patch fetch:", error?.message ?? error);
  }
}
