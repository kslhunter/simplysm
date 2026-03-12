import { type ColumnBuilderRecord, createColumnFactory } from "./factory/column-builder";

// ============================================
// ProcedureBuilder
// ============================================

/**
 * Stored Procedure definition builder
 *
 * Define Procedure parameters, return type, and body via Fluent API
 * Use with DbContext's executable() for type-safe Procedure invocation
 *
 * @template TParams - Parameter Column definition type
 * @template TReturns - Return Column definition type
 *
 * @example
 * ```typescript
 * // Procedure definition
 * const GetUserById = Procedure("GetUserById")
 *   .database("mydb")
 *   .params((c) => ({
 *     userId: c.bigint(),
 *   }))
 *   .returns((c) => ({
 *     id: c.bigint(),
 *     name: c.varchar(100),
 *     email: c.varchar(200),
 *   }))
 *   .body("SELECT id, name, email FROM User WHERE id = userId");
 *
 * // Used in DbContext
 * class MyDb extends DbContext {
 *   readonly getUserById = executable(this, GetUserById);
 * }
 *
 * // Invocation
 * const users = await db.getUserById({ userId: 1n }).execute();
 * ```
 *
 * @see {@link Procedure} factory function
 * @see {@link executable} Executable Generate
 */
export class ProcedureBuilder<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  /** Parameter definition (type for inference) */
  readonly $params!: TParams;
  /** return type definition (type for inference) */
  readonly $returns!: TReturns;

  /**
   * @param meta - Procedure Metadata
   * @param meta.name - Procedure name
   * @param meta.description - Procedure description (comment)
   * @param meta.database - Database name
   * @param meta.schema - Schema name (MSSQL/PostgreSQL)
   * @param meta.params - Parameter definition
   * @param meta.returns - Return type definition
   * @param meta.query - Procedure body SQL
   */
  constructor(
    readonly meta: {
      name: string;
      description?: string;
      database?: string;
      schema?: string;
      params?: TParams;
      returns?: TReturns;
      query?: string;
    },
  ) {}

  /**
   * Procedure set description
   *
   * @param desc - Procedure description (used as DDL Comment)
   * @returns new ProcedureBuilder instance
   */
  description(desc: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database set name
   *
   * @param db - Database name
   * @returns new ProcedureBuilder instance
   *
   * @example
   * ```typescript
   * const GetUser = Procedure("GetUser").database("mydb");
   * ```
   */
  database(db: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, database: db });
  }

  /**
   * schema set name
   *
   * MSSQL, PostgreSQLused in
   *
   * @param schema - Schema name (MSSQL: dbo, PostgreSQL: public)
   * @returns new ProcedureBuilder instance
   */
  schema(schema: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, schema });
  }

  /**
   * Parameter definition
   *
   * Define Procedure input parameters
   * Note DBMS-specific parameter syntax differences (MSSQL: @param, MySQL/PostgreSQL: param)
   *
   * @template T - New parameter definition type
   * @param fn - Function that receives a Column factory and returns parameter definitions
   * @returns new ProcedureBuilder instance
   *
   * @example
   * ```typescript
   * const GetUserById = Procedure("GetUserById")
   *   .params((c) => ({
   *     userId: c.bigint(),
   *     includeDeleted: c.boolean().default(false),
   *   }));
   * ```
   */
  params<T extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => T,
  ): ProcedureBuilder<T, TReturns> {
    return new ProcedureBuilder({ ...this.meta, params: fn(createColumnFactory()) });
  }

  /**
   * Return type definition
   *
   * Define Procedure return result columns
   *
   * @template T - New return type definition
   * @param fn - Function that receives a Column factory and returns Column definitions
   * @returns new ProcedureBuilder instance
   *
   * @example
   * ```typescript
   * const GetUserById = Procedure("GetUserById")
   *   .params((c) => ({ userId: c.bigint() }))
   *   .returns((c) => ({
   *     id: c.bigint(),
   *     name: c.varchar(100),
   *     email: c.varchar(200).nullable(),
   *   }));
   * ```
   */
  returns<T extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => T,
  ): ProcedureBuilder<TParams, T> {
    return new ProcedureBuilder({ ...this.meta, returns: fn(createColumnFactory()) });
  }

  /**
   * Set Procedure body SQL
   *
   * Note DBMS-specific SQL syntax differences:
   * - MySQL: parameter name as-is (userId)
   * - MSSQL: @ prefix (@userId)
   * - PostgreSQL: RETURN QUERY required
   *
   * @param sql - Procedure body SQL
   * @returns new ProcedureBuilder instance
   *
   * @example
   * ```typescript
   * // MySQL/PostgreSQL
   * const GetUser = Procedure("GetUser")
   *   .params((c) => ({ userId: c.bigint() }))
   *   .body("SELECT * FROM User WHERE id = userId");
   *
   * // MSSQL
   * const GetUser = Procedure("GetUser")
   *   .params((c) => ({ userId: c.bigint() }))
   *   .body("SELECT * FROM [User] WHERE id = @userId");
   * ```
   */
  body(sql: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, query: sql });
  }
}

// ============================================
// Procedure function
// ============================================

/**
 * Procedure builder factory function
 *
 * Creates a ProcedureBuilder for defining stored Procedure schema via Fluent API
 *
 * @param name - Procedure name
 * @returns ProcedureBuilder instance
 *
 * @example
 * ```typescript
 * // Basic usage
 * const GetUserById = Procedure("GetUserById")
 *   .database("mydb")
 *   .params((c) => ({
 *     userId: c.bigint(),
 *   }))
 *   .returns((c) => ({
 *     id: c.bigint(),
 *     name: c.varchar(100),
 *     email: c.varchar(200),
 *   }))
 *   .body("SELECT id, name, email FROM User WHERE id = userId");
 *
 * // Procedure without parameters
 * const GetAllActiveUsers = Procedure("GetAllActiveUsers")
 *   .database("mydb")
 *   .returns((c) => ({
 *     id: c.bigint(),
 *     name: c.varchar(100),
 *   }))
 *   .body("SELECT id, name FROM User WHERE status = 'active'");
 * ```
 *
 * @see {@link ProcedureBuilder} builder class
 */
export function Procedure(name: string): ProcedureBuilder<never, never> {
  return new ProcedureBuilder({ name });
}
