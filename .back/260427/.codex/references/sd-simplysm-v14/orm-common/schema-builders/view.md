# `View`

> **읽어야 하는 상황**: 뷰 스키마를 정의할 때. SELECT 쿼리 기반으로 정의하며 논리적 관계(RelationKey)만 사용 가능하다. 테이블 정의는 [`Table`](./table.md) 참조.

Fluent API로 Database View 스키마를 정의하는 빌더 팩토리 함수. 반환된 `ViewBuilder`에 쿼리와 관계를 메서드 체이닝으로 정의한다.

```typescript
export function View(name: string): ViewBuilder<never, never, never>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | View 이름 |

## Returns

`ViewBuilder<never, never, never>` — 빈 ViewBuilder 인스턴스

## Related Types

### `ViewBuilder<TDbContext, TData, TRelations>`

```typescript
export class ViewBuilder<
  TDbContext extends DbContextBase,
  TData extends DataRecord,
  TRelations extends RelationBuilderRecord,
> {
  readonly $inferSelect!: TData;
}
```

#### 빌더 메서드

| 메서드 | 설명 |
|--------|------|
| `description(desc)` | View 설명 설정 (DDL Comment) |
| `database(db)` | Database 이름 설정 |
| `schema(schema)` | Schema 이름 설정 |
| `query(viewFn)` | View 쿼리 정의. `(db: TDb) => Queryable<TViewData, any>` |
| `relations(fn)` | 관계 정의 (`relationKey`/`relationKeyTarget`만 사용 가능) |

## Usage

```typescript
// 단순 필터 View
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MainDb) =>
    db.user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select((u) => ({ id: u.id, name: u.name }))
  );

// 집계 View
const UserStats = View("UserStats")
  .database("mydb")
  .query((db: MainDb) =>
    db.user()
      .groupBy((u) => [u.companyId])
      .select((u) => ({
        companyId: u.companyId,
        userCount: expr.count(u.id),
      }))
  );

// DbContext에 등록
class MainDb extends DbContext {
  activeUsers = this.queryable(ActiveUsers);
}
```
