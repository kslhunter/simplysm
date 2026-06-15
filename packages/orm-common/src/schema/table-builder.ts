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
 * Database Table 정의 builder
 *
 * Fluent API로 Table column, PK, index, 관계를 정의
 * DbContext의 queryable()과 함께 사용하여 타입 안전한 query 구성
 *
 * @template TColumns - Column 정의 레코드 타입
 * @template TRelations - 관계 정의 레코드 타입
 *
 * @see {@link Table} factory 함수
 * @see {@link queryable} Queryable 생성
 */
export class TableBuilder<
  TName extends string,
  TColumns extends ColumnBuilderRecord,
  TRelations extends RelationBuilderRecord,
> {
  /** Column 정의 (타입 추론용) */
  readonly $columns!: TColumns;
  /** 관계 정의 (타입 추론용) */
  readonly $relations!: TRelations;

  /** 전체 타입 추론 (column + 관계) — 순환 감지: 같은 테이블 재방문 시 끊김 */
  readonly $inferSelect!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  /** Column 전용 타입 추론 */
  readonly $inferColumns!: InferColumns<TColumns>;
  /** INSERT 타입 추론 (autoIncrement 제외, nullable/default는 optional) */
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  /** UPDATE 타입 추론 (모든 필드 optional) */
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;

  /**
   * @param meta - Table 메타데이터
   * @param meta.name - Table 이름
   * @param meta.description - Table 설명 (comment)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.columns - Column 정의
   * @param meta.primaryKey - PK column 배열
   * @param meta.relations - 관계 정의
   * @param meta.indexes - Index 정의
   */
  constructor(
    readonly meta: {
      name: TName;
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
   * Table 설명 설정
   *
   * @param desc - Table 설명 (DDL Comment로 사용됨)
   * @returns 새 TableBuilder 인스턴스
   */
  description(desc: string): TableBuilder<TName, TColumns, TRelations> {
    return new TableBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database 이름 설정
   *
   * @param db - Database 이름
   * @returns 새 TableBuilder 인스턴스
   */
  database(db: string): TableBuilder<TName, TColumns, TRelations> {
    return new TableBuilder({ ...this.meta, database: db });
  }

  /**
   * Schema 이름 설정
   *
   * MSSQL, PostgreSQL에서 사용
   *
   * @param schema - Schema 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns 새 TableBuilder 인스턴스
   */
  schema(schema: string): TableBuilder<TName, TColumns, TRelations> {
    return new TableBuilder({ ...this.meta, schema });
  }

  /**
   * Column 정의
   *
   * Column factory를 통한 타입 안전한 column 정의
   *
   * @template TNewColumnDefs - 새 Column 정의 타입
   * @param fn - Column factory를 받아 column 정의를 반환하는 함수
   * @returns 새 TableBuilder 인스턴스
   */
  columns<TNewColumnDefs extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => TNewColumnDefs,
  ): TableBuilder<TName, TNewColumnDefs, TRelations> {
    return new TableBuilder<TName, TNewColumnDefs, TRelations>({
      ...this.meta,
      columns: fn(createColumnFactory()),
    });
  }

  /**
   * Primary Key 설정
   *
   * @param columns - PK를 구성하는 column 이름 (복합 PK 지원)
   * @returns 새 TableBuilder 인스턴스
   */
  primaryKey(...columns: (keyof TColumns & string)[]): TableBuilder<TName, TColumns, TRelations> {
    return new TableBuilder({
      ...this.meta,
      primaryKey: columns,
    });
  }

  /**
   * Index 정의
   *
   * @param fn - Index factory를 받아 index 배열을 반환하는 함수
   * @returns 새 TableBuilder 인스턴스
   */
  indexes(
    fn: (
      i: ReturnType<typeof createIndexFactory<keyof TColumns & string>>,
    ) => IndexBuilder<string[]>[],
  ): TableBuilder<TName, TColumns, TRelations> {
    return new TableBuilder({
      ...this.meta,
      indexes: fn(createIndexFactory<keyof TColumns & string>()),
    });
  }

  /**
   * 관계 정의
   *
   * FK, 역참조 등 Table 간 관계를 설정
   *
   * @template T - 관계 정의 타입
   * @param fn - 관계 factory를 받아 관계 정의를 반환하는 함수
   * @returns 새 TableBuilder 인스턴스
   *
   * @see {@link ForeignKeyBuilder} FK builder
   * @see {@link ForeignKeyTargetBuilder} FK reverse-reference builder
   */
  relations<T extends RelationBuilderRecord>(
    fn: (r: ReturnType<typeof createRelationFactory<this, keyof TColumns & string>>) => T,
  ): TableBuilder<TName, TColumns, T> {
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
 * Table builder factory 함수
 *
 * Fluent API로 Table schema를 정의하기 위한 TableBuilder를 생성
 *
 * @param name - Table 이름
 * @returns TableBuilder 인스턴스
 *
 * @see {@link TableBuilder} builder 클래스
 */
export function Table<TName extends string>(name: TName) {
  return new TableBuilder<TName, ColumnBuilderRecord, RelationBuilderRecord>({ name });
}
