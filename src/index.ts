/**
 * slow-why — automatically explains why a Node.js request is slow.
 *
 * Public API surface:
 *
 * **Setup helpers** (call once at startup):
 *  - `slowWhy()`    — Express middleware that tracks and analyzes each request.
 *  - `patchPg()`    — Monkey-patches `pg.Client.prototype.query` for DB tracking.
 *  - `patchFetch()`  — Monkey-patches `global.fetch` for outbound HTTP tracking.
 *
 * **Low-level utilities** (for testing or custom integrations):
 *  - `analyzeRequest()`     — Run detectors on a manually-built context.
 *  - `createContext()`      — Build a blank `SlowWhyContext`.
 *  - `getContext()`         — Retrieve the current async-scoped context.
 *  - `runWithContext()`     — Execute a function inside a given context.
 *  - `detectNPlusOne()`     — N+1 query detector (pure function).
 *  - `detectSlowExternal()` — Slow external call detector (pure function).
 *  - `detectEventBlocking()`— Event-loop blocking detector (pure function).
 *
 * @packageDocumentation
 */

export { slowWhy } from "./middleware/slowWhy";
export { patchPg } from "./patches/pg";
export { patchFetch } from "./patches/fetch";
export { analyzeRequest } from "./analyze/analyze";
export { createContext, getContext, runWithContext } from "./core/context";
export { detectNPlusOne } from "./detectors/nPlusOne";
export { detectSlowExternal } from "./detectors/slowExternal";
export { detectEventBlocking } from "./detectors/eventBlocking";
