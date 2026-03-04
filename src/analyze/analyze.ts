/**
 * Central analysis orchestrator.
 *
 * Called after a request finishes (and exceeds the duration threshold).
 * It runs each enabled detector against the request's collected data,
 * assembles an `AnalysisResult`, and passes it to the reporter for
 * console output.
 *
 * Errors are caught and logged — the application is never disrupted.
 */

import { DEFAULT_CONFIG } from "../config";
import { detectNPlusOne } from "../detectors/nPlusOne";
import { detectSlowExternal } from "../detectors/slowExternal";
import { detectEventBlocking } from "../detectors/eventBlocking";
import { report, AnalysisResult } from "../report/report";
import type { SlowWhyContext, SlowWhyConfig } from "../types";

/**
 * Analyzes a completed request and prints a diagnostic report.
 *
 * @param context   - The tracking context populated during the request lifecycle.
 * @param totalTime - Total elapsed time for the request in milliseconds.
 * @param config    - Optional overrides for detector thresholds and feature flags.
 */
export function analyzeRequest(
  context: SlowWhyContext,
  totalTime: number,
  config: Partial<SlowWhyConfig> = {}
): void {
  try {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Build the base result with request metadata.
    const result: AnalysisResult = {
      path: context.path || "unknown",
      method: context.method || "unknown",
      totalTime: totalTime || 0,
    };

    // Run each enabled detector and attach its result (if any).
    if (finalConfig.enableNPlusOne) {
      const nPlusOneResult = detectNPlusOne(context.dbCalls, finalConfig.nPlusOneThreshold);
      if (nPlusOneResult) result.nPlusOne = nPlusOneResult;
    }

    if (finalConfig.enableSlowExternal) {
      const slowExternalResult = detectSlowExternal(
        context.httpCalls,
        totalTime,
        finalConfig.slowExternalThreshold
      );
      if (slowExternalResult) result.slowExternal = slowExternalResult;
    }

    if (finalConfig.enableEventBlocking) {
      const eventBlockingResult = detectEventBlocking(
        context.eventLoopBlocks,
        totalTime,
        finalConfig.eventBlockingThreshold
      );
      if (eventBlockingResult) result.eventBlocking = eventBlockingResult;
    }

    // Print the formatted report to the console.
    report(result);
  } catch (error: any) {
    console.error("slow-why: Error analyzing request:", error?.message ?? error);
  }
}
