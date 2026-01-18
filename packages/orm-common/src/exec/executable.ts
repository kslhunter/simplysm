import type { ColumnBuilderRecord, InferColumnExprs } from "../schema/factory/column-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { DbContext } from "../db-context";
import { ExprUnit } from "../expr/expr-unit";
import { expr } from "../expr/expr";

export class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(
    private readonly _db: DbContext,
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
  async executeAsync(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]> {
    return this._db.executeDefsAsync<InferColumnExprs<TReturns>>([this.getExecProcQueryDef(params)]);
  }
}

// ============================================
// procedure 함수
// ============================================

export function executable<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
>(db: DbContext, builder: ProcedureBuilder<TParams, TReturns>): () => Executable<TParams, TReturns> {
  return () => new Executable(db, builder);
}
