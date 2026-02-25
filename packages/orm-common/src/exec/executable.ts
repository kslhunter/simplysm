import type { ColumnBuilderRecord, InferColumnExprs } from "../schema/factory/column-builder";
import type { ProcedureBuilder } from "../schema/procedure-builder";
import type { DbContextBase } from "../types/db-context-def";
import { ExprUnit } from "../expr/expr-unit";
import { expr } from "../expr/expr";

/**
 * Stored procedure execution wrapper class
 *
 * Class for executing procedures defined by ProcedureBuilder.
 * Created and used through the executable() factory function in DbContext.
 *
 * @template TParams - Procedure parameter type
 * @template TReturns - Procedure return type
 *
 * @example
 * ```typescript
 * // Execute procedure
 * const result = await db.getUserById().execute({ userId: 1n });
 * ```
 *
 * @see {@link executable} Factory function
 * @see {@link ProcedureBuilder} Procedure definition
 */
export class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(
    private readonly _db: DbContextBase,
    private readonly _builder: ProcedureBuilder<TParams, TReturns>,
  ) {}

  /**
   * Generate procedure execution QueryDef
   */
  getExecProcQueryDef(params?: InferColumnExprs<TParams>) {
    const meta = this._builder.meta;
    if (params && !meta.params) {
      throw new Error(`Procedure '${meta.name}' has no parameters.`);
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
   * Execute procedure
   */
  async execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]> {
    return this._db.executeDefs<InferColumnExprs<TReturns>>([this.getExecProcQueryDef(params)]);
  }
}

// ============================================
// executable function
// ============================================

/**
 * Factory function to create Executable
 *
 * Used when registering procedures in DbContext.
 * Wraps procedures defined by ProcedureBuilder and returns them as Executable.
 *
 * @template TParams - Procedure parameter type
 * @template TReturns - Procedure return type
 * @param db - DbContext instance
 * @param builder - ProcedureBuilder instance
 * @returns Executable factory function
 *
 * @example
 * ```typescript
 * // Define procedure
 * const GetUserById = Procedure("GetUserById")
 *   .database("mydb")
 *   .params((c) => ({ userId: c.bigint() }))
 *   .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
 *   .body("SELECT id, name FROM User WHERE id = userId");
 *
 * // Register in DbContext
 * class MyDb extends DbContext {
 *   getUserById = executable(this, GetUserById);
 * }
 *
 * // Use
 * const result = await db.getUserById().execute({ userId: 1n });
 * ```
 *
 * @see {@link Executable} Execution class
 * @see {@link ProcedureBuilder} Procedure definition
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
