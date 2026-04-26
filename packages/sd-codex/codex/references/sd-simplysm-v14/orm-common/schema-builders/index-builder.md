# `IndexBuilder`

> **읽어야 하는 상황**: 인덱스를 정의할 때 (유니크, 복합, 정렬 순서). `Table().indexes()` 콜백 내에서 `i.index(...)` 팩토리를 통해 생성된다.

Index 정의 빌더. `TableBuilder.indexes()` 콜백에서 `createIndexFactory()`가 반환하는 팩토리 객체를 통해 생성된다.

```typescript
export class IndexBuilder<TKeys extends string[]> {
  constructor(
    readonly meta: {
      columns: TKeys;
      name?: string;
      unique?: boolean;
      orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
      description?: string;
    },
  );
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `meta` | property | `{ columns, name?, unique?, orderBy?, description? }` | Index 메타데이터 |
| `name(name)` | method | `IndexBuilder<TKeys>` | Index 이름 설정 |
| `unique()` | method | `IndexBuilder<TKeys>` | UNIQUE 인덱스 설정 |
| `orderBy(...orderBy)` | method | `IndexBuilder<TKeys>` | 각 컬럼별 정렬 순서 설정 |
| `description(desc)` | method | `IndexBuilder<TKeys>` | Index 설명 (DDL Comment) |

## Related Types

### `createIndexFactory`

```typescript
export function createIndexFactory<TColumnKey extends string>(): {
  index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys>;
};
```

## Usage

```typescript
Table("User")
  .columns((c) => ({
    id: c.bigint(),
    email: c.varchar(200),
    name: c.varchar(100),
    createdAt: c.datetime(),
  }))
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
    i.index("createdAt").name("IX_User_CreatedAt").orderBy("DESC"),
  ]);
```
