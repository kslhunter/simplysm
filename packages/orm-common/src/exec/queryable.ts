import { TableBuilder } from "../schema/table-builder";
import { ViewBuilder } from "../schema/view-builder";

import type { DataRecord, ResultMeta } from "../types/db";
import type {
  DeleteQueryDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  InsertQueryDef,
  QueryDefObjectName,
  SelectQueryDef,
  SelectQueryDefJoin,
  UpdateQueryDef,
  UpsertQueryDef,
} from "../types/query-def";
import type { DbContextBase } from "../types/db-context-def";
import {
  type ColumnBuilderRecord,
  type DataToColumnBuilderRecord,
} from "../schema/factory/column-builder";
import type { ColumnPrimitive, ColumnPrimitiveStr } from "../types/column";
import type { WhereExprUnit, ExprInput } from "../expr/expr-unit";
import { ExprUnit } from "../expr/expr-unit";
import type { Expr } from "../types/expr";
import { ArgumentError, obj } from "@simplysm/core-common";
import {
  ForeignKeyBuilder,
  ForeignKeyTargetBuilder,
  RelationKeyBuilder,
  RelationKeyTargetBuilder,
} from "../schema/factory/relation-builder";
import { parseSearchQuery } from "./search-parser";
import { expr } from "../expr/expr";

/**
 * JOIN query builder
 *
 * Used internally by join/joinSingle methods to specify the table to join
 */
class JoinQueryable {
  constructor(
    private readonly _db: DbContextBase,
    private readonly _joinAlias: string,
  ) {}

  /**
   * Specify the table to join
   *
   * @param table - Table to join
   * @returns Joined Queryable
   */
  from<T extends TableBuilder<any, any>>(table: T): Queryable<T["$inferSelect"], T> {
    return queryable(this._db, table, this._joinAlias)();
  }

  /**
   * Directly specify columns in join result
   *
   * @param columns - Custom column definition
   * @returns Queryable with custom columns applied
   */
  select<R extends DataRecord>(columns: QueryableRecord<R>): Queryable<R, never> {
    return new Queryable({
      db: this._db,
      as: this._joinAlias,
      columns,
      isCustomColumns: true,
    });
  }

  /**
   * Combine multiple Queryables with UNION
   *
   * @param queries - Array of Queryables to UNION (minimum 2)
   * @returns UNION-ed Queryable
   * @throws If less than 2 queryables are passed
   */
  union<TData extends DataRecord>(...queries: Queryable<TData, any>[]): Queryable<TData, never> {
    if (queries.length < 2) {
      throw new ArgumentError("union requires at least 2 queryables.", {
        provided: queries.length,
        minimum: 2,
      });
    }

    const first = queries[0];

    return new Queryable({
      db: first.meta.db,
      from: queries, // stored as Queryable[] array
      as: this._joinAlias,
      columns: transformColumnsAlias(first.meta.columns, this._joinAlias, ""),
    });
  }
}

/**
 * Recursive CTE (Common Table Expression) builder
 *
 * used internally in recursive() method, Defines the body of a recursive query
 *
 * @template TBaseData - Base query data type
 */
class RecursiveQueryable<TBaseData extends DataRecord> {
  constructor(
    private readonly _baseQr: Queryable<TBaseData, any>,
    private readonly _cteName: string,
  ) {}

  /**
   * specify the target table for recursive query
   *
   * @param table - Target table to recurse
   * @returns Queryable with self property added (for self-reference)
   */
  from<T extends TableBuilder<any, any>>(
    table: T,
  ): Queryable<T["$inferSelect"] & { self?: TBaseData[] }, T> {
    const selfAlias = `${this._cteName}.self`;

    return queryable(this._baseQr.meta.db, table, this._cteName)().join(
      "self",
      () =>
        new Queryable<TBaseData, never>({
          db: this._baseQr.meta.db,
          from: this._cteName,
          as: selfAlias,
          columns: transformColumnsAlias(this._baseQr.meta.columns, selfAlias, ""),
          isCustomColumns: false,
        }),
    ) as any;
  }

  /**
   * Directly specify columns in recursive query
   *
   * @param columns - Custom column definition
   * @returns Queryable with self property added
   */
  select<R extends DataRecord>(
    columns: QueryableRecord<R>,
  ): Queryable<R & { self?: TBaseData[] }, never> {
    const selfAlias = `${this._cteName}.self`;

    return new Queryable<R, never>({
      db: this._baseQr.meta.db,
      as: this._cteName,
      columns,
      isCustomColumns: true,
    }).join(
      "self",
      () =>
        new Queryable<TBaseData, never>({
          db: this._baseQr.meta.db,
          from: this._cteName,
          as: selfAlias,
          columns: transformColumnsAlias(this._baseQr.meta.columns, selfAlias, ""),
          isCustomColumns: false,
        }),
    );
  }

  /**
   * Combine multiple Queryables with UNION (for recursive query)
   *
   * @param queries - Array of Queryables to UNION (minimum 2)
   * @returns UNION Queryable with self property added
   * @throws If less than 2 queryables are passed
   */
  union<TData extends DataRecord>(
    ...queries: Queryable<TData, any>[]
  ): Queryable<TData & { self?: TBaseData[] }, never> {
    if (queries.length < 2) {
      throw new ArgumentError("union requires at least 2 queryables.", {
        provided: queries.length,
        minimum: 2,
      });
    }

    const first = queries[0];

    const selfAlias = `${this._cteName}.self`;

    return new Queryable<any, never>({
      db: first.meta.db,
      from: queries, // stored as Queryable[] array
      as: this._cteName,
      columns: transformColumnsAlias(first.meta.columns, this._cteName, ""),
    }).join(
      "self",
      () =>
        new Queryable({
          db: this._baseQr.meta.db,
          from: this._cteName,
          as: selfAlias,
          columns: transformColumnsAlias(this._baseQr.meta.columns, selfAlias, ""),
          isCustomColumns: false,
        }),
    ) as any;
  }
}

/**
 * Query builder class
 *
 * Construct SELECT, INSERT, UPDATE, DELETE queries on tables/views in a chaining manner
 *
 * @template TData - Data type of query result
 * @template TFrom - Source table (needed for CUD operations)
 *
 * @example
 * ```typescript
 * // Basic query
 * const users = await db.user()
 *   .where((u) => [expr.eq(u.isActive, true)])
 *   .orderBy((u) => u.name)
 *   .execute();
 *
 * // JOIN query
 * const posts = await db.post()
 *   .include((p) => p.user)
 *   .execute();
 *
 * // INSERT
 * await db.user().insert([{ name: "Gildong Hong", email: "test@test.com" }]);
 * ```
 */
