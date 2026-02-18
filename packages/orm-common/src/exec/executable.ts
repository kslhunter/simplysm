import type { ColumnBuilderRecord, InferColumnExprs } from "../schema/factory/column-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { DbContextBase } from "../types/db-context-def";
import { ExprUnit } from "../expr/expr-unit";
import { expr } from "../expr/expr";

/**
 * 저장 프로시저 실행 래퍼 클래스
 *
 * ProcedureBuilder로 정의된 프로시저를 실행하기 위한 클래스.
 * DbContext에서 executable() 팩토리 함수를 통해 생성하여 사용한다.
 *
 * @template TParams - 프로시저 파라미터 타입
 * @template TReturns - 프로시저 반환 타입
 *
 * @example
 * ```typescript
 * // 프로시저 실행
 * const result = await db.getUserById().execute({ userId: 1n });
 * ```
 *
 * @see {@link executable} 팩토리 함수
 * @see {@link ProcedureBuilder} 프로시저 정의
 */
export class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(
    private readonly _db: DbContextBase,
    private readonly _builder: ProcedureBuilder<TParams, TReturns>,
  ) {}

  /**
   * 프로시저 실행 QueryDef 생성
   */
  getExecProcQueryDef(params?: InferColumnExprs<TParams>) {
    const meta = this._builder.meta;
    if (params && !meta.params) {
      throw new Error(`프로시저 '${meta.name}'에 파라미터가 없습니다.`);
    }

    return {
      type: "execProc" as const,
      procedure: {
        database: meta.database ?? this._db.database,
        schema: meta.schema ?? this._db.schema,
        name: meta.name,
      },
      params:
        params && meta.params
          ? Object.fromEntries(
              Object.keys(params).map((key) => [
                key,
                params[key] instanceof ExprUnit
                  ? params[key].expr
                  : expr.val(meta.params![key].meta.type, params[key]).expr,
              ]),
            )
          : undefined,
    };
  }

  /**
   * 프로시저 실행
   */
  async execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]> {
    return this._db.executeDefs<InferColumnExprs<TReturns>>([this.getExecProcQueryDef(params)]);
  }
}

// ============================================
// executable 함수
// ============================================

/**
 * Executable 생성 팩토리 함수
 *
 * DbContext에서 프로시저를 등록할 때 사용한다.
 * ProcedureBuilder로 정의된 프로시저를 Executable로 래핑하여 반환한다.
 *
 * @template TParams - 프로시저 파라미터 타입
 * @template TReturns - 프로시저 반환 타입
 * @param db - DbContext 인스턴스
 * @param builder - ProcedureBuilder 인스턴스
 * @returns Executable 생성 함수
 *
 * @example
 * ```typescript
 * // 프로시저 정의
 * const GetUserById = Procedure("GetUserById")
 *   .database("mydb")
 *   .params((c) => ({ userId: c.bigint() }))
 *   .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
 *   .body("SELECT id, name FROM User WHERE id = userId");
 *
 * // DbContext에서 등록
 * class MyDb extends DbContext {
 *   getUserById = executable(this, GetUserById);
 * }
 *
 * // 사용
 * const result = await db.getUserById().execute({ userId: 1n });
 * ```
 *
 * @see {@link Executable} 실행 클래스
 * @see {@link ProcedureBuilder} 프로시저 정의
 */
export function executable<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
>(
  db: DbContextBase,
  builder: ProcedureBuilder<TParams, TReturns>,
): () => Executable<TParams, TReturns> {
  return () => new Executable(db, builder);
}
