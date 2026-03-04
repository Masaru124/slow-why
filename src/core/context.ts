/**
 * Request-scoped context management using AsyncLocalStorage.
 *
 * Each incoming HTTP request gets its own `SlowWhyContext` instance.
 * The context travels automatically through the entire async call chain
 * (database queries, fetch calls, timers, etc.) without requiring
 * manual propagation — this is the backbone of slow-why's per-request tracking.
 */

import { AsyncLocalStorage } from "async_hooks";
import type { SlowWhyContext } from "../types";

/** Singleton storage instance — one per process, shared by all requests. */
const storage = new AsyncLocalStorage<SlowWhyContext>();

/**
 * Creates a fresh tracking context for a new request.
 *
 * @param path   - The request URL path (e.g. "/api/users").
 * @param method - The HTTP method (e.g. "GET").
 * @returns A new `SlowWhyContext` with empty tracking arrays and a start timestamp.
 */
export function createContext(path: string, method: string): SlowWhyContext {
  return {
    path,
    method,
    startTime: Date.now(),
    dbCalls: [],
    httpCalls: [],
    eventLoopBlocks: [],
  };
}

/**
 * Retrieves the tracking context for the current async execution scope.
 *
 * Returns `undefined` when called outside of a request scope (e.g. during
 * application startup). Patches use this to decide whether to record a call.
 */
export function getContext(): SlowWhyContext | undefined {
  return storage.getStore();
}

/**
 * Executes `fn` within the given context so that all async work
 * spawned inside `fn` can access the same `SlowWhyContext` via `getContext()`.
 *
 * @param context - The request context to associate with `fn`.
 * @param fn      - The function to run (typically calls `next()` in Express).
 */
export function runWithContext<T>(context: SlowWhyContext, fn: () => T): T {
  return storage.run(context, fn);
}
