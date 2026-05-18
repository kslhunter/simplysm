# @simplysm/orm-common — Schema Builders

테이블/뷰/프로시저를 fluent 로 정의하는 immutable 빌더. `DbContext` 의 `queryable()`/`executable()` 에 전달하여 등록한다. 모든 메서드는 `new Xxx({...this.meta, ...})` 형태로 새 인스턴스 반환.

## Table / TableBuilder

```ts
import { Table } from "@simplysm/orm-common";

const User = Table("User")            // Table<TName>(name)
  .database("mydb")
  .schema("dbo")                      // MSSQL/PostgreSQL only
  .description("사용자")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id")                   // 복합: .primaryKey("a","b")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
  }));
```

타입 추론 프로퍼티 (`readonly $xxx!` — 런타임 값 X, 타입 추출용):
- `$inferSelect` — 컬럼 + (deep) 관계 (관계는 optional)
- `$inferColumns` — 컬럼만
- `$inferInsert` — `autoIncrement`/`nullable`/`default` 컬럼은 optional
- `$inferUpdate` — 모든 필드 optional
- `$columns`, `$relations` — 정의 자체

`meta`: `{ name; description?; database?; schema?; columns?; primaryKey?; relations?; indexes? }`.

## View / ViewBuilder

```ts
import { View } from "@simplysm/orm-common";

const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MainDb) =>
    db.user().where(u => [expr.eq(u.status, "active")])
       .select(u => ({ id: u.id, name: u.name })))
  .relations(r => ({ posts: r.relationKeyTarget(() => Post, "author") }));
```

- `.query<TData>(viewFn: (db) => Queryable<TData>)` 의 viewFn 은 `queryable()` 호출시(=`createView` DDL 만들 때, `db.queryable(ViewBuilder)` 팩토리에서) 실행된다.
- View 의 관계는 `relationKey`/`relationKeyTarget` 만 사용 (DB FK 미생성).
- `$inferSelect: TData`.

## Procedure / ProcedureBuilder

```ts
import { Procedure } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params(c => ({ userId: c.bigint() }))
  .returns(c => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
// MSSQL 본문은 @userId 사용. PostgreSQL 은 RETURN QUERY 필요.
```

`$params`, `$returns` 타입 추론. `meta`: `{ name; description?; database?; schema?; params?; returns?; query? }`.

## Column Factory (`columns((c) => ...)` 안에서 사용)

`createColumnFactory()` 반환 객체의 메서드 — 모두 `ColumnBuilder<TValue, TMeta>` 반환:

| 메서드 | TS 타입 | SQL 매핑 |
|---|---|---|
| `int()` | number | INT |
| `bigint()` | number | BIGINT |
| `float()` | number | FLOAT/REAL |
| `double()` | number | DOUBLE |
| `decimal(precision, scale?)` | number | DECIMAL(p,s) |
| `varchar(length)` | string | VARCHAR(n) |
| `char(length)` | string | CHAR(n) |
| `text()` | string | TEXT/LONGTEXT |
| `binary()` | Bytes | LONGBLOB/VARBINARY(MAX)/BYTEA |
| `boolean()` | boolean | TINYINT(1)/BIT/BOOLEAN |
| `datetime()` | DateTime | DATETIME |
| `date()` | DateOnly | DATE |
| `time()` | Time | TIME |
| `uuid()` | Uuid | BINARY(16)/UNIQUEIDENTIFIER/UUID |

`ColumnBuilder` 체이닝:
- `.autoIncrement()` — INSERT 시 자동 증가, `$inferInsert` 에서 optional.
- `.nullable()` — TS 타입에 `| undefined` 추가.
- `.default(value)` — 기본값. `$inferInsert` 에서 optional.
- `.description(text)` — DDL Comment.

타입 유틸: `ColumnBuilderRecord`, `InferColumns<T>`, `InferColumnExprs<T>` (Executable params), `RequiredInsertKeys<T>`, `OptionalInsertKeys<T>`, `InferInsertColumns<T>`, `InferUpdateColumns<T>`, `DataToColumnBuilderRecord<TData>`.

## Index Factory (`indexes((i) => ...)` 안에서)

```ts
i.index("email").unique()
i.index("name", "createdAt").orderBy("ASC", "DESC")
i.index("createdAt").name("IX_Foo")
i.index("a").description("...")
```

`IndexBuilder<TKeys>` 의 `meta`: `{ columns; name?; unique?; orderBy?; description? }`.

## Relation Factory (`relations((r) => ...)` 안에서)

Table 은 4개 모두, View 는 `relationKey`/`relationKeyTarget` 만 노출.

```ts
// N:1
r.foreignKey(["authorId"], () => User, { description?: string })       // DB FK 생성
r.relationKey(["companyId"], () => Company, { description?: string })   // 논리 관계 (FK X) — View 가능

// 1:N (기본) 또는 1:1 (single: true)
r.foreignKeyTarget(() => Post, "author")
r.foreignKeyTarget(() => Profile, "user", { single: true })
r.relationKeyTarget(() => UserSummary, "company", { single?, description? })
```

- `foreignKey` 의 두 번째 인자는 *대상 테이블 factory* `() => TableBuilder` (순환 참조 회피).
- `foreignKeyTarget` 의 두 번째 인자 `relationName` 은 대상 테이블에 정의된 자기방향 FK 의 키 이름.
- 메서드 체이닝(`.description()`/`.single()`)은 TS 순환 참조 (TS7022) 회피용으로 *제거됨* — 옵션은 마지막 `opts` 객체로만 전달.
- 빌더 클래스: `ForeignKeyBuilder`, `ForeignKeyTargetBuilder`, `RelationKeyBuilder`, `RelationKeyTargetBuilder`.

타입 유틸: `RelationBuilderRecord`, `ExtractRelationTarget<T>`, `ExtractRelationTargetResult<T>`, `InferDeepRelations<TRelations>` — 모두 관계를 optional 로 추론, 같은 테이블 재방문 시 더 깊이 들어가지 않음 (순환 끊김).
