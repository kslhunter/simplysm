# @simplysm/orm-common — Executable

저장 프로시저 호출 래퍼. `DbContext.executable(builder)` 가 만든 팩토리 호출(`db.getUserById()`)마다 새 인스턴스 반환.

```ts
class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  getExecProcQueryDef(params?: InferColumnExprs<TParams>): ExecProcQueryDef
  async execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]>
}
```

- `params` 의 각 값은 `ExprInput<T>` (= `ExprUnit<T> | T`). 리터럴이면 `expr.val(meta.type, value)` 로 자동 래핑.
- 프로시저에 `params` 가 정의되지 않은 builder 에 인자를 넘기면 throw.
- 반환은 결과 셋의 배열 (프로시저가 여러 SELECT 를 반환할 수 있음).

```ts
const [users] = await db.getUserById().execute({ userId: 1 });
```

`executable(db, builder)` — 팩토리. `DbContext.executable` 의 내부 구현이며, `SD_BUILDER` 심볼로 builder 를 부착해야 `initialize()` 가 회수할 수 있다 (직접 쓰지 말고 `DbContext.executable` 사용 권장).
