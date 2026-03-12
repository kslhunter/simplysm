import type { DbContextBase } from "../types/db-context-def";
import type { Queryable } from "../exec/queryable";
import type { DataRecord } from "../types/db";
import {
  createRelationFactory,
  type InferDeepRelations,
  type RelationBuilderRecord,
} from "./factory/relation-builder";

// ============================================
// ViewBuilder
// ============================================

/**
 * Database View definition builder
 *
 * Define View query and relations via Fluent API
 * Use with DbContext's queryable() for type-safe query composition
 *
 * @template TDbContext - DbContext type
 * @template TData - View data record type
 * @template TRelations - Relation definition record type
 *
 * @example
 * ```typescript
 * // View definition
 * const UserSummary = View("UserSummary")
 *   .database("mydb")
 *   .query((db: MyDb) =>
 *     db.user()
 *       .select(u => ({
 *         id: u.id,
 *         name: u.name,
 *         postCount: expr.subquery(
 *           db.post().where(p => [expr.eq(p.authorId, u.id)]),
 *           q => expr.count(q.id)
 *         ),
 *       }))
 *   );
 *
 * // Used in DbContext
 * class MyDb extends DbContext {
 *   readonly userSummary = queryable(this, UserSummary);
 * }
 * ```
 *
 * @see {@link View} factory function
 * @see {@link queryable} Queryable Generate
 */
export class ViewBuilder<
  TDbContext extends DbContextBase,
  TData extends DataRecord,
  TRelations extends RelationBuilderRecord,
> {
  /** Relation definition (type for inference) */
  readonly $relations!: TRelations;
  /** Full Type inference */
  readonly $inferSelect!: TData;

  /**
   * @param meta - View Metadata
   * @param meta.name - View name
   * @param meta.description - View description (comment)
   * @param meta.database - Database name
   * @param meta.schema - Schema name (MSSQL/PostgreSQL)
   * @param meta.viewFn - View Query definition function
   * @param meta.relations - Relation definition
   */
  constructor(
    readonly meta: {
      name: string;
      description?: string;
      database?: string;
      schema?: string;
      viewFn?: (db: TDbContext) => Queryable<TData, any>;
      relations?: TRelations;
    },
  ) {}

  /**
   * View set description
   *
   * @param desc - View description (used as DDL Comment)
   * @returns new ViewBuilder instance
   */
  description(desc: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database set name
   *
   * @param db - Database name
   * @returns new ViewBuilder instance
   *
   * @example
   * ```typescript
   * const UserSummary = View("UserSummary").database("mydb");
   * ```
   */
  database(db: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, database: db });
  }

  /**
   * schema set name
   *
   * Used in MSSQL, PostgreSQL
   *
   * @param schema - Schema name (MSSQL: dbo, PostgreSQL: public)
   * @returns new ViewBuilder instance
   */
  schema(schema: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, schema });
  }

  /**
   * View Query definition
   *
   * Define the View's data source through a SELECT query
   *
   * @template TViewData - View data type
   * @template TDb - DbContext type
   * @param viewFn - Function that receives a DbContext and returns a Queryable
   * @returns new ViewBuilder instance
   *
   * @example
   * ```typescript
   * const ActiveUsers = View("ActiveUsers")
   *   .database("mydb")
   *   .query((db: MyDb) =>
   *     db.user()
   *       .where(u => [expr.eq(u.status, "active")])
   *       .select(u => ({
   *         id: u.id,
   *         name: u.name,
   *         email: u.email,
   *       }))
   *   );
   * ```
   */
  query<TViewData extends DataRecord, TDb extends DbContextBase>(
    viewFn: (db: TDb) => Queryable<TViewData, any>,
  ): ViewBuilder<TDb, TViewData, TRelations> {
    return new ViewBuilder({ ...this.meta, viewFn });
  }

  /**
   * Relation definition
   *
   * Set up relations with other Tables/Views
   *
   * @template T - Relation definition type
   * @param fn - Function that receives a relation factory and returns relation definitions
   * @returns new ViewBuilder instance
   *
   * @example
   * ```typescript
   * const UserSummary = View("UserSummary")
   *   .query((db: MyDb) => db.user().select(...))
   *   .relations((r) => ({
   *     posts: r.foreignKeyTarget(Post, "author"),
   *   }));
   * ```
   *
   * @see {@link ForeignKeyBuilder} FK builder
   * @see {@link ForeignKeyTargetBuilder} FK reverse-reference builder
   */
  relations<T extends RelationBuilderRecord>(
    fn: (r: ReturnType<typeof createRelationFactory<this, keyof TData & string>>) => T,
  ): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, TRelations> {
    // Casting is unavoidable due to TypeScript generic type inference limitations
    // Resolves type mismatch between TRelations type parameter and newly created relation type T
    return new ViewBuilder({
      ...this.meta,
      relations: fn(createRelationFactory<this, keyof TData & string>(() => this)),
    }) as any;
  }
}

// ============================================
// View function
// ============================================

/**
 * View builder factory function
 *
 * Creates a ViewBuilder for defining View schema via Fluent API
 *
 * @param name - View name
 * @returns ViewBuilder instance
 *
 * @example
 * ```typescript
 * // Basic usage
 * const ActiveUsers = View("ActiveUsers")
 *   .database("mydb")
 *   .query((db: MyDb) =>
 *     db.user()
 *       .where(u => [expr.eq(u.status, "active")])
 *       .select(u => ({ id: u.id, name: u.name }))
 *   );
 *
 * // aggregation View
 * const UserStats = View("UserStats")
 *   .database("mydb")
 *   .query((db: MyDb) =>
 *     db.user()
 *       .groupBy(u => ({ status: u.status }))
 *       .select(u => ({
 *         status: u.status,
 *         count: expr.count(u.id),
 *       }))
 *   );
 * ```
 *
 * @see {@link ViewBuilder} builder class
 */
export function View(name: string) {
  return new ViewBuilder({ name });
}
