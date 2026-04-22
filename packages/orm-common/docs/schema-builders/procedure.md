# Procedure

Fluent API로 Stored Procedure 스키마를 정의하는 빌더 팩토리 함수.

```typescript
export function Procedure(name: string): ProcedureBuilder<never, never>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | Procedure 이름 |

## Returns

`ProcedureBuilder<never, never>` — 빈 ProcedureBuilder 인스턴스

## Related Types

### `ProcedureBuilder<TParams, TReturns>`

```typescript
export class ProcedureBuilder<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  readonly $params!: TParams;
  readonly $returns!: TReturns;
}
```

#### 빌더 메서드

| 메서드 | 설명 |
|--------|------|
| `description(desc)` | Procedure 설명 설정 (DDL Comment) |
| `database(db)` | Database 이름 설정 |
| `schema(schema)` | Schema 이름 설정 |
| `params(fn)` | 입력 파라미터 정의. `fn(c) => ({ userId: c.bigint(), ... })` |
| `returns(fn)` | 반환 컬럼 정의. `fn(c) => ({ id: c.bigint(), ... })` |
| `body(sql)` | Procedure 본문 SQL 설정 |

## Usage

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .body("SELECT id, name, email FROM User WHERE id = userId");
  // MSSQL: .body("SELECT id, name, email FROM [User] WHERE id = @userId")

// DbContext에 등록
class MainDb extends DbContext {
  getUserById = this.executable(GetUserById);
}

// 실행
const [[user]] = await db.getUserById().execute({ userId: 1n });
```
