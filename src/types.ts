/**
 * Core type definitions for the slow-why library.
 *
 * These interfaces define the data structures used to track, analyze,
 * and configure performance diagnostics for each HTTP request.
 */

/**
 * Represents a single database query captured during a request.
 *
 * Recorded by the `patchPg` monkey-patch whenever `Client.prototype.query` is called.
 */
export interface DbCall {
  /** The raw SQL query string that was executed. */
  query: string;
  /** How long the query took to complete, in milliseconds. */
  duration: number;
  /** Unix timestamp (ms) when the query started. Used for ordering. */
  timestamp?: number;
}

/**
 * Represents a single outbound HTTP call captured during a request.
 *
 * Recorded by the `patchFetch` monkey-patch whenever `global.fetch` is called.
 */
export interface HttpCall {
  /** The URL that was fetched. */
  url: string;
  /** How long the fetch took to complete, in milliseconds. */
  duration: number;
  /** The HTTP status code returned, or 0 if the request failed. */
  status?: number;
  /** Unix timestamp (ms) when the fetch started. */
  timestamp?: number;
}

/**
 * Represents a single detected event-loop blockage sample.
 *
 * Captured by the middleware's setTimeout-based heartbeat monitor.
 * A "delay" is the overshoot beyond the expected interval, meaning
 * synchronous work prevented the callback from firing on time.
 */
export interface EventBlock {
  /** The measured delay overshoot in milliseconds. */
  delay: number;
  /** Unix timestamp (ms) when the block was observed. */
  timestamp?: number;
}

/**
 * Per-request tracking context stored in AsyncLocalStorage.
 *
 * Created at the start of each request by the middleware and
 * populated by patches and the event-loop monitor throughout
 * the request lifecycle.
 */
export interface SlowWhyContext {
  /** The request URL path (e.g. "/api/users"). */
  path: string;
  /** The HTTP method (e.g. "GET", "POST"). */
  method: string;
  /** Unix timestamp (ms) when the request started. */
  startTime: number;
  /** All database queries recorded during this request. */
  dbCalls: DbCall[];
  /** All outbound HTTP calls recorded during this request. */
  httpCalls: HttpCall[];
  /** All event-loop blockage samples recorded during this request. */
  eventLoopBlocks: EventBlock[];
}

/**
 * User-facing configuration options for the slow-why middleware.
 *
 * All fields have sensible defaults defined in `config.ts`.
 * Users pass a `Partial<SlowWhyConfig>` to override only what they need.
 */
export interface SlowWhyConfig {
  /** Minimum total request duration (ms) before analysis is triggered. */
  threshold: number;
  /** Whether to run the N+1 query detector. */
  enableNPlusOne: boolean;
  /** Whether to run the slow external API detector. */
  enableSlowExternal: boolean;
  /** Whether to run the event-loop blocking detector. */
  enableEventBlocking: boolean;
  /** Minimum number of similar normalized queries to flag as N+1. */
  nPlusOneThreshold: number;
  /** Fraction (0-1) of total request time an external call must consume to be flagged. */
  slowExternalThreshold: number;
  /** Minimum event-loop delay (ms) for a sample to be considered significant. */
  eventBlockingThreshold: number;
}
