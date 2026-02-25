import type { ColumnPrimitive, ColumnPrimitiveStr } from "../types/column";
import type { Expr, WhereExpr } from "../types/expr";

/**
 * Type-safe expression wrapper
 * Tracks expression return type using TypeScript generics
 */
export class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;

  get n(): ExprUnit<NonNullable<TPrimitive>> {
    return this as unknown as ExprUnit<NonNullable<TPrimitive>>;
  }

  constructor(
    readonly dataType: ColumnPrimitiveStr,
    readonly expr: Expr,
  ) {}
}

/**
 * Expression wrapper for WHERE clause
 */
export class WhereExprUnit {
  constructor(readonly expr: WhereExpr) {}
}

/**
 * Input type that accepts ExprUnit or literal values
 */
export type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
