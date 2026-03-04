/**
 * SQL query normalization utility.
 *
 * Converts raw SQL strings into a canonical "template" form so that
 * queries differing only in parameter values are grouped together.
 *
 * Transformations applied (in order):
 *  1. Replace numeric literals (e.g. `42`) with `?`.
 *  2. Replace single-quoted string literals (e.g. `'foo'`) with `?`.
 *  3. Replace double-quoted string literals (e.g. `"bar"`) with `?`.
 *  4. Collapse consecutive whitespace into a single space.
 *  5. Trim leading/trailing whitespace.
 *  6. Convert to lowercase.
 *
 * @example
 * ```ts
 * normalizeQuery("SELECT * FROM users WHERE id = 42");
 * // => "select * from users where id = ?"
 *
 * normalizeQuery("INSERT INTO logs (msg) VALUES ('hello world')");
 * // => "insert into logs (msg) values (?)"
 * ```
 */

/**
 * Normalizes a SQL query string for pattern grouping.
 *
 * @param query - The raw SQL query (accepts `unknown` for defensive coding).
 * @returns The normalized query template, or an empty string for invalid input.
 */
export function normalizeQuery(query: unknown): string {
  if (!query || typeof query !== "string") {
    return "";
  }
  return query
    .replace(/\b\d+\b/g, "?")       // numeric literals  → ?
    .replace(/'[^']*'/g, "?")        // single-quoted strings → ?
    .replace(/"[^"]*"/g, "?")        // double-quoted strings → ?
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim()
    .toLowerCase();
}
