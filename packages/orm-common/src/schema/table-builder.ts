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
 * Database Table definition builder
 *
 * Fluent API를 통해 Table의 column, PK, Index, 관계를 definition
 * DbContext에서 queryable()과 함께 사용하여 type 안전한 query 작성
 *
 * @template TColumns - Column definition record type
 * @template TRelations - relationship definition record type
 *
 * @example
 * ```typescript
 * // Table definition
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
 * // DbContextused in
 * class MyDb extends DbContext {
 *   readonly user = queryable(this, User);
 * }
 * ```
 *
 * @see {@link Table} factory function
 * @see {@link queryable} Queryable Generate
 */
export class TableBuilder<
  TColumns extends ColumnBuilderRecord,
  TRelations extends RelationBuilderRecord,
> {
  /** Column definition (type for inference) */
  readonly $columns!: TColumns;
  /** relationship definition (type for inference) */
  readonly $relations!: TRelations;

  /** 전체 Type inference (column + relationship) */
  readonly $infer!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  /** column만 Type inference */
  readonly $inferColumns!: InferColumns<TColumns>;
  /** INSERT용 Type inference (autoIncrement exclude, nullable/default는 optional) */
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  /** UPDATE용 Type inference (모든 field optional) */
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;

  /**
   * @param meta - Table Metadata
   * @param meta.name - Table 이름
   * @param meta.description - Table description (주석)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.columns - Column definition
   * @param meta.primaryKey - PK column array
   * @param meta.relations - relationship definition
   * @param meta.indexes - Index definition
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
   * Table set description
   *
   * @param desc - Table description (DDL Comment으로 사용)
   * @returns new TableBuilder instance
   */
  description(desc: string) {
    return new TableBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database set name
   *
   * @param db - Database 이름
   * @returns new TableBuilder instance
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
   * schema set name
   *
   * MSSQL, PostgreSQLused in
   *
   * @param schema - Schema 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns new TableBuilder instance
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
   * Column definition
   *
   * column factory를 통해 type 안전한 Column definition
   *
   * @template TNewColumnDefs - 새 Column definition type
   * @param fn - Column factory를 받아 Column definition를 반환하는 function
   * @returns new TableBuilder instance
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
   * @param columns - PK를 구성할 column name들 (복합 PK 가능)
   * @returns new TableBuilder instance
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
   * Index definition
   *
   * @param fn - Index factory를 받아 Index 배열을 반환하는 function
   * @returns new TableBuilder instance
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
   * relationship definition
   *
   * FK, 역참조 등 Table 간 relationship 설정
   *
   * @template T - relationship definition type
   * @param fn - relationship factory를 받아 relationship 정의를 반환하는 function
   * @returns new TableBuilder instance
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
   *     // FK relationship (N:1)
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
   * @see {@link ForeignKeyBuilder} FK builder
   * @see {@link ForeignKeyTargetBuilder} FK 역참조 builder
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
// Table function
// ============================================

/**
 * Table builder Generate factory function
 *
 * TableBuilder를 생성하여 Fluent API로 Table schema definition
 *
 * @param name - Table 이름
 * @returns TableBuilder instance
 *
 * @example
 * ```typescript
 * // Basic 사용
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
 * // relationship include
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
 * @see {@link TableBuilder} builder class
 */
export function Table(name: string) {
  return new TableBuilder({ name });
}
