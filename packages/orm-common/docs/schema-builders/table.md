# Table

Fluent API로 Database Table 스키마를 정의하는 빌더 팩토리 함수. 반환된 `TableBuilder`에 컬럼, PK, 인덱스, 관계를 메서드 체이닝으로 정의한다. 각 메서드는 새 인스턴스를 반환하므로 불변(immutable)이다.

```typescript
export function Table(name: string): TableBuilder<never, never>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `name` | `string` | 테이블 이름 |

## Returns

`TableBuilder<never, never>` — 빈 TableBuilder 인스턴스

## Related Types

### `TableBuilder<TColumns, TRelations>`

```typescript
export class TableBuilder<
  TColumns extends ColumnBuilderRecord,
  TRelations extends RelationBuilderRecord,
> {
  readonly $inferSelect!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  readonly $inferColumns!: InferColumns<TColumns>;
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;
}
```

#### 타입 추론 프로퍼티

| 프로퍼티 | 설명 |
|----------|------|
| `$inferSelect` | SELECT 결과 타입 (컬럼 + 관계 포함) |
| `$inferColumns` | 컬럼만의 타입 |
| `$inferInsert` | INSERT 입력 타입 (autoIncrement 제외, nullable/default는 optional) |
| `$inferUpdate` | UPDATE 입력 타입 (모든 필드 optional) |

#### 빌더 메서드

| 메서드 | 설명 |
|--------|------|
| `description(desc)` | 테이블 설명 설정 (DDL Comment) |
| `database(db)` | Database 이름 설정 |
| `schema(schema)` | Schema 이름 설정 (MSSQL: dbo, PostgreSQL: public) |
| `columns(fn)` | 컬럼 정의. `fn(c) => ({ name: c.varchar(100), ... })` |
| `primaryKey(...columns)` | PK 설정. 복합 PK는 여러 인자 전달 |
| `indexes(fn)` | 인덱스 정의. `fn(i) => [i.index("email").unique(), ...]` |
| `relations(fn)` | 관계 정의. `fn(r) => ({ company: r.foreignKey(...), ... })` |

## Usage

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    isActive: c.boolean().default(true),
    companyId: c.bigint().nullable(),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
  ])
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company, { description: "소속회사" }),
    posts: r.foreignKeyTarget(() => Post, "user"),
    profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),
  }));

// 복합 PK
const UserRole = Table("UserRole")
  .columns((c) => ({
    userId: c.bigint(),
    roleId: c.bigint(),
  }))
  .primaryKey("userId", "roleId");
```

## 권장사항

### `isDeleted` 컬럼

- **기초정보(마스터 데이터) 테이블**: `isDeleted: c.boolean().default(false)` 컬럼을 포함한다. 삭제 시 `isDeleted: true`로 soft-delete하고, 복구 기능을 제공한다.
- **일반 데이터(트랜잭션 데이터 등) 테이블**: `isDeleted` 컬럼을 두지 않는다. 삭제 시 물리 삭제(row DELETE)로 처리한다.
