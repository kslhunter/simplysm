import {
  type ColumnBuilderRecord,
  createColumnFactory,
  type InferColumns,
  type InferInsertColumns,
  type InferUpdateColumns,
} from "./factory/column-builder";
import { createIndexFactory, type IndexBuilder } from "./factory/index-builder";
import {
  createRelationFactory,
  type InferDeepRelations,
  type RelationBuilderRecord,
} from "./factory/relation-builder";

// ============================================
// TableBuilder
// ============================================

/**
 * 데이터베이스 테이블 정의 빌더
 *
 * Fluent API를 통해 테이블의 컬럼, PK, 인덱스, 관계를 정의
 * DbContext에서 queryable()과 함께 사용하여 타입 안전한 쿼리 작성
 *
 * @template TColumns - 컬럼 정의 레코드 타입
 * @template TRelations - 관계 정의 레코드 타입
 *
 * @example
 * ```typescript
 * // 테이블 정의
 * const User = Table("User")
 *   .database("mydb")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),
 *     name: c.varchar(100),
 *     email: c.varchar(200).nullable(),
 *     status: c.varchar(20).default("active"),
 *   }))
 *   .primaryKey("id")
 *   .indexes((i) => [i.index("email").unique()]);
 *
 * // DbContext에서 사용
 * class MyDb extends DbContext {
 *   readonly user = queryable(this, User);
 * }
 * ```
 *
 * @see {@link Table} 팩토리 함수
 * @see {@link queryable} Queryable 생성
 */
export class TableBuilder<
  TColumns extends ColumnBuilderRecord,
  TRelations extends RelationBuilderRecord,
