import { type ColumnBuilderRecord, createColumnFactory } from "./factory/column-builder";

// ============================================
// ProcedureBuilder
// ============================================

/**
 * Stored Procedure 정의 builder
 *
 * Fluent API로 Procedure 파라미터, 반환 타입, 본문을 정의
 * DbContext의 executable()과 함께 사용하여 타입 안전한 Procedure 호출
 *
 * @template TParams - 파라미터 Column 정의 타입
 * @template TReturns - 반환 Column 정의 타입
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
 * @see {@link Procedure} factory 함수
 * @see {@link executable} Executable 생성
 */
export class ProcedureBuilder<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  /** 파라미터 정의 (타입 추론용) */
  readonly $params!: TParams;
  /** 반환 타입 정의 (타입 추론용) */
  readonly $returns!: TReturns;

  /**
   * @param meta - Procedure 메타데이터
   * @param meta.name - Procedure 이름
   * @param meta.description - Procedure 설명 (comment)
   * @param meta.database - Database 이름
   * @param meta.schema - Schema 이름 (MSSQL/PostgreSQL)
   * @param meta.params - 파라미터 정의
   * @param meta.returns - 반환 타입 정의
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
   * Procedure 설명 설정
   *
   * @param desc - Procedure 설명 (DDL Comment로 사용됨)
   * @returns 새 ProcedureBuilder 인스턴스
   */
  description(desc: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, description: desc });
  }

  /**
   * Database 이름 설정
   *
   * @param db - Database 이름
   * @returns 새 ProcedureBuilder 인스턴스
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
   * Schema 이름 설정
   *
   * MSSQL, PostgreSQL에서 사용
   *
   * @param schema - Schema 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns 새 ProcedureBuilder 인스턴스
   */
  schema(schema: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, schema });
  }

  /**
   * 파라미터 정의
   *
   * Procedure 입력 파라미터를 정의
   * DBMS별 파라미터 구문 차이에 주의 (MSSQL: @param, MySQL/PostgreSQL: param)
   *
   * @template T - 새 파라미터 정의 타입
   * @param fn - Column factory를 받아 파라미터 정의를 반환하는 함수
   * @returns 새 ProcedureBuilder 인스턴스
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
   * 반환 타입 정의
   *
   * Procedure 반환 결과 column을 정의
   *
   * @template T - 새 반환 타입 정의
   * @param fn - Column factory를 받아 column 정의를 반환하는 함수
   * @returns 새 ProcedureBuilder 인스턴스
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
   * DBMS별 SQL 구문 차이에 주의:
   * - MySQL: 파라미터 이름 그대로 (userId)
   * - MSSQL: @ 접두사 (@userId)
   * - PostgreSQL: RETURN QUERY 필요
   *
   * @param sql - Procedure 본문 SQL
   * @returns 새 ProcedureBuilder 인스턴스
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
// Procedure 함수
// ============================================

/**
 * Procedure builder factory 함수
 *
 * Fluent API로 stored Procedure schema를 정의하기 위한 ProcedureBuilder를 생성
 *
 * @param name - Procedure 이름
 * @returns ProcedureBuilder 인스턴스
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
 * @see {@link ProcedureBuilder} builder 클래스
 */
export function Procedure(name: string): ProcedureBuilder<never, never> {
  return new ProcedureBuilder({ name });
}
