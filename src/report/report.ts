/**
 * Console reporter for slow-why analysis results.
 *
 * Formats the combined output from all detectors into a human-readable,
 * emoji-decorated block printed to `stdout`. Designed to be immediately
 * scannable during local development — no dashboards required.
 */

import type {
  SlowWhyContext,
} from "../types";
import type { EventBlockingResult } from "../detectors/eventBlocking";
import type { NPlusOneResult } from "../detectors/nPlusOne";
import type { SlowExternalResult } from "../detectors/slowExternal";

/**
 * Aggregated analysis result passed to the reporter.
 *
 * Each detector field is optional — only present when that detector
 * found something worth reporting.
 */
export interface AnalysisResult {
  /** The request path (e.g. "/api/users"). */
  path: string;
  /** The HTTP method (e.g. "GET"). */
  method: string;
  /** Total request duration in milliseconds. */
  totalTime: number;
  /** Present when an N+1 query pattern was detected. */
  nPlusOne?: NPlusOneResult;
  /** Present when a slow external API call was detected. */
  slowExternal?: SlowExternalResult;
  /** Present when significant event-loop blocking was detected. */
  eventBlocking?: EventBlockingResult;
}

/**
 * Prints a formatted diagnostic report to the console.
 *
 * If none of the three detectors found anything, a generic
 * "no specific issues" message is shown instead.
 *
 * @param result - The aggregated analysis for a single request.
 */
export function report(result: AnalysisResult) {
  // Header
  console.log("\n" + "=".repeat(60));
  console.log("🐌 Slow Request Detected by slow-why");
  console.log("=".repeat(60));
  console.log(`Path: ${result.path}`);
  console.log(`Method: ${result.method}`);
  console.log(`Total Time: ${result.totalTime.toFixed(0)}ms`);
  console.log("");

  // N+1 section
  if (result.nPlusOne) {
    console.log("⚠️  N+1 Query Pattern Detected");
    console.log(`Query: ${result.nPlusOne.query}`);
    console.log(`Count: ${result.nPlusOne.count}`);
    console.log(`Time Impact: ${result.nPlusOne.percentage.toFixed(1)}%`);
    console.log("");
  }

  // Slow external section
  if (result.slowExternal) {
    console.log("🌐 Slow External API Call");
    console.log(`URL: ${result.slowExternal.url}`);
    console.log(`Duration: ${result.slowExternal.duration.toFixed(0)}ms`);
    console.log(`Time Impact: ${result.slowExternal.percentage.toFixed(1)}%`);
    console.log("");
  }

  // Event-loop blocking section
  if (result.eventBlocking) {
    console.log("🧵 Event Loop Blocking");
    console.log(`Max Block: ${result.eventBlocking.maxBlock.toFixed(0)}ms`);
    console.log(`Total Blocked: ${result.eventBlocking.totalBlockedTime.toFixed(0)}ms`);
    console.log(`Time Impact: ${result.eventBlocking.percentage.toFixed(1)}%`);
    console.log("");
  }

  // Fallback when nothing specific was detected
  if (!result.nPlusOne && !result.slowExternal && !result.eventBlocking) {
    console.log("No specific performance issues detected.");
    console.log("Request was slow but within normal patterns.");
    console.log("");
  }

  // Footer
  console.log("💡 slow-why helps you debug performance issues in development");
  console.log("=".repeat(60) + "\n");
}