> {
  /** 컬럼 정의 (타입 추론용) */
  readonly $columns!: TColumns;
  /** 관계 정의 (타입 추론용) */
  readonly $relations!: TRelations;

  /** 전체 타입 추론 (컬럼 + 관계) */
  readonly $infer!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  /** 컬럼만 타입 추론 */
  readonly $inferColumns!: InferColumns<TColumns>;
  /** INSERT용 타입 추론 (autoIncrement 제외, nullable/default는 optional) */
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  /** UPDATE용 타입 추론 (모든 필드 optional) */
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;

  /**
   * @param meta - 테이블 메타데이터
   * @param meta.name - 테이블 이름
   * @param meta.description - 테이블 설명 (주석)
   * @param meta.database - 데이터베이스 이름
   * @param meta.schema - 스키마 이름 (MSSQL/PostgreSQL)
   * @param meta.columns - 컬럼 정의
   * @param meta.primaryKey - PK 컬럼 배열
   * @param meta.relations - 관계 정의
   * @param meta.indexes - 인덱스 정의
   */
  constructor(
    readonly meta: {
      name: string;
      description?: string;
      database?: string;
      schema?: string;

      columns?: TColumns;
      primaryKey?: (keyof TColumns & string)[];
      relations?: TRelations;
      indexes?: IndexBuilder<(keyof TColumns & string)[]>[];
    },
  ) {}

  /**
   * 테이블 설명 설정
   *
   * @param desc - 테이블 설명 (DDL 주석으로 사용)
   * @returns 새 TableBuilder 인스턴스
   */
  description(desc: string) {
    return new TableBuilder({ ...this.meta, description: desc });
  }

  /**
   * 데이터베이스 이름 설정
   *
   * @param db - 데이터베이스 이름
   * @returns 새 TableBuilder 인스턴스
   *
   * @example
   * ```typescript
   * const User = Table("User").database("mydb");
   * ```
   */
  database(db: string) {
    return new TableBuilder({ ...this.meta, database: db });
  }

  /**
   * 스키마 이름 설정
   *
   * MSSQL, PostgreSQL에서 사용
   *
   * @param schema - 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns 새 TableBuilder 인스턴스
   *
   * @example
   * ```typescript
   * const User = Table("User")
   *   .database("mydb")
   *   .schema("custom_schema");
   * ```
   */
  schema(schema: string) {
    return new TableBuilder({ ...this.meta, schema });
  }

  /**
   * 컬럼 정의
   *
   * 컬럼 팩토리를 통해 타입 안전한 컬럼 정의
   *
   * @template TNewColumnDefs - 새 컬럼 정의 타입
   * @param fn - 컬럼 팩토리를 받아 컬럼 정의를 반환하는 함수
   * @returns 새 TableBuilder 인스턴스
   *
   * @example
   * ```typescript
   * const User = Table("User")
   *   .columns((c) => ({
   *     id: c.bigint().autoIncrement(),
   *     name: c.varchar(100),
   *     email: c.varchar(200).nullable(),
   *     createdAt: c.datetime().default("CURRENT_TIMESTAMP"),
   *   }));
   * ```
   */
  columns<TNewColumnDefs extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => TNewColumnDefs,
  ) {
    return new TableBuilder<TNewColumnDefs, TRelations>({
      ...this.meta,
      columns: fn(createColumnFactory()),
    });
  }

  /**
   * Primary Key 설정
   *
   * @param columns - PK를 구성할 컬럼 이름들 (복합 PK 가능)
   * @returns 새 TableBuilder 인스턴스
   *
   * @example
   * ```typescript
   * // 단일 PK
   * const User = Table("User")
   *   .columns((c) => ({ id: c.bigint() }))
   *   .primaryKey("id");
   *
   * // 복합 PK
   * const UserRole = Table("UserRole")
   *   .columns((c) => ({
   *     userId: c.bigint(),
   *     roleId: c.bigint(),
   *   }))
   *   .primaryKey("userId", "roleId");
   * ```
   */
  primaryKey(...columns: (keyof TColumns & string)[]) {
    return new TableBuilder({
      ...this.meta,
      primaryKey: columns,
    });
  }

  /**
   * 인덱스 정의
   *
   * @param fn - 인덱스 팩토리를 받아 인덱스 배열을 반환하는 함수
   * @returns 새 TableBuilder 인스턴스
   *
   * @example
   * ```typescript
   * const User = Table("User")
   *   .columns((c) => ({
   *     id: c.bigint(),
   *     email: c.varchar(200),
   *     name: c.varchar(100),
   *   }))
   *   .indexes((i) => [
   *     i.index("email").unique(),
   *     i.index("name").orderBy("ASC"),
   *   ]);
   * ```
   */
  indexes(
    fn: (
      i: ReturnType<typeof createIndexFactory<keyof TColumns & string>>,
    ) => IndexBuilder<string[]>[],
  ) {
    return new TableBuilder({
      ...this.meta,
      indexes: fn(createIndexFactory<keyof TColumns & string>()),
    });
  }

  /**
   * 관계 정의
   *
   * FK, 역참조 등 테이블 간 관계 설정
   *
   * @template T - 관계 정의 타입
   * @param fn - 관계 팩토리를 받아 관계 정의를 반환하는 함수
   * @returns 새 TableBuilder 인스턴스
   *
   * @example
   * ```typescript
   * const Post = Table("Post")
   *   .columns((c) => ({
   *     id: c.bigint().autoIncrement(),
   *     authorId: c.bigint(),
   *     title: c.varchar(200),
   *   }))
   *   .primaryKey("id")
   *   .relations((r) => ({
   *     // FK 관계 (N:1)
   *     author: r.foreignKey(["authorId"], () => User),
   *   }));
   *
   * const User = Table("User")
   *   .columns((c) => ({
   *     id: c.bigint().autoIncrement(),
   *     name: c.varchar(100),
   *   }))
   *   .primaryKey("id")
   *   .relations((r) => ({
   *     // 역참조 (1:N)
   *     posts: r.foreignKeyTarget(() => Post, "author"),
   *   }));
   * ```
   *
   * @see {@link ForeignKeyBuilder} FK 빌더
   * @see {@link ForeignKeyTargetBuilder} FK 역참조 빌더
   */
  relations<T extends RelationBuilderRecord>(
    fn: (r: ReturnType<typeof createRelationFactory<this, keyof TColumns & string>>) => T,
  ): TableBuilder<TColumns, T> {
    return new TableBuilder({
      ...this.meta,
      relations: fn(createRelationFactory<this, keyof TColumns & string>(() => this)),
    });
  }
}

// ============================================
// Table 함수
// ============================================

/**
 * 테이블 빌더 생성 팩토리 함수
 *
 * TableBuilder를 생성하여 Fluent API로 테이블 스키마 정의
 *
 * @param name - 테이블 이름
 * @returns TableBuilder 인스턴스
 *
 * @example
 * ```typescript
 * // 기본 사용
 * const User = Table("User")
 *   .database("mydb")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),
 *     name: c.varchar(100),
 *     email: c.varchar(200).nullable(),
 *   }))
 *   .primaryKey("id")
 *   .indexes((i) => [i.index("email").unique()]);
 *
 * // 관계 포함
 * const Post = Table("Post")
 *   .database("mydb")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),
 *     authorId: c.bigint(),
 *     title: c.varchar(200),
 *     content: c.text(),
 *   }))
 *   .primaryKey("id")
 *   .relations((r) => ({
 *     author: r.foreignKey(["authorId"], () => User),
 *   }));
 * ```
 *
 * @see {@link TableBuilder} 빌더 클래스
 */
export function Table(name: string) {
  return new TableBuilder({ name });
}
