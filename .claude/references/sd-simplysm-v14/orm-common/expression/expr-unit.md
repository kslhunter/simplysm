# ExprUnit

타입 안전 표현식 래퍼. TypeScript 제네릭으로 표현식의 반환 타입을 추적한다. `expr.*` 함수들이 반환하며, `Queryable` 콜백에서 column 참조에 사용된다.

```typescript
export class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;

  get n(): ExprUnit<NonNullable<TPrimitive>>;

  constructor(
    readonly dataType: ColumnPrimitiveStr,
    readonly expr: Expr,
  );
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `$infer` | property | `TPrimitive` | 타입 추론용 마커 (런타임 미사용) |
| `n` | getter | `ExprUnit<NonNullable<TPrimitive>>` | nullable 타입을 non-nullable로 좁힘 |
| `dataType` | property | `ColumnPrimitiveStr` | 표현식 반환 타입 이름 |
| `expr` | property | `Expr` | 표현식 AST |

## Related Types

### `WhereExprUnit`

WHERE 절용 표현식 래퍼. `expr.eq()`, `expr.gt()`, `expr.like()` 등 비교/논리 연산자가 반환한다.

```typescript
export class WhereExprUnit {
  constructor(readonly expr: WhereExpr);
}
```

### `ExprInput<TPrimitive>`

`ExprUnit` 또는 리터럴 값을 모두 받는 입력 타입. `expr.*` 함수의 파라미터에 사용된다.

```typescript
export type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

## Usage

```typescript
// ExprUnit은 주로 Queryable 콜백의 column 프록시에서 만남
db.user().where((u) => [
  // u.isActive 가 ExprUnit<boolean>
  expr.eq(u.isActive, true),
]);

// ExprInput 덕분에 리터럴 값도 직접 전달 가능
expr.eq(u.age, 18)         // ExprInput<number> → 18 (리터럴)
expr.eq(u.age, u.minAge)   // ExprInput<number> → ExprUnit<number>

// .n 으로 nullable 제거 후 연산
const nonNullName: ExprUnit<string> = u.name.n;
```
