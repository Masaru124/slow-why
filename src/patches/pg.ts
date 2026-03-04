/**
 * Monkey-patch for the `pg` (node-postgres) library.
 *
 * Replaces `Client.prototype.query` with a wrapper that:
 *  1. Measures query duration.
 *  2. Records the query text, duration, and timestamp into the current
 *     request's `SlowWhyContext` (if one exists).
 *  3. Delegates to the original `query` method so behaviour is unchanged.
 *
 * The patch records calls even when the query throws, ensuring failed
 * queries are still visible in the performance analysis.
 *
 * Call `patchPg(require('pg').Client)` once at application startup,
 * **before** any queries are executed.
 */

import { getContext } from "../core/context";
import type { DbCall } from "../types";

/** Minimal shape of a pg-like Client class that we need for patching. */
type AnyClient = {
  prototype?: {
    query?: (...args: any[]) => Promise<any>;
  };
};

/**
 * Patches `Client.prototype.query` to track every database call.
 *
 * @param Client - The `pg.Client` class (or any class with a compatible
 *                 `prototype.query` method, e.g. a mock client for testing).
 */
export function patchPg(Client: AnyClient): void {
  try {
    if (!Client || !Client.prototype || !Client.prototype.query) {
      console.warn("slow-why: Could not patch pg - invalid Client provided");
      return;
    }

    const originalQuery = Client.prototype.query!;

    Client.prototype.query = async function (...args: any[]) {
      const ctx = getContext();
      const start = Date.now();

      try {
        const result = await originalQuery.apply(this, args);
        const duration = Date.now() - start;

        // Record the call if we're inside a tracked request scope.
        if (ctx) {
          const query: string =
            typeof args[0] === "string" ? args[0] : args[0]?.text || "";
          const dbCall: DbCall = { query, duration, timestamp: start };
          ctx.dbCalls.push(dbCall);
        }
        return result;
      } catch (error) {
        // Still record timing for failed queries — they contribute to slowness.
        const duration = Date.now() - start;
        if (ctx) {
          const query: string =
            typeof args[0] === "string" ? args[0] : args[0]?.text || "";
          const dbCall: DbCall = { query, duration, timestamp: start };
          ctx.dbCalls.push(dbCall);
        }
        throw error;
      }
    };
  } catch (error: any) {
    console.warn("slow-why: Failed to patch pg:", error?.message ?? error);
  }
}
