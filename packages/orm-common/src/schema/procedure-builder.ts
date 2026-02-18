import { type ColumnBuilderRecord, createColumnFactory } from "./factory/column-builder";

// ============================================
// ProcedureBuilder
// ============================================

/**
 * 저장 프로시저 정의 빌더
 *
 * Fluent API를 통해 프로시저의 파라미터, 반환 타입, 본문을 정의
 * DbContext의 executable()과 함께 사용하여 타입 안전한 프로시저 호출
 *
 * @template TParams - 파라미터 컬럼 정의 타입
 * @template TReturns - 반환 컬럼 정의 타입
 *
 * @example
 * ```typescript
 * // 프로시저 정의
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
 * // DbContext에서 사용
 * class MyDb extends DbContext {
 *   readonly getUserById = executable(this, GetUserById);
 * }
 *
 * // 호출
 * const users = await db.getUserById({ userId: 1n }).result();
 * ```
 *
 * @see {@link Procedure} 팩토리 함수
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
   * @param meta - 프로시저 메타데이터
   * @param meta.name - 프로시저 이름
   * @param meta.description - 프로시저 설명 (주석)
   * @param meta.database - 데이터베이스 이름
   * @param meta.schema - 스키마 이름 (MSSQL/PostgreSQL)
   * @param meta.params - 파라미터 정의
   * @param meta.returns - 반환 타입 정의
   * @param meta.query - 프로시저 본문 SQL
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
   * 프로시저 설명 설정
   *
   * @param desc - 프로시저 설명 (DDL 주석으로 사용)
   * @returns 새 ProcedureBuilder 인스턴스
   */
  description(desc: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, description: desc });
  }

  /**
   * 데이터베이스 이름 설정
   *
   * @param db - 데이터베이스 이름
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
   * 스키마 이름 설정
   *
   * MSSQL, PostgreSQL에서 사용
   *
   * @param schema - 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
   * @returns 새 ProcedureBuilder 인스턴스
   */
  schema(schema: string): ProcedureBuilder<TParams, TReturns> {
    return new ProcedureBuilder({ ...this.meta, schema });
  }

  /**
   * 파라미터 정의
   *
   * 프로시저 입력 파라미터 정의
   * DBMS별 파라미터 문법 차이 주의 (MSSQL: @param, MySQL/PostgreSQL: param)
   *
   * @template T - 새 파라미터 정의 타입
   * @param fn - 컬럼 팩토리를 받아 파라미터 정의를 반환하는 함수
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
   * 프로시저 반환 결과 컬럼 정의
   *
   * @template T - 새 반환 타입 정의
   * @param fn - 컬럼 팩토리를 받아 반환 컬럼 정의를 반환하는 함수
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
   * 프로시저 본문 SQL 설정
   *
   * DBMS별 SQL 문법 차이 주의:
   * - MySQL: 파라미터명 그대로 (userId)
   * - MSSQL: @ 접두사 (@userId)
   * - PostgreSQL: RETURN QUERY 필요
   *
   * @param sql - 프로시저 본문 SQL
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
 * 프로시저 빌더 생성 팩토리 함수
 *
 * ProcedureBuilder를 생성하여 Fluent API로 저장 프로시저 스키마 정의
 *
 * @param name - 프로시저 이름
 * @returns ProcedureBuilder 인스턴스
 *
 * @example
 * ```typescript
 * // 기본 사용
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
 * // 파라미터 없는 프로시저
 * const GetAllActiveUsers = Procedure("GetAllActiveUsers")
 *   .database("mydb")
 *   .returns((c) => ({
 *     id: c.bigint(),
 *     name: c.varchar(100),
 *   }))
 *   .body("SELECT id, name FROM User WHERE status = 'active'");
 * ```
 *
 * @see {@link ProcedureBuilder} 빌더 클래스
 */
export function Procedure(name: string): ProcedureBuilder<never, never> {
  return new ProcedureBuilder({ name });
}
