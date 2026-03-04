/**
 * N+1 query pattern detector.
 *
 * The classic "N+1" problem occurs when application code fetches a list
 * of N items and then issues one additional query per item (e.g. inside
 * a loop). This detector catches the pattern by:
 *
 *  1. Normalizing each SQL query (replacing literal values with `?`).
 *  2. Grouping queries by their normalized form.
 *  3. Flagging any group whose count meets or exceeds the threshold.
 *
 * The first matching group is returned; `null` means no N+1 was found.
 */

import { normalizeQuery } from "../utils/normalize";
import type { DbCall } from "../types";

/** The analysis result returned when an N+1 pattern is detected. */
export interface NPlusOneResult {
  /** The normalized query template (e.g. "select * from users where id = ?"). */
  query: string;
  /** How many times this query pattern was executed. */
  count: number;
  /** Combined duration of all instances of this query, in ms. */
  totalTime: number;
  /** Percentage of total DB time consumed by this query group. */
  percentage: number;
}

/**
 * Analyzes an array of database calls for N+1 patterns.
 *
 * @param dbCalls   - The recorded database calls for the current request.
 * @param threshold - Minimum repeat count to flag a query (default: 5).
 * @returns An `NPlusOneResult` for the first offending group, or `null`.
 */
export function detectNPlusOne(
  dbCalls: DbCall[] | undefined,
  threshold = 5
): NPlusOneResult | null {
  // Not enough queries to possibly contain an N+1 pattern.
  if (!dbCalls || dbCalls.length < threshold) {
    return null;
  }

  // Group queries by their normalized (parameterized) form.
  const normalizedQueries = new Map<
    string,
    { count: number; totalTime: number; queries: DbCall[] }
  >();

  for (const call of dbCalls) {
    if (!call || !call.query) continue;
    const normalized = normalizeQuery(call.query);
    if (!normalizedQueries.has(normalized)) {
      normalizedQueries.set(normalized, { count: 0, totalTime: 0, queries: [] });
    }
    const group = normalizedQueries.get(normalized)!;
    group.count++;
    group.totalTime += call.duration || 0;
    group.queries.push(call);
  }

  // Return the first group that exceeds the threshold.
  for (const [query, group] of normalizedQueries.entries()) {
    if (group.count >= threshold) {
      const totalDbTime = dbCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
      return {
        query,
        count: group.count,
        totalTime: group.totalTime,
        percentage: totalDbTime > 0 ? (group.totalTime / totalDbTime) * 100 : 0,
      };
    }
  }

  return null;
}
