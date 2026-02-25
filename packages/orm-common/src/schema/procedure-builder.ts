import { type ColumnBuilderRecord, createColumnFactory } from "./factory/column-builder";

// ============================================
// ProcedureBuilder
// ============================================

/**
 * 저장 Procedure definition builder
 *
 * Fluent API를 통해 Procedure의 파라미터, return type, 본문을 definition
 * DbContext의 executable()과 함께 사용하여 type 안전한 Procedure 호출
 *
 * @template TParams - 파라미터 Column definition type
 * @template TReturns - return Column definition type
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
 * // DbContextused in
 * class MyDb extends DbContext {
 *   readonly getUserById = executable(this, GetUserById);
 * }
 *
 * // 호출
 * const users = await db.getUserById({ userId: 1n }).result();
 * ```
 *
 * @see {@link Procedure} factory function
 * @see {@link executable} Executable Generate
 */
export class ProcedureBuilder<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  /** 파라미터 definition (type for inference) */
  readonly $params!: TParams;
  /** return type definition (type for inference) */
  readonly $returns!: TReturns;

  /**
   * @param meta - Procedure Metadata
   * @param meta.name - Procedure 이름
   * @param meta.description - Procedure description (주석)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.params - 파라미터 definition
   * @param meta.returns - return type definition
   * @param meta.query - Procedure 본문 SQL
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
   * @param desc - Procedure description (DDL Comment으로 사용)
   * @returns new ProcedureBuilder instance
   */
  description(desc: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database set name
   *
   * @param db - Database 이름
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
   * @param schema - Schema 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns new ProcedureBuilder instance
   */
  schema(schema: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, schema });
  }

  /**
   * 파라미터 definition
   *
   * Procedure 입력 파라미터 definition
   * DBMS별 파라미터 문법 차이 주의 (MSSQL: @param, MySQL/PostgreSQL: param)
   *
   * @template T - 새 파라미터 definition type
   * @param fn - Column factory를 받아 파라미터 정의를 반환하는 function
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
   * return type definition
   *
   * Procedure return result Column definition
   *
   * @template T - 새 return type definition
   * @param fn - Column factory를 받아 return Column definition를 반환하는 function
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
   * Procedure 본문 SQL 설정
   *
   * DBMS별 SQL 문법 차이 주의:
   * - MySQL: 파라미터명 그대로 (userId)
   * - MSSQL: @ 접두사 (@userId)
   * - PostgreSQL: RETURN QUERY 필요
   *
   * @param sql - Procedure 본문 SQL
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
 * Procedure builder Generate factory function
 *
 * ProcedureBuilder를 생성하여 Fluent API로 저장 Procedure schema definition
 *
 * @param name - Procedure 이름
 * @returns ProcedureBuilder instance
 *
 * @example
 * ```typescript
 * // Basic 사용
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
 * // 파라미터 없는 Procedure
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
