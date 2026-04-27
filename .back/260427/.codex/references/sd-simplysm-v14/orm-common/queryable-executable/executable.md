# `Executable`

> **읽어야 하는 상황**: Stored Procedure를 실행할 때. Procedure 스키마 정의는 [`Procedure`](../schema-builders/procedure.md) 참조.

Stored Procedure 실행 래퍼 클래스. `DbContext.executable()`로 등록된 프로퍼티를 호출하면 반환된다.

```typescript
export class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(
    db: DbContextBase,
    builder: ProcedureBuilder<TParams, TReturns>,
  );
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `execute(params)` | method | `Promise<InferColumnExprs<TReturns>[][]>` | 프로시저 실행. 결과는 결과 셋 배열의 배열 |
| `getExecProcQueryDef(params?)` | method | `ExecProcQueryDef` | 실행 없이 QueryDef만 반환 |

## Related Types

### `executable` (팩토리 함수)

`DbContext.executable()`이 내부적으로 사용하는 팩토리 함수.

```typescript
export function executable<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
>(
  db: DbContextBase,
  builder: ProcedureBuilder<TParams, TReturns>,
): () => Executable<TParams, TReturns>;
```

## Usage

```typescript
// 프로시저 정의
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");

// DbContext에 등록
class MyDb extends DbContext {
  getUserById = this.executable(GetUserById);
}

// 실행
const [[user]] = await db.getUserById().execute({ userId: 1n });
```