export class Queryable<
  TData extends DataRecord,
  TFrom extends TableBuilder<any, any> | never, // Only TableBuilder is supported for CUD operations
> {
  constructor(readonly meta: QueryableMeta<TData>) {}

  //#region ========== option - SELECT / DISTINCT / LOCK ==========

  /**
   * Specify columns to SELECT.
   *
   * @param fn - Column mapping function. Receives original columns and returns new column structure
   * @returns Queryable with new column structure applied
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   userName: u.name,
   *   userEmail: u.email,
   * }))
   * ```
   */
  select<R extends Record<string, any>>(
    fn: (columns: QueryableRecord<TData>) => R,
  ): Queryable<UnwrapQueryableRecord<R>, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.select(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      }) as any;
    }

    const newColumns = fn(this.meta.columns);

    return new Queryable<any, never>({
      ...this.meta,
      columns: newColumns,
      isCustomColumns: true,
    }) as any;
  }

  /**
   * Apply DISTINCT option to remove duplicate rows
   *
   * @returns Queryable with DISTINCT applied
   *
   * @example
   * ```typescript
   * db.user()
   *   .select((u) => ({ name: u.name }))
   *   .distinct()
   * ```
   */
  distinct(): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.distinct());
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    return new Queryable({
      ...this.meta,
      distinct: true,
    });
  }

  /**
   * Apply row lock (FOR UPDATE)
   *
   * Acquire exclusive lock on selected rows within transaction
   *
   * @returns Queryable with lock applied
   *
   * @example
   * ```typescript
   * await db.connect(async () => {
   *   const user = await db.user()
   *     .where((u) => [expr.eq(u.id, 1)])
   *     .lock()
   *     .single();
   * });
   * ```
   */
  lock(): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.lock());
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    return new Queryable({
      ...this.meta,
      lock: true,
    });
  }

  //#endregion

  //#region ========== restrict - TOP / LIMIT ==========

  /**
   * Select only top N rows (can be used without ORDER BY)
   *
   * @param count - number of rows to select
   * @returns Queryable with TOP applied
   *
   * @example
   * ```typescript
   * // Latest 10 users
   * db.user()
   *   .orderBy((u) => u.createdAt, "DESC")
   *   .top(10)
   * ```
   */
  top(count: number): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.top(count));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    return new Queryable({
      ...this.meta,
      top: count,
    });
  }

  /**
   * Set LIMIT/OFFSET for pagination.
   * Must call orderBy() first.
   *
   * @param skip - number of rows to skip (OFFSET)
   * @param take - number of rows to fetch (LIMIT)
   * @returns Queryable with pagination applied
   * @throws Error if no ORDER BY clause
   *
   * @example
   * ```typescript
   * db.user
   *   .orderBy((u) => u.createdAt)
   *   .limit(0, 20) // first 20
   * ```
   */
  limit(skip: number, take: number): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.limit(skip, take));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    if (!this.meta.orderBy) {
      throw new ArgumentError("limit() requires ORDER BY clause.", {
        method: "limit",
        required: "orderBy",
      });
    }

    return new Queryable({
      ...this.meta,
      limit: [skip, take],
    });
  }

  //#endregion

  //#region ========== sorting - ORDER BY ==========

  /**
   * Add sorting condition. Multiple calls apply in order.
   *
   * @param fn - function returning columns to sort by
   * @param orderBy - Sort direction (ASC/DESC). Default: ASC
   * @returns Queryable with sorting conditions added
   *
   * @example
   * ```typescript
   * db.user
   *   .orderBy((u) => u.name)           // name ASC
   *   .orderBy((u) => u.age, "DESC")    // age DESC
   * ```
   */
  orderBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
    orderBy?: "ASC" | "DESC",
  ): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.orderBy(fn, orderBy));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const column = fn(this.meta.columns);

    return new Queryable({
      ...this.meta,
      orderBy: [...(this.meta.orderBy ?? []), [column, orderBy]],
    });
  }

  //#endregion

  //#region ========== Search - WHERE ==========

  /**
   * Add WHERE condition. Multiple calls are combined with AND.
   *
   * @param predicate - Function returning an array of conditions
   * @returns Queryable with conditions added
   *
   * @example
   * ```typescript
   * db.user
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .where((u) => [expr.gte(u.age, 18)])
   * ```
   */
  where(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.where(predicate));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const conditions = predicate(this.meta.columns);

    return new Queryable({
      ...this.meta,
      where: [...(this.meta.where ?? []), ...conditions],
    });
  }

  /**
   * Perform text search
   *
   * See {@link parseSearchQuery} for search syntax
   * - Space-separated words are OR conditions
   * - Words starting with `+` are required includes (AND condition)
   * - Words starting with `-` are excludes (NOT condition)
   *
   * @param fn - Function returning target columns to search
   * @param searchText - Search text
   * @returns Queryable with search conditions added
   *
   * @example
   * ```typescript
   * db.user()
   *   .search((u) => [u.name, u.email], "John Doe -withdrawn")
   * ```
   */
  search(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[],
    searchText: string,
  ): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.search(fn, searchText));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    if (searchText.trim() === "") {
      return this;
    }

    const columns = fn(this.meta.columns);
    const parsed = parseSearchQuery(searchText);

    const conditions: WhereExprUnit[] = [];

    // OR condition: match if any pattern matches in any column
    if (parsed.or.length === 1) {
      const pattern = parsed.or[0];
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.or(columnMatches));
    } else if (parsed.or.length > 1) {
      const orConditions = parsed.or.map((pattern) => {
        const columnMatches = columns.map((col) =>
          expr.like(expr.lower(col), pattern.toLowerCase()),
        );
        return expr.or(columnMatches);
      });
      conditions.push(expr.or(orConditions));
    }

    // MUST condition: each pattern must match in at least one column (AND)
    for (const pattern of parsed.must) {
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.or(columnMatches));
    }

    // NOT condition: must not match in any column (AND NOT)
    for (const pattern of parsed.not) {
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.not(expr.or(columnMatches)));
    }

    if (conditions.length === 0) {
      return this;
    }

    return this.where(() => [expr.and(conditions)]);
  }

  //#endregion

  //#region ========== Group - GROUP BY / HAVING ==========

  /**
   * Add GROUP BY clause
   *
   * @param fn - Function returning columns to group by
   * @returns Queryable with GROUP BY applied
   *
   * @example
   * ```typescript
   * db.order()
   *   .select((o) => ({
   *     userId: o.userId,
   *     totalAmount: expr.sum(o.amount),
   *   }))
   *   .groupBy((o) => [o.userId])
   * ```
   */
  groupBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[],
  ): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.groupBy(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const groupBy = fn(this.meta.columns);

    return new Queryable({ ...this.meta, groupBy });
  }

  /**
   * Add HAVING clause (filtering after GROUP BY)
   *
   * @param predicate - Function returning an array of conditions
   * @returns Queryable with HAVING applied
   *
   * @example
   * ```typescript
   * db.order()
   *   .select((o) => ({
   *     userId: o.userId,
   *     totalAmount: expr.sum(o.amount),
   *   }))
   *   .groupBy((o) => [o.userId])
   *   .having((o) => [expr.gte(o.totalAmount, 10000)])
   * ```
   */
  having(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.having(predicate));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const conditions = predicate(this.meta.columns);

    return new Queryable({
      ...this.meta,
      having: [...(this.meta.having ?? []), ...conditions],
    });
  }

  //#endregion

  //#region ========== join - JOIN / JOIN SINGLE ==========

  /**
   * Perform LEFT OUTER JOIN for 1:N relation (added as array to result)
   *
   * @param as - Property name to add to result
   * @param fn - Callback function defining join conditions
   * @returns Queryable with join result added as array
   *
   * @example
   * ```typescript
   * db.user()
   *   .join("posts", (qr, u) =>
   *     qr.from(Post)
   *       .where((p) => [expr.eq(p.userId, u.id)])
   *   )
   * // Result: { id, name, posts: [{ id, title }, ...] }
   * ```
   */
  join<A extends string, R extends DataRecord>(
    as: A,
    fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<TData & { [K in A]?: R[] }, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.join(as, fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    // 1. join alias Generate
    const joinAlias = `${this.meta.as}.${as}`;

    // 2. Transform target → Queryable (pass alias)
    const joinQr = new JoinQueryable(this.meta.db, joinAlias);

    // 3. Execute fn (returns Queryable with conditions like where added)
    const resultQr = fn(joinQr, this.meta.columns);

    // 4. Add join result to new columns
    const joinColumns = transformColumnsAlias(resultQr.meta.columns, joinAlias);

    return new Queryable({
      ...this.meta,
      columns: {
        ...this.meta.columns,
        [as]: [joinColumns],
      } as QueryableRecord<any>,
      isCustomColumns: true,
      joins: [...(this.meta.joins ?? []), { queryable: resultQr, isSingle: false }],
    }) as any;
  }

  /**
   * Perform LEFT OUTER JOIN for N:1 or 1:1 relation (added as single object to result)
   *
   * @param as - Property name to add to result
   * @param fn - Callback function defining join conditions
   * @returns Queryable with join result added as single object
   *
   * @example
   * ```typescript
   * db.post()
   *   .joinSingle("user", (qr, p) =>
   *     qr.from(User)
   *       .where((u) => [expr.eq(u.id, p.userId)])
   *   )
   * // Result: { id, title, user: { id, name } | undefined }
   * ```
   */
  joinSingle<A extends string, R extends DataRecord>(
    as: A,
    fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<
    { [K in keyof TData as K extends A ? never : K]: TData[K] } & { [K in A]?: R },
    TFrom
  > {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.joinSingle(as, fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    // 1. join alias Generate
    const joinAlias = `${this.meta.as}.${as}`;

    // 2. Transform target → Queryable (pass alias)
    const joinQr = new JoinQueryable(this.meta.db, joinAlias);

    // 3. Execute fn (returns Queryable with conditions like where added)
    const resultQr = fn(joinQr, this.meta.columns);

    // 4. Add join result to new columns
    const joinColumns = transformColumnsAlias(resultQr.meta.columns, joinAlias);

    return new Queryable({
      ...this.meta,
      columns: {
        ...this.meta.columns,
        [as]: joinColumns,
      } as QueryableRecord<any>,
      isCustomColumns: true,
      joins: [...(this.meta.joins ?? []), { queryable: resultQr, isSingle: true }],
    }) as any;
  }

  //#endregion

  //#region ========== join - INCLUDE ==========

  /**
   * Automatically JOIN related tables.
   * Operates based on FK/FKT relations defined in TableBuilder.
   *
   * @param fn - Function selecting relations to include (type-checked via PathProxy)
   * @returns Queryable with JOINs added
   * @throws Error if relation is not defined
   *
   * @example
   * ```typescript
   * // Single relationship include
   * db.post.include((p) => p.user)
   *
   * // Nested relationship include
   * db.post.include((p) => p.user.company)
   *
   * // Multiple relationship include
   * db.user
   *   .include((u) => u.company)
   *   .include((u) => u.posts)
   * ```
   */
  include(fn: (item: PathProxy<TData>) => PathProxy<any>): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.include(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    const proxy = createPathProxy<TData>();
    const result = fn(proxy);
    const relationChain = result[PATH_SYMBOL].join(".");

    return this._include(relationChain);
  }

  private _include(relationChain: string): Queryable<TData, TFrom> {
    const relationNames = relationChain.split(".");

    let result: Queryable<any, any> = this;
    let currentTable = this.meta.from;
    const chainParts: string[] = [];

    for (const relationName of relationNames) {
      if (!(currentTable instanceof TableBuilder)) {
        throw new Error("include() can only be used on TableBuilder-based queryables.");
      }

      const parentChain = chainParts.join(".");
      chainParts.push(relationName);

      // Prevent duplicate add if already JOINed
      const targetAlias = `${result.meta.as}.${chainParts.join(".")}`;
      const existingJoin = result.meta.joins?.find((j) => j.queryable.meta.as === targetAlias);
      if (existingJoin) {
        // Update currentTable to the existing JOIN's table and continue
        const existingFrom = existingJoin.queryable.meta.from;
        if (existingFrom instanceof TableBuilder) {
          currentTable = existingFrom;
        }
        continue;
      }

      const relationDef = currentTable.meta.relations?.[relationName];
      if (relationDef == null) {
        throw new Error(`Relation '${relationName}' not found.`);
      }

      if (relationDef instanceof ForeignKeyBuilder || relationDef instanceof RelationKeyBuilder) {
        // FK/RelationKey (N:1): Post.user → User
        // condition: Post.userId = User.id
        const targetTable = relationDef.meta.targetFn();
        const fkColKeys = relationDef.meta.columns;
        const targetPkColKeys = getMatchedPrimaryKeys(fkColKeys, targetTable);

        result = result.joinSingle(chainParts.join("."), (joinQr, parentCols) => {
          const qr = joinQr.from(targetTable);

          // FKT join is stored as array, so use first element if array
          const srcColsRaw = parentChain ? parentCols[parentChain] : parentCols;
          const srcCols = (
            Array.isArray(srcColsRaw) ? srcColsRaw[0] : srcColsRaw
          ) as QueryableRecord<any>;
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const fkCol = srcCols[fkColKeys[i]];
            const pkCol = qr.meta.columns[targetPkColKeys[i]] as ExprUnit<ColumnPrimitive>;

            conditions.push(expr.eq(pkCol, fkCol));
          }

          return qr.where(() => conditions);
        });

        currentTable = targetTable;
      } else if (
        relationDef instanceof ForeignKeyTargetBuilder ||
        relationDef instanceof RelationKeyTargetBuilder
      ) {
        // FKT/RelationKeyTarget (1:N or 1:1): User.posts → Post[]
        // condition: Post.userId = User.id
        const targetTable = relationDef.meta.targetTableFn();
        const fkRelName = relationDef.meta.relationName;
        const sourceFk = targetTable.meta.relations?.[fkRelName];
        if (!(sourceFk instanceof ForeignKeyBuilder) && !(sourceFk instanceof RelationKeyBuilder)) {
          throw new Error(
            `'${fkRelName}' referenced by '${relationName}' ` +
              `is not a valid ForeignKey/RelationKey in ${targetTable.meta.name} table.`,
          );
        }
        const sourceTable = targetTable;
        const isSingle: boolean = relationDef.meta.isSingle ?? false;

        const fkColKeys = sourceFk.meta.columns;
        const pkColKeys = getMatchedPrimaryKeys(fkColKeys, currentTable);

        const buildJoin = (joinQr: JoinQueryable, parentCols: QueryableRecord<DataRecord>) => {
          const qr = joinQr.from(sourceTable);

          // FKT join is stored as array, so use first element if array
          const srcColsRaw = parentChain ? parentCols[parentChain] : parentCols;
          const srcCols = (
            Array.isArray(srcColsRaw) ? srcColsRaw[0] : srcColsRaw
          ) as QueryableRecord<any>;
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const pkCol = srcCols[pkColKeys[i]] as ExprUnit<ColumnPrimitive>;
            const fkCol = qr.meta.columns[fkColKeys[i]] as ExprUnit<ColumnPrimitive>;

            conditions.push(expr.eq(fkCol, pkCol));
          }

          return qr.where(() => conditions);
        };

        result = isSingle
          ? result.joinSingle(chainParts.join("."), buildJoin)
          : result.join(chainParts.join("."), buildJoin);

        currentTable = sourceTable;
      }
    }

    return result as Queryable<TData, TFrom>;
  }

  //#endregion

  //#region ========== Subquery - WRAP / UNION ==========

  /**
   * Wrap the current Queryable as a Subquery
   *
   * Required when using count() after distinct() or groupBy()
   *
   * @returns Queryable wrapped as a Subquery
   *
   * @example
   * ```typescript
   * // Count after DISTINCT
   * const count = await db.user()
   *   .select((u) => ({ name: u.name }))
   *   .distinct()
   *   .wrap()
   *   .count();
   * ```
   */
  wrap(): Queryable<TData, never> {
    // Wrap the current Queryable as a Subquery
    const wrapAlias = this.meta.db.getNextAlias();
    return new Queryable({
      db: this.meta.db,
      from: this,
      as: wrapAlias,
      columns: transformColumnsAlias<TData>(this.meta.columns, wrapAlias, ""),
    });
  }

  /**
   * Combine multiple Queryables with UNION (remove duplicates)
   *
   * @param queries - Array of Queryables to UNION (minimum 2)
   * @returns UNION-ed Queryable
   * @throws If less than 2 queryables are passed
   *
   * @example
   * ```typescript
   * const combined = Queryable.union(
   *   db.user().where((u) => [expr.eq(u.type, "admin")]),
   *   db.user().where((u) => [expr.eq(u.type, "manager")]),
   * );
   * ```
   */
  static union<TData extends DataRecord>(
    ...queries: Queryable<TData, any>[]
  ): Queryable<TData, never> {
    if (queries.length < 2) {
      throw new ArgumentError("union requires at least 2 queryables.", {
        provided: queries.length,
        minimum: 2,
      });
    }

    const first = queries[0];
    const unionAlias = first.meta.db.getNextAlias();
    return new Queryable({
      db: first.meta.db,
      from: queries, // stored as Queryable[] array
      as: unionAlias,
      columns: transformColumnsAlias(first.meta.columns, unionAlias, ""),
    });
  }

  //#endregion

  //#region ========== recursive - WITH RECURSIVE ==========

  /**
   * Generate a recursive CTE (Common Table Expression)
   *
   * Used for querying hierarchical data (org charts, category trees, etc.)
   *
   * @param fn - Callback function that defines the recursive part
   * @returns Queryable with the recursive CTE applied
   *
   * @example
   * ```typescript
   * // Query org chart hierarchy
   * db.employee()
   *   .where((e) => [expr.null(e.managerId)]) // Root nodes
   *   .recursive((cte) =>
   *     cte.from(Employee)
   *       .where((e) => [expr.eq(e.managerId, e.self[0].id)])
   *   )
   * ```
   */
  recursive(
    fn: (qr: RecursiveQueryable<TData>) => Queryable<TData, any>,
  ): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.recursive(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }
    // Generate dynamic CTE name
    const cteName = this.meta.db.getNextAlias();

    // 2. Transform target to Queryable (pass CTE name)
    const cteQr = new RecursiveQueryable(this, cteName);

    // 3. Execute fn (returns Queryable with conditions like where added)
    const resultQr = fn(cteQr);

    return new Queryable({
      db: this.meta.db,
      as: this.meta.as,
      from: cteName,
      columns: transformColumnsAlias(this.meta.columns, this.meta.as, ""),
      with: {
        name: cteName,
        base: this as any, // Block circular reference type inference
        recursive: resultQr,
      },
    });
  }

  //#endregion

  //#region ========== [query] Select - SELECT ==========

  /**
   * Execute a SELECT query and return the result array
   *
   * @returns Query result array
   *
   * @example
   * ```typescript
   * const users = await db.user()
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .execute();
   * ```
   */
  async execute(): Promise<TData[]> {
    const results = await this.meta.db.executeDefs<TData>(
      [this.getSelectQueryDef()],
      [this.getResultMeta()],
    );
    return results[0];
  }

  /**
   * Return a single result (Error if more than 1)
   *
   * @returns Single result or undefined
   * @throws When more than one result is returned
   *
   * @example
   * ```typescript
   * const user = await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .single();
   * ```
   */
  async single(): Promise<TData | undefined> {
    const result = await this.top(2).execute();
    if (result.length > 1) {
      throw new ArgumentError("Expected single result but multiple results returned.", {
        table: this._getSourceName(),
        resultCount: result.length,
      });
    }
    return result[0];
  }

  /**
   * Return query source name (for error messages)
   */
  private _getSourceName(): string {
    const from = this.meta.from;
    if (from instanceof TableBuilder || from instanceof ViewBuilder) {
      return from.meta.name;
    }
    if (typeof from === "string") {
      return from;
    }
    return this.meta.as;
  }

  /**
   * Return the first result (only the first even if multiple exist)
   *
   * @returns First result or undefined
   *
   * @example
   * ```typescript
   * const latestUser = await db.user()
   *   .orderBy((u) => u.createdAt, "DESC")
   *   .first();
   * ```
   */
  async first(): Promise<TData | undefined> {
    const results = await this.top(1).execute();
    return results[0];
  }

  /**
   * Return the number of result rows
   *
   * @param fn - Function to specify the column to count (optional)
   * @returns Number of rows
   * @throws Error when called directly after distinct() or groupBy() (use wrap() first)
   *
   * @example
   * ```typescript
   * const count = await db.user()
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .count();
   * ```
   */
  async count(fn?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>): Promise<number> {
    if (this.meta.distinct) {
      throw new Error("Cannot use count() after distinct(). Use wrap() first.");
    }
    if (this.meta.groupBy) {
      throw new Error("Cannot use count() after groupBy(). Use wrap() first.");
    }

    const countQr = fn
      ? this.select((c) => ({ cnt: expr.count(fn(c)) }))
      : this.select(() => ({ cnt: expr.count() }));

    const result = await countQr.single();

    return result?.cnt ?? 0;
  }

  /**
   * Check whether data matching the conditions exists
   *
   * @returns true if exists, false otherwise
   *
   * @example
   * ```typescript
   * const hasAdmin = await db.user()
   *   .where((u) => [expr.eq(u.role, "admin")])
   *   .exists();
   * ```
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  getSelectQueryDef(): SelectQueryDef {
    return obj.clearUndefined({
      type: "select",
      from: this._buildFromDef(),
      as: this.meta.as,
      select: this.meta.isCustomColumns ? this._buildSelectDef(this.meta.columns, "") : undefined,
      distinct: this.meta.distinct,
      top: this.meta.top,
      lock: this.meta.lock,
      where: this.meta.where?.map((w) => w.expr),
      joins: this.meta.joins ? this._buildJoinDefs(this.meta.joins) : undefined,
      orderBy: this.meta.orderBy?.map((o) => (o[1] ? [o[0].expr, o[1]] : [o[0].expr])),
      limit: this.meta.limit,
      groupBy: this.meta.groupBy?.map((g) => g.expr),
      having: this.meta.having?.map((w) => w.expr),
      with: this.meta.with
        ? {
            name: this.meta.with.name,
            base: this.meta.with.base.getSelectQueryDef(),
            recursive: this.meta.with.recursive.getSelectQueryDef(),
          }
        : undefined,
    });
  }

  private _buildFromDef():
    | QueryDefObjectName
    | SelectQueryDef
    | SelectQueryDef[]
    | string
    | undefined {
    const from = this.meta.from;

    if (from instanceof TableBuilder || from instanceof ViewBuilder) {
      return this.meta.db.getQueryDefObjectName(from);
    } else if (from instanceof Queryable) {
      return from.getSelectQueryDef();
    } else if (Array.isArray(from)) {
      return from.map((qr) => qr.getSelectQueryDef());
    }

    return from;
  }

  private _buildSelectDef(
    columns: QueryableRecord<any> | QueryableWriteRecord<any>,
    prefix: string,
  ): Record<string, Expr> {
    const result: Record<string, Expr> = {};

    for (const [key, val] of Object.entries(columns)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (val instanceof ExprUnit) {
        result[fullKey] = val.expr;
      } else if (Array.isArray(val)) {
        if (val.length > 0) {
          Object.assign(result, this._buildSelectDef(val[0], fullKey));
        }
      } else if (typeof val === "object" && val != null) {
        Object.assign(result, this._buildSelectDef(val, fullKey));
      } else {
        // Plain value (string, number, boolean, etc.) — convert to Expr
        result[fullKey] = expr.toExpr(val);
      }
    }

    return result;
  }

  private _buildJoinDefs(joins: QueryableMetaJoin[]): SelectQueryDefJoin[] {
    const result: SelectQueryDefJoin[] = [];

    for (const join of joins) {
      const joinQr = join.queryable;
      const selectDef = joinQr.getSelectQueryDef();

      const joinDef: SelectQueryDefJoin = {
        ...selectDef,
        as: joinQr.meta.as,
        isSingle: join.isSingle,
      };

      result.push(joinDef);
    }

    return result;
  }

  getResultMeta(outputColumns?: string[]): ResultMeta {
    const columns: Record<string, ColumnPrimitiveStr> = {};
    const joins: Record<string, { isSingle: boolean }> = {};

    const buildResultMeta = (cols: QueryableRecord<any>, prefix: string) => {
      for (const [key, val] of Object.entries(cols)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (outputColumns && !outputColumns.includes(fullKey)) continue;

        if (val instanceof ExprUnit) {
          // primitive column
          columns[fullKey] = val.dataType;
        } else if (Array.isArray(val)) {
          // array (1:N relationship)
          if (val.length > 0) {
            joins[fullKey] = { isSingle: false };
            buildResultMeta(val[0], fullKey);
          }
        } else if (typeof val === "object") {
          // Single object (N:1, 1:1 relationship)
          joins[fullKey] = { isSingle: true };
          buildResultMeta(val, fullKey);
        }
      }
    };

    buildResultMeta(this.meta.columns, "");

    return { columns, joins };
  }

  //#endregion

  //#region ========== [query] Insert - INSERT ==========

  /**
   * Execute an INSERT query
   *
   * Automatically splits into chunks of 1000 for MSSQL's row limit
   *
   * @param records - Array of records to insert
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of inserted records
   *
   * @example
   * ```typescript
   * // Simple insert
   * await db.user().insert([
   *   { name: "Gildong Hong", email: "hong@test.com" },
   * ]);
   *
   * // Return ID after insert
   * const [inserted] = await db.user().insert(
   *   [{ name: "Gildong Hong" }],
   *   ["id"],
   * );
   * ```
   */
  async insert(records: TFrom["$inferInsert"][]): Promise<void>;
  async insert<K extends keyof TFrom["$inferColumns"] & string>(
    records: TFrom["$inferInsert"][],
    outputColumns: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async insert<K extends keyof TFrom["$inferColumns"] & string>(
    records: TFrom["$inferInsert"][],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    if (records.length === 0) {
      return outputColumns ? [] : undefined;
    }

    // Split into chunks for MSSQL's 1000 row limit
    const CHUNK_SIZE = 1000;
    const allResults: Pick<TFrom["$inferColumns"], K>[] = [];

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
        [this.getInsertQueryDef(chunk, outputColumns)],
        outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
      );

      if (outputColumns) {
        allResults.push(...results[0]);
      }
    }

    if (outputColumns) {
      return allResults;
    }
  }

  /**
   * INSERT if no data matches the WHERE condition
   *
   * @param record - Record to insert
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns the inserted record
   *
   * @example
   * ```typescript
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .insertIfNotExists({ name: "testing", email: "test@test.com" });
   * ```
   */
  async insertIfNotExists(record: TFrom["$inferInsert"]): Promise<void>;
  async insertIfNotExists<K extends keyof TFrom["$inferColumns"] & string>(
    record: TFrom["$inferInsert"],
    outputColumns: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>>;
  async insertIfNotExists<K extends keyof TFrom["$inferColumns"] & string>(
    record: TFrom["$inferInsert"],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K> | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getInsertIfNotExistsQueryDef(record)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0][0];
    }
  }

  /**
   * INSERT INTO ... SELECT (INSERT the current SELECT results into another Table)
   *
   * @param targetTable - Target Table to insert into
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of inserted records
   *
   * @example
   * ```typescript
   * await db.user()
   *   .select((u) => ({ name: u.name, createdAt: u.createdAt }))
   *   .where((u) => [expr.eq(u.isArchived, false)])
   *   .insertInto(ArchivedUser);
   * ```
   */
  async insertInto<TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>>(
    targetTable: TTable,
  ): Promise<void>;
  async insertInto<
    TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>,
    TOut extends keyof TTable["$inferColumns"] & string,
  >(targetTable: TTable, outputColumns: TOut[]): Promise<Pick<TData, TOut>[]>;
  async insertInto<
    TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>,
    TOut extends keyof TTable["$inferColumns"] & string,
  >(targetTable: TTable, outputColumns?: TOut[]): Promise<Pick<TData, TOut>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TData, TOut>>(
      [this.getInsertIntoQueryDef(targetTable)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  getInsertQueryDef(
    records: TFrom["$inferInsert"][],
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): InsertQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    // Set overrideIdentity if AI column has explicit values
    const overrideIdentity =
      outputDef.aiColName != null &&
      records.some((r) => (r as Record<string, unknown>)[outputDef.aiColName!] !== undefined);

    return obj.clearUndefined({
      type: "insert",
      table: this.meta.db.getQueryDefObjectName(from),
      records,
      overrideIdentity: overrideIdentity || undefined,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  getInsertIfNotExistsQueryDef(
    record: TFrom["$inferInsert"],
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): InsertIfNotExistsQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    const { select: _, ...existsSelectQuery } = this.getSelectQueryDef();

    return obj.clearUndefined({
      type: "insertIfNotExists",
      table: this.meta.db.getQueryDefObjectName(from),
      record,
      existsSelectQuery,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  getInsertIntoQueryDef<TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>>(
    targetTable: TTable,
    outputColumns?: (keyof TTable["$inferColumns"] & string)[],
  ): InsertIntoQueryDef {
    const outputDef = this._getCudOutputDef();

    return obj.clearUndefined({
      type: "insertInto",
      table: this.meta.db.getQueryDefObjectName(targetTable),
      recordsSelectQuery: this.getSelectQueryDef(),
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  //#endregion

  //#region ========== [query] Modify - UPDATE / DELETE ==========

  /**
   * Execute an UPDATE query
   *
   * @param recordFwd - Function that returns the columns and values to update
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of updated records
   *
   * @example
   * ```typescript
   * // Simple update
   * await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .update((u) => ({
   *     name: expr.val("string", "New Name"),
   *     updatedAt: expr.val("DateTime", DateTime.now()),
   *   }));
   *
   * // Reference existing value
   * await db.product()
   *   .update((p) => ({
   *     price: expr.mul(p.price, expr.val("number", 1.1)),
   *   }));
   * ```
   */
  async update(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  ): Promise<void>;
  async update<K extends keyof TFrom["$columns"] & string>(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
    outputColumns: K[],
  ): Promise<Pick<TFrom["$columns"], K>[]>;
  async update<K extends keyof TFrom["$columns"] & string>(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$columns"], K>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$columns"], K>>(
      [this.getUpdateQueryDef(recordFwd, outputColumns)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  /**
   * Execute a DELETE query
   *
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of deleted records
   *
   * @example
   * ```typescript
   * // Simple delete
   * await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .delete();
   *
   * // Return deleted data
   * const deleted = await db.user()
   *   .where((u) => [expr.eq(u.isExpired, true)])
   *   .delete(["id", "name"]);
   * ```
   */
  async delete(): Promise<void>;
  async delete<K extends keyof TFrom["$columns"] & string>(
    outputColumns: K[],
  ): Promise<Pick<TFrom["$columns"], K>[]>;
  async delete<K extends keyof TFrom["$columns"] & string>(
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$columns"], K>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$columns"], K>>(
      [this.getDeleteQueryDef(outputColumns)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  getUpdateQueryDef(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): UpdateQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    return obj.clearUndefined({
      type: "update",
      table: this.meta.db.getQueryDefObjectName(from),
      as: this.meta.as,
      record: this._buildSelectDef(recordFwd(this.meta.columns), ""),
      top: this.meta.top,
      where: this.meta.where?.map((w) => w.expr),
      joins: this.meta.joins ? this._buildJoinDefs(this.meta.joins) : undefined,
      limit: this.meta.limit,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  getDeleteQueryDef(outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): DeleteQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    return obj.clearUndefined({
      type: "delete",
      table: this.meta.db.getQueryDefObjectName(from),
      as: this.meta.as,
      top: this.meta.top,
      where: this.meta.where?.map((w) => w.expr),
      joins: this.meta.joins ? this._buildJoinDefs(this.meta.joins) : undefined,
      limit: this.meta.limit,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  //#endregion

  //#region ========== [query] Modify - UPSERT ==========

  /**
   * Execute an UPSERT (UPDATE or INSERT) query
   *
   * UPDATE if data matching the WHERE condition exists, otherwise INSERT
   *
   * @param updateFn - Function that returns the columns and values to update
   * @param insertFn - Function that returns the record to insert (optional, defaults to same as updateFn)
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of affected records
   *
   * @example
   * ```typescript
   * // Same data for UPDATE/INSERT
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .upsert(() => ({
   *     name: expr.val("string", "testing"),
   *     email: expr.val("string", "test@test.com"),
   *   }));
   *
   * // Different data for UPDATE/INSERT
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .upsert(
   *     () => ({ loginCount: expr.val("number", 1) }),
   *     (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
   *   );
   * ```
   */
  async upsert(
    updateFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  ): Promise<void>;
  async upsert<K extends keyof TFrom["$inferColumns"] & string>(
    insertFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async upsert<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
    updateFn: (cols: QueryableRecord<TData>) => U,
    insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
  ): Promise<void>;
  async upsert<
    U extends QueryableWriteRecord<TFrom["$inferUpdate"]>,
    K extends keyof TFrom["$inferColumns"] & string,
  >(
    updateFn: (cols: QueryableRecord<TData>) => U,
    insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async upsert<
    U extends QueryableWriteRecord<TFrom["$inferUpdate"]>,
    K extends keyof TFrom["$inferColumns"] & string,
  >(
    updateFnOrInsertFn:
      | ((cols: QueryableRecord<TData>) => U)
      | ((cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>),
    insertFnOrOutputColumns?:
      | ((updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>)
      | K[],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    const updateRecordFn = updateFnOrInsertFn as (cols: QueryableRecord<TData>) => U;

    const insertRecordFn = (
      insertFnOrOutputColumns instanceof Function ? insertFnOrOutputColumns : updateFnOrInsertFn
    ) as (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>;

    const realOutputColumns =
      insertFnOrOutputColumns instanceof Function ? outputColumns : insertFnOrOutputColumns;

    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getUpsertQueryDef(updateRecordFn, insertRecordFn, realOutputColumns)],
      [realOutputColumns ? this.getResultMeta(realOutputColumns) : undefined],
    );

    if (realOutputColumns) {
      return results[0];
    }
  }

  getUpsertQueryDef<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
    updateRecordFn: (cols: QueryableRecord<TData>) => U,
    insertRecordFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): UpsertQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    const { select: _sel, ...existsSelectQuery } = this.getSelectQueryDef();

    // Generate updateRecord
    const updateQrRecord = updateRecordFn(this.meta.columns);
    const updateRecord: Record<string, Expr> = {};
    for (const [key, value] of Object.entries(updateQrRecord)) {
      updateRecord[key] = expr.toExpr(value);
    }

    // Generate insertRecord (pass updateRecordRaw as second argument)
    const insertRecordRaw = insertRecordFn(updateQrRecord);
    const insertRecord = Object.fromEntries(
      Object.entries(insertRecordRaw).map(([key, value]) => [key, expr.toExpr(value)]),
    );

    return obj.clearUndefined({
      type: "upsert",
      table: this.meta.db.getQueryDefObjectName(from),
      existsSelectQuery,
      updateRecord,
      insertRecord,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  //#endregion

  //#region ========== DDL Helper ==========

  /**
   * FK constraint on/off (can be used within a transaction)
   */
  async switchFk(enabled: boolean): Promise<void> {
    const from = this.meta.from;
    if (!(from instanceof TableBuilder) && !(from instanceof ViewBuilder)) {
      throw new Error(
        "switchFk can only be used on TableBuilder or ViewBuilder based queryables.",
      );
    }
    await this.meta.db.switchFk(this.meta.db.getQueryDefObjectName(from), enabled);
  }

  //#endregion

  //#region ========== CUD Common ==========

  private _getCudOutputDef(): {
    pkColNames: string[];
    aiColName?: string;
  } {
    const from = this.meta.from;

    if (from instanceof TableBuilder) {
      if (from.meta.columns == null) {
        throw new Error(`Table '${from.meta.name}' has no Column definition.`);
      }

      let aiColName: string | undefined;
      for (const [key, col] of Object.entries(from.meta.columns as ColumnBuilderRecord)) {
        if (col.meta.autoIncrement) {
          aiColName = key;
        }
      }

      return {
        pkColNames: from.meta.primaryKey ?? [],
        aiColName,
      };
    }

    throw new Error("CUD operations can only be used on TableBuilder-based queryables.");
  }

  //#endregion
}

//#region ========== Helper Functions ==========

/**
 * Match FK column array with the target Table's PK and return PK column name array
 *
 * @param fkCols - FK column name array
 * @param targetTable - Target Table builder being referenced
 * @returns Matched PK column name array
 * @throws When FK/PK column count mismatch
 */
export function getMatchedPrimaryKeys(
  fkCols: string[],
  targetTable: TableBuilder<any, any>,
): string[] {
  const pk = targetTable.meta.primaryKey;
  if (pk == null || fkCols.length !== pk.length) {
    throw new Error(
      `FK/PK column count mismatch (target: ${targetTable.meta.name}, FK: ${fkCols.length}, PK: ${pk?.length ?? 0})`,
    );
  }
  return pk;
}

/**
 * Common helper to transform nested columns structure to a new alias
 *
 * When wrapping as Subquery/JOIN, transforms existing alias to new alias while
 * keeping nested keys (posts.userId) as flattened keys.
 *
 * e.g.: If the path of posts[0].userId column is ["T1.posts", "userId"],
 *       transforming to new alias "T2" yields ["T2", "posts.userId"].
 *
 * @param columns - Column record to transform
 * @param alias - New Table alias (e.g., "T2")
 * @param keyPrefix - Current nested path (for recursive calls, default "")
 * @returns Transformed column record
 */
function transformColumnsAlias<TRecord extends DataRecord>(
  columns: QueryableRecord<TRecord>,
  alias: string,
  keyPrefix: string = "",
): QueryableRecord<TRecord> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(columns as Record<string, unknown>)) {
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

    if (value instanceof ExprUnit) {
      result[key] = expr.col(value.dataType, alias, fullKey);
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        result[key] = [
          transformColumnsAlias(value[0] as QueryableRecord<DataRecord>, alias, fullKey),
        ];
      }
    } else if (typeof value === "object" && value != null) {
      result[key] = transformColumnsAlias(value as QueryableRecord<DataRecord>, alias, fullKey);
    } else {
      result[key] = value;
    }
  }

  return result as QueryableRecord<TRecord>;
}

//#endregion

//#region ========== Types ==========

interface QueryableMeta<TData extends DataRecord> {
  db: DbContextBase;
  from?:
    | TableBuilder<any, any>
    | ViewBuilder<any, any, any>
    | Queryable<any, any>
    | Queryable<TData, any>[]
    | string;
  as: string;
  columns: QueryableRecord<TData>;
  isCustomColumns?: boolean;
  distinct?: boolean;
  top?: number;
  lock?: boolean;
  where?: WhereExprUnit[];
  joins?: QueryableMetaJoin[];
  orderBy?: [ExprUnit<ColumnPrimitive>, ("ASC" | "DESC")?][];
  limit?: [number, number];
  groupBy?: ExprUnit<ColumnPrimitive>[];
  having?: WhereExprUnit[];
  with?: { name: string; base: Queryable<any, any>; recursive: Queryable<any, any> };
}

interface QueryableMetaJoin {
  queryable: Queryable<any, any>;
  isSingle: boolean;
}

export type QueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? QueryableRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? NullableQueryableRecord<U>[] | undefined
          : never
        : TData[K] extends DataRecord
          ? QueryableRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? NullableQueryableRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};

export type QueryableWriteRecord<TData> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive ? ExprInput<TData[K]> : never;
};

export type NullableQueryableRecord<TData extends DataRecord> = {
  // Primitive — always | undefined (LEFT JOIN NULL propagation)
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K] | undefined>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? NullableQueryableRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? NullableQueryableRecord<U>[] | undefined
          : never
        : TData[K] extends DataRecord
          ? NullableQueryableRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? NullableQueryableRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};

/**
 * Reverse-transform from QueryableRecord to DataRecord
 *
 * Unwraps ExprUnit<T> to T, recursively unwrapping nested objects/arrays
 */
export type UnwrapQueryableRecord<R> = {
  [K in keyof R]: R[K] extends ExprUnit<infer T>
    ? T
    : NonNullable<R[K]> extends (infer U)[]
      ? U extends Record<string, any>
        ? UnwrapQueryableRecord<U>[] | Extract<R[K], undefined>
        : never
      : NonNullable<R[K]> extends Record<string, any>
        ? UnwrapQueryableRecord<NonNullable<R[K]>> | Extract<R[K], undefined>
        : never;
};

//#region ========== PathProxy - Type-safe path builder for include ==========

/**
 * Proxy type for specifying relationship paths in include() in a type-safe manner
 * Only non-ColumnPrimitive fields (FK, FKT relationships) are accessible
 *
 * @example
 * ```typescript
 * // Accessing item.user.company internally collects path ["user", "company"]
 * db.post.include(item => item.user.company)
 *
 * // item.title is string (ColumnPrimitive), so this is a compile error
 * db.post.include(item => item.title) // compile error
 * ```
 */
/**
 * Extract element type if array
 */
type UnwrapArray<TArray> = TArray extends (infer TElement)[] ? TElement : TArray;

const PATH_SYMBOL = Symbol("path");

/**
 * Type-safe path proxy for include()
 */
export type PathProxy<TObject> = {
  [K in keyof TObject as TObject[K] extends ColumnPrimitive ? never : K]-?: PathProxy<
    UnwrapArray<TObject[K]>
  >;
} & { readonly [PATH_SYMBOL]: string[] };

/**
 * Generate PathProxy instance
 * Uses Proxy to intercept property access and collect paths
 */
function createPathProxy<TObject>(path: string[] = []): PathProxy<TObject> {
  return new Proxy({} as PathProxy<TObject>, {
    get(_, prop: string | symbol) {
      if (prop === PATH_SYMBOL) return path;
      if (typeof prop === "symbol") return undefined;
      return createPathProxy<unknown>([...path, prop]);
    },
  });
}

//#endregion

/**
 * Generate a Queryable factory function for a Table or View
 *
 * Used when defining per-Table/View getters in DbContext
 *
 * @param db - DbContext instance
 * @param tableOrView - TableBuilder or ViewBuilder instance
 * @param as - Alias specification (optional, auto-created if not specified)
 * @returns Factory function that returns a Queryable
 *
 * @example
 * ```typescript
 * class AppDbContext extends DbContext {
 *   // A new alias is assigned on each call
 *   user = queryable(this, User);
 *
 *   // Usage example
 *   async getActiveUsers() {
 *     return this.user()
 *       .where((u) => [expr.eq(u.isActive, true)])
 *       .execute();
 *   }
 * }
 * ```
 */
export function queryable<TBuilder extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: TBuilder,
  as?: string,
): () => Queryable<TBuilder["$inferSelect"], TBuilder extends TableBuilder<any, any> ? TBuilder : never> {
  return () => {
    // If as is not specified, use db.getNextAlias() (counter increments)
    // If as is specified, use it as-is (counter does not increment)
    const finalAs = as ?? db.getNextAlias();

    // TableBuilder + columns
    if (tableOrView instanceof TableBuilder && tableOrView.meta.columns != null) {
      const columnDefs = tableOrView.meta.columns as ColumnBuilderRecord;

      return new Queryable({
        db,
        from: tableOrView,
        as: finalAs,
        columns: Object.fromEntries(
          Object.entries(columnDefs).map(([key, colDef]) => [
            key,
            expr.col(colDef.meta.type, finalAs, key),
          ]),
        ),
      }) as any;
    }

    // ViewBuilder + viewFn
    if (tableOrView instanceof ViewBuilder && tableOrView.meta.viewFn != null) {
      const baseQr = tableOrView.meta.viewFn(db);

      // Return with TFrom set to ViewBuilder
      return new Queryable({
        db,
        from: tableOrView,
        as: finalAs,
        columns: transformColumnsAlias(baseQr.meta.columns, finalAs),
      }) as any;
    }

    throw new Error(`Invalid Table/View Metadata: ${tableOrView.meta.name}`);
  };
}

//#endregion
