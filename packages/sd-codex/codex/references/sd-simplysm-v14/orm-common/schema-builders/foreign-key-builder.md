# `ForeignKeyBuilder`

> **읽어야 하는 상황**: FK(N:1), 역참조(1:N, 1:1), 논리적 관계(DB FK 미생성)를 정의할 때. `Table().relations()` 또는 `View().relations()` 콜백 내에서 팩토리를 통해 생성된다.

FK/역참조/논리적 관계 빌더들. `TableBuilder.relations()` 및 `ViewBuilder.relations()` 콜백에서 `createRelationFactory()`가 반환하는 팩토리 객체를 통해 생성된다.

**주의**: description/single 설정은 반드시 팩토리 함수의 `opts` 파라미터로 전달해야 한다. 메서드 체이닝(`.description()`, `.single()`)은 TypeScript 순환 참조(TS7022)를 유발하므로 제거되었다.

## 빌더 종류

| 클래스 | 관계 방향 | DB FK 생성 | 사용 가능 위치 |
|--------|-----------|------------|----------------|
| `ForeignKeyBuilder` | N:1 | O | Table |
| `ForeignKeyTargetBuilder` | 1:N 또는 1:1 | O (역참조) | Table |
| `RelationKeyBuilder` | N:1 | X | Table, View |
| `RelationKeyTargetBuilder` | 1:N 또는 1:1 | X (역참조) | Table, View |

## ForeignKeyBuilder

```typescript
export class ForeignKeyBuilder<
  TOwner extends TableBuilder<any, any>,
  TTargetFn extends () => TableBuilder<any, any>,
> {
  constructor(
    readonly meta: {
      ownerFn: () => TOwner;
      columns: string[];
      targetFn: TTargetFn;
      description?: string;
    },
  );
}
```

팩토리 시그니처:
```typescript
r.foreignKey(columns, targetFn, opts?: { description?: string }): ForeignKeyBuilder<...>
```

## ForeignKeyTargetBuilder

```typescript
export class ForeignKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any>,
  TIsSingle extends boolean,
> {
  constructor(
    readonly meta: {
      targetTableFn: TTargetTableFn;
      relationName: string;
      description?: string;
      isSingle?: TIsSingle;
    },
  );
}
```

팩토리 시그니처 (오버로드):
```typescript
// 배열 관계 (1:N)
r.foreignKeyTarget(targetTableFn, relationName, opts?: { single?: false, description?: string }):
  ForeignKeyTargetBuilder<..., false>

// 단일 관계 (1:1)
r.foreignKeyTarget(targetTableFn, relationName, opts: { single: true, description?: string }):
  ForeignKeyTargetBuilder<..., true>
```

## RelationKeyBuilder

`ForeignKeyBuilder`와 동일하지만 DB에 FK 제약조건을 생성하지 않는다. View에서도 사용 가능하다.

팩토리 시그니처:
```typescript
r.relationKey(columns, targetFn, opts?: { description?: string }): RelationKeyBuilder<...>
```

## RelationKeyTargetBuilder

`ForeignKeyTargetBuilder`와 동일하지만 DB에 FK를 생성하지 않는다.

팩토리 시그니처 (오버로드):
```typescript
r.relationKeyTarget(targetTableFn, relationName, opts?: { single?: false, description?: string })
r.relationKeyTarget(targetTableFn, relationName, opts: { single: true, description?: string })
```

## Related Types

### `createRelationFactory`

```typescript
export function createRelationFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
>(ownerFn: () => TOwner): RelationFactory;
```

TableBuilder → FK + RelationKey 모두 사용 가능.
ViewBuilder → RelationKey만 사용 가능 (`foreignKey`/`foreignKeyTarget` 없음).

## Usage

```typescript
const Post = Table("Post")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // N:1: Post → User (DB FK 생성)
    author: r.foreignKey(["authorId"], () => User, { description: "작성자" }),
  }));

const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // 1:N 역참조 (배열)
    posts: r.foreignKeyTarget(() => Post, "author"),
    // 1:1 역참조 (단일 객체)
    profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),
    // 설명 포함
    comments: r.foreignKeyTarget(() => Comment, "user", { description: "댓글목록" }),
  }));

// View에서는 relationKey만 사용
const UserSummary = View("UserSummary")
  .query((db: MyDb) => db.user().select(...))
  .relations((r) => ({
    company: r.relationKey(["companyId"], () => Company, { description: "소속회사" }),
  }));
```
