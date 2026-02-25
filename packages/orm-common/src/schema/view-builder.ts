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
 * Fluent API를 통해 View의 query, 관계를 definition
 * DbContext에서 queryable()과 함께 사용하여 type 안전한 query 작성
 *
 * @template TDbContext - DbContext type
 * @template TData - View data record type
 * @template TRelations - relationship definition record type
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
 * // DbContextused in
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
  /** relationship definition (type for inference) */
  readonly $relations!: TRelations;
  /** 전체 Type inference */
  readonly $infer!: TData;

  /**
   * @param meta - View Metadata
   * @param meta.name - View 이름
   * @param meta.description - View description (주석)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.viewFn - View Query definition function
   * @param meta.relations - relationship definition
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
   * @param desc - View description (DDL Comment으로 사용)
   * @returns new ViewBuilder instance
   */
  description(desc: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database set name
   *
   * @param db - Database 이름
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
   * MSSQL, PostgreSQLused in
   *
   * @param schema - Schema 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns new ViewBuilder instance
   */
  schema(schema: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, schema });
  }

  /**
   * View Query definition
   *
   * SELECT query를 통해 View의 data 소스 definition
   *
   * @template TViewData - View data type
   * @template TDb - DbContext type
   * @param viewFn - DbContext를 받아 Queryable을 반환하는 function
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
   * relationship definition
   *
   * 다른 Table/View와의 relationship 설정
   *
   * @template T - relationship definition type
   * @param fn - relationship factory를 받아 relationship 정의를 반환하는 function
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
   * @see {@link ForeignKeyTargetBuilder} FK 역참조 builder
   */
  relations<T extends RelationBuilderRecord>(
    fn: (r: ReturnType<typeof createRelationFactory<this, keyof TData & string>>) => T,
  ): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, TRelations> {
    // TypeScript의 generic Type inference 한계로 인해 캐스팅 불가피
    // TRelations type 파라미터와 새로 생성되는 relationship type T 간의 type 불일치 해결
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
 * View builder Generate factory function
 *
 * ViewBuilder를 생성하여 Fluent API로 View schema definition
 *
 * @param name - View 이름
 * @returns ViewBuilder instance
 *
 * @example
 * ```typescript
 * // Basic 사용
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
