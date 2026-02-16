import type { ColumnPrimitive, ColumnPrimitiveStr } from "../types/column";
import type { Expr, WhereExpr } from "../types/expr";

/**
 * 타입 안전한 표현식 래퍼
 * TypeScript 제네릭으로 표현식의 반환 타입을 추적
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
 * WHERE 절용 표현식 래퍼
 */
export class WhereExprUnit {
  constructor(readonly expr: WhereExpr) {}
}

/**
 * ExprUnit 또는 리터럴 값을 받을 수 있는 입력 타입
 */
export type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
