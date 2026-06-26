import type { DbContextBase } from "../types/db-context-def";
import type { Queryable } from "../exec/queryable";
import type { DataRecord } from "../types/db";
import {
  createRelationFactory,
  type InferDeepRelations,
  type ViewRelationFactory,
} from "./factory/relation-builder";

// ============================================
// ViewBuilder
// ============================================

/**
 * Database View 정의 builder
 *
 * Fluent API로 View query를 정의
 * DbContext의 queryable()과 함께 사용하여 타입 안전한 query 구성
 *
 * 관계는 `.relations((r) => ({ ... }))` 메서드 체이닝으로 정의한다(RelationKey만 사용 가능).
 * 관계를 잡는 4번째 제네릭 `TRelations` 는 **무제약**이라 TS6 순환을 회피한다.
 *
 * @template TDbContext - DbContext 타입
 * @template TName - View 이름
 * @template TData - View 데이터 레코드 타입
 * @template TRelations - 관계 정의 레코드 타입 (무제약, 기본값 `{}`)
 *
 * @see {@link View} factory 함수
 * @see {@link queryable} Queryable 생성
 */
export class ViewBuilder<
  TDbContext extends DbContextBase,
  TName extends string,
  TData extends DataRecord,
  TRelations = {},
> {
  /**
   * 전체 타입 추론 (column + 관계).
   *
   * 관계는 `TRelations` 를 구조적으로 lazy walk 하여 다단계로 해소된다.
   */
  readonly $inferSelect!: TData & InferDeepRelations<TRelations>;

  /**
   * @param meta - View 메타데이터
   * @param meta.name - View 이름
   * @param meta.description - View 설명 (comment)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.viewFn - View query 정의 함수
   * @param meta.relations - 관계 정의 (런타임: `.relations(fn)` 호출 시 부착됨)
   */
  constructor(
    readonly meta: {
      name: TName;
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
  description(desc: string): ViewBuilder<TDbContext, TName, TData, TRelations> {
    return new ViewBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database 이름 설정
   *
   * @param db - Database 이름
   * @returns 새 ViewBuilder 인스턴스
   */
  database(db: string): ViewBuilder<TDbContext, TName, TData, TRelations> {
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
  schema(schema: string): ViewBuilder<TDbContext, TName, TData, TRelations> {
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
   */
  query<TViewData extends DataRecord, TDb extends DbContextBase>(
    viewFn: (db: TDb) => Queryable<TViewData, any>,
  ): ViewBuilder<TDb, TName, TViewData, TRelations> {
    return new ViewBuilder({ ...this.meta, viewFn });
  }

  /**
   * 관계 정의 (RelationKey / RelationKeyTarget 만 사용 가능)
   *
   * 관계 타입 `T` 는 **무제약**으로 추론되며, 내부적으로 런타임 결과를
   * `meta.relations` 에 저장한다(`as any`). TS6 순환 회피.
   *
   * @template T - 관계 정의 레코드 타입 (무제약)
   * @param fn - 관계 factory를 받아 관계 정의를 반환하는 함수
   * @returns 관계가 부착된 새 ViewBuilder 인스턴스
   */
  relations<T>(
    fn: (r: ViewRelationFactory<keyof TData & string>) => T,
  ): ViewBuilder<TDbContext, TName, TData, T> {
    return new ViewBuilder<TDbContext, TName, TData, T>({
      ...this.meta,
      relations: fn(createRelationFactory<keyof TData & string>()),
    });
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
 * @see {@link ViewBuilder} builder 클래스
 */
export function View<TName extends string>(name: TName) {
  return new ViewBuilder<DbContextBase, TName, DataRecord, {}>({ name });
}
