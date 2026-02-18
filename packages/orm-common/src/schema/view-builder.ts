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
 * 데이터베이스 뷰 정의 빌더
 *
 * Fluent API를 통해 뷰의 쿼리, 관계를 정의
 * DbContext에서 queryable()과 함께 사용하여 타입 안전한 쿼리 작성
 *
 * @template TDbContext - DbContext 타입
 * @template TData - 뷰 데이터 레코드 타입
 * @template TRelations - 관계 정의 레코드 타입
 *
 * @example
 * ```typescript
 * // 뷰 정의
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
 * // DbContext에서 사용
 * class MyDb extends DbContext {
 *   readonly userSummary = queryable(this, UserSummary);
 * }
 * ```
 *
 * @see {@link View} 팩토리 함수
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
  readonly $infer!: TData;

  /**
   * @param meta - 뷰 메타데이터
   * @param meta.name - 뷰 이름
   * @param meta.description - 뷰 설명 (주석)
   * @param meta.database - 데이터베이스 이름
   * @param meta.schema - 스키마 이름 (MSSQL/PostgreSQL)
   * @param meta.viewFn - 뷰 쿼리 정의 함수
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
   * 뷰 설명 설정
   *
   * @param desc - 뷰 설명 (DDL 주석으로 사용)
   * @returns 새 ViewBuilder 인스턴스
   */
  description(desc: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, description: desc });
  }

  /**
   * 데이터베이스 이름 설정
   *
   * @param db - 데이터베이스 이름
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
   * 스키마 이름 설정
   *
   * MSSQL, PostgreSQL에서 사용
   *
   * @param schema - 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns 새 ViewBuilder 인스턴스
   */
  schema(schema: string): ViewBuilder<TDbContext, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, schema });
  }

  /**
   * 뷰 쿼리 정의
   *
   * SELECT 쿼리를 통해 뷰의 데이터 소스 정의
   *
   * @template TViewData - 뷰 데이터 타입
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
   * 다른 테이블/뷰와의 관계 설정
   *
   * @template T - 관계 정의 타입
   * @param fn - 관계 팩토리를 받아 관계 정의를 반환하는 함수
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
   * @see {@link ForeignKeyBuilder} FK 빌더
   * @see {@link ForeignKeyTargetBuilder} FK 역참조 빌더
   */
  relations<T extends RelationBuilderRecord>(
    fn: (r: ReturnType<typeof createRelationFactory<this, keyof TData & string>>) => T,
  ): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, TRelations> {
    // TypeScript의 제네릭 타입 추론 한계로 인해 캐스팅 불가피
    // TRelations 타입 파라미터와 새로 생성되는 관계 타입 T 간의 타입 불일치 해결
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
 * 뷰 빌더 생성 팩토리 함수
 *
 * ViewBuilder를 생성하여 Fluent API로 뷰 스키마 정의
 *
 * @param name - 뷰 이름
 * @returns ViewBuilder 인스턴스
 *
 * @example
 * ```typescript
 * // 기본 사용
 * const ActiveUsers = View("ActiveUsers")
 *   .database("mydb")
 *   .query((db: MyDb) =>
 *     db.user()
 *       .where(u => [expr.eq(u.status, "active")])
 *       .select(u => ({ id: u.id, name: u.name }))
 *   );
 *
 * // 집계 뷰
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
 * @see {@link ViewBuilder} 빌더 클래스
 */
export function View(name: string) {
  return new ViewBuilder({ name });
}
