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
 * Define Table columns, PK, indexes, and relations via Fluent API
 * Use with DbContext's queryable() for type-safe query composition
 *
 * @template TColumns - Column definition record type
 * @template TRelations - Relation definition record type
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
 * // Used in DbContext
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
  /** Relation definition (type for inference) */
  readonly $relations!: TRelations;

  /** Full Type inference (column + relation) */
  readonly $inferSelect!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  /** Column-only Type inference */
  readonly $inferColumns!: InferColumns<TColumns>;
  /** INSERT Type inference (autoIncrement excluded, nullable/default are optional) */
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  /** UPDATE Type inference (all fields optional) */
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;

  /**
   * @param meta - Table Metadata
   * @param meta.name - Table name
   * @param meta.description - Table description (comment)
   * @param meta.database - Database name
   * @param meta.schema - Schema name (MSSQL/PostgreSQL)
   * @param meta.columns - Column definition
   * @param meta.primaryKey - PK column array
   * @param meta.relations - Relation definition
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
   * @param desc - Table description (used as DDL Comment)
   * @returns new TableBuilder instance
   */
  description(desc: string) {
    return new TableBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database set name
   *
   * @param db - Database name
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
   * Used in MSSQL, PostgreSQL
   *
   * @param schema - Schema name (MSSQL: dbo, PostgreSQL: public)
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
   * Type-safe Column definition through column factory
   *
   * @template TNewColumnDefs - New Column definition type
   * @param fn - Function that receives a Column factory and returns Column definitions
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
   * Primary Key configuration
   *
   * @param columns - Column names composing the PK (composite PK supported)
   * @returns new TableBuilder instance
   *
   * @example
   * ```typescript
   * // Single PK
   * const User = Table("User")
   *   .columns((c) => ({ id: c.bigint() }))
   *   .primaryKey("id");
   *
   * // Composite PK
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
   * @param fn - Function that receives an Index factory and returns an Index array
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
   * Relation definition
   *
   * Set up FK, reverse-references, and other inter-Table relations
   *
   * @template T - Relation definition type
   * @param fn - Function that receives a relation factory and returns relation definitions
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
   *     // FK relation (N:1)
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
   *     // Reverse-reference (1:N)
   *     posts: r.foreignKeyTarget(() => Post, "author"),
   *   }));
   * ```
   *
   * @see {@link ForeignKeyBuilder} FK builder
   * @see {@link ForeignKeyTargetBuilder} FK reverse-reference builder
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
 * Table builder factory function
 *
 * Creates a TableBuilder for defining Table schema via Fluent API
 *
 * @param name - Table name
 * @returns TableBuilder instance
 *
 * @example
 * ```typescript
 * // Basic usage
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
 * // With relations
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
