import type { ColumnPrimitive, ColumnPrimitiveStr } from "../types/column";
import type { Expr, WhereExpr } from "../types/expr";

/**
 * 타입 안전 표현식 래퍼
 * TypeScript 제네릭을 사용하여 표현식 반환 타입을 추적한다
 */
export class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;

  get n(): ExprUnit<NonNullable<TPrimitive>> {
    return new ExprUnit<NonNullable<TPrimitive>>(this.dataType, this.expr);
  }

  constructor(
    readonly dataType: ColumnPrimitiveStr,
    readonly expr: Expr,
  ) {}
}

/**
 * WHERE 절용 표현식 래퍼
 */
export class WhereExprUnit {
  constructor(readonly expr: WhereExpr) {}
}

/**
 * ExprUnit 또는 리터럴 값을 받는 입력 타입
 */
export type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
