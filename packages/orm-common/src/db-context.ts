/**
 * @deprecated Use defineDbContext + createDbContext instead
 *
 * The old class-based DbContext is deprecated. Please migrate to the functional API:
 *
 * @example
 * ```typescript
 * // Old (deprecated):
 * class MyDb extends DbContext {
 *   readonly user = queryable(this, User);
 * }
 * const db = new MyDb(executor, { database: "mydb" });
 *
 * // New (recommended):
 * const MyDbDef = defineDbContext({
 *   tables: { user: User },
 * });
 * const db = createDbContext(MyDbDef, executor, { database: "mydb" });
 * ```
 */
export type { DbContextBase as DbContext } from "./types/db-context-def";
export type { DbContextStatus } from "./types/db-context-def";
