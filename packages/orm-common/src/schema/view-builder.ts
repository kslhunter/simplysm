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
 * Database View 정의 builder
 *
 * Fluent API로 View query와 관계를 정의
 * DbContext의 queryable()과 함께 사용하여 타입 안전한 query 구성
 *
 * @template TDbContext - DbContext 타입
 * @template TData - View 데이터 레코드 타입
 * @template TRelations - 관계 정의 레코드 타입
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
 * @see {@link View} factory 함수
 * @see {@link queryable} Queryable 생성
 */
export class ViewBuilder<
  TDbContext extends DbContextBase,
  TData extends DataRecord,
  TRelations extends RelationBuilderRecord,
> {
  /** 관계 정의 (타입 추론용) */
  readonly $relations!: TRelations;
  /** 전체 타입 추론 */
  readonly $inferSelect!: TData;

  /**
   * @param meta - View 메타데이터
   * @param meta.name - View 이름
   * @param meta.description - View 설명 (comment)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.viewFn - View query 정의 함수
   * @param meta.relations - 관계 정의
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
   * View 설명 설정
   *
   * @param desc - View 설명 (DDL Comment로 사용됨)
   * @returns 새 ViewBuilder 인스턴스
   */
  description(desc: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database 이름 설정
   *
   * @param db - Database 이름
   * @returns 새 ViewBuilder 인스턴스
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
   * Schema 이름 설정
   *
   * MSSQL, PostgreSQL에서 사용
   *
   * @param schema - Schema 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns 새 ViewBuilder 인스턴스
   */
  schema(schema: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, schema });
  }

  /**
   * View query 정의
   *
   * SELECT query를 통해 View의 데이터 소스를 정의
   *
   * @template TViewData - View 데이터 타입
   * @template TDb - DbContext 타입
   * @param viewFn - DbContext를 받아 Queryable을 반환하는 함수
   * @returns 새 ViewBuilder 인스턴스
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
   * 관계 정의
   *
   * 다른 Table/View와의 관계를 설정
   *
   * @template T - 관계 정의 타입
   * @param fn - 관계 factory를 받아 관계 정의를 반환하는 함수
   * @returns 새 ViewBuilder 인스턴스
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
  ): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, T> {
    return new ViewBuilder({
      ...this.meta,
      relations: fn(createRelationFactory<this, keyof TData & string>(() => this)),
    }) as any;
  }
}

// ============================================
// View 함수
// ============================================

/**
 * View builder factory 함수
 *
 * Fluent API로 View schema를 정의하기 위한 ViewBuilder를 생성
 *
 * @param name - View 이름
 * @returns ViewBuilder 인스턴스
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
 * // 집계 View
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
 * @see {@link ViewBuilder} builder 클래스
 */
export function View(name: string) {
  return new ViewBuilder({ name });
}
