# @simplysm/orm-common — schema

테이블·뷰·프로시저 스키마를 fluent 빌더로 정의하는 군. `Table()`/`View()`/`Procedure()` 팩토리가 빌더를 만들고, 각 빌더의 메서드는 새 인스턴스를 반환하는 불변 체이닝이다. 정의 결과는 `DbContext` 의 `queryable()`/`executable()` 에 등록해 쓰며, `$inferSelect`/`$inferInsert` 등의 phantom 필드로 컬럼·관계 타입이 추론된다. 컬럼/관계/인덱스는 각 빌더의 콜백 안에서 팩토리(`c`/`r`/`i`)로 만든다.

## TableBuilder / Table

```typescript
function Table<TName extends string>(name: TName): TableBuilder<TName, {}, {}>;
class TableBuilder<TName, TColumns, TRelations> {
  readonly meta: { name; description?; database?; schema?; columns?; primaryKey?; relations?; indexes? };
  readonly $inferSelect;   // InferColumns & InferDeepRelations (전체 — 관계 포함)
  readonly $inferColumns;  // 컬럼만
  readonly $inferInsert;   // INSERT 입력 (autoIncrement 제외, nullable/default 는 optional)
  readonly $inferUpdate;   // UPDATE 입력 (모든 컬럼 optional)
  description(desc: string): TableBuilder;
  database(db: string): TableBuilder;
  schema(schema: string): TableBuilder;
  columns(fn: (c) => TNewColumnDefs): TableBuilder;
  primaryKey(...columns: (keyof TColumns)[]): TableBuilder;
  indexes(fn: (i) => IndexBuilder[]): TableBuilder;
  relations(fn: (r) => TRelations): TableBuilder;
}
```

- `Table(name)` — 테이블 빌더 시작점. `name` 은 실제 DB 테이블명이자 `$inferSelect` 의 phantom 타입 이름.
- `description(desc)` — 테이블 설명. DDL Comment 로 사용됨.
- `database(db)` — 테이블이 속한 데이터베이스명. 미지정 시 `DbContext` 의 database 옵션을 따름.
- `schema(schema)` — 스키마명. MSSQL(`dbo`)/PostgreSQL(`public`) 에서만 의미 있고 MySQL 은 무시.
- `columns(fn)` — `createColumnFactory()` 가 주입된 `c` 로 컬럼 레코드를 반환. 호출 시 `TColumns` 가 새 정의로 교체됨.
- `primaryKey(...columns)` — PK 컬럼명을 가변 인자로. 2개 이상 넘기면 복합 PK. 인자는 `columns()` 의 키로 타입 체크됨.
- `indexes(fn)` — `createIndexFactory()` 의 `i` 로 인덱스 배열을 반환.
- `relations(fn)` — `createRelationFactory()` 의 `r` 로 관계 레코드 반환. Table 은 `foreignKey`/`foreignKeyTarget`/`relationKey`/`relationKeyTarget` 모두 사용 가능.
- `meta` — 빌더가 누적한 정의 객체. DDL 생성·`queryable()` 이 읽음.

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({ posts: r.foreignKeyTarget(() => Post, "author") }));
```

## ViewBuilder / View

```typescript
function View(name: string): ViewBuilder;
class ViewBuilder<TDbContext, TData, TRelations> {
  readonly meta: { name; description?; database?; schema?; viewFn?; relations? };
  readonly $inferSelect; // TData
  description(desc: string): ViewBuilder;
  database(db: string): ViewBuilder;
  schema(schema: string): ViewBuilder;
  query(viewFn: (db: TDb) => Queryable<TViewData, any>): ViewBuilder;
  relations(fn: (r) => TRelations): ViewBuilder;
}
```

- `View(name)` — 뷰 빌더 시작점.
- `description`/`database`/`schema` — Table 과 동일 의미.
- `query(viewFn)` — 뷰의 데이터 소스인 SELECT Queryable 을 `db` 를 받아 반환. `viewFn` 이 `TData`(뷰 행 타입)를 결정.
- `relations(fn)` — 뷰의 관계 정의. 뷰는 `relationKey`/`relationKeyTarget` 만 사용 가능(DB FK 미생성). 반환 타입에 관계가 합쳐져 `$inferSelect` 에 반영됨.

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user().where((u) => [expr.eq(u.status, "active")]).select((u) => ({ id: u.id, name: u.name })),
  );
```

## ProcedureBuilder / Procedure

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>;
class ProcedureBuilder<TParams, TReturns> {
  readonly meta: { name; description?; database?; schema?; params?; returns?; query? };
  readonly $params; readonly $returns;
  description(desc: string): ProcedureBuilder;
  database(db: string): ProcedureBuilder;
  schema(schema: string): ProcedureBuilder;
  params(fn: (c) => TParams): ProcedureBuilder;
  returns(fn: (c) => TReturns): ProcedureBuilder;
  body(sql: string): ProcedureBuilder;
}
```

- `Procedure(name)` — 저장 프로시저 빌더 시작점. `executable()` 에 등록.
- `params(fn)` — 입력 파라미터를 컬럼 팩토리로 정의. `Executable.execute()` 의 인자 타입이 됨.
- `returns(fn)` — 반환 결과셋 컬럼을 정의. 결과 행 타입이 됨.
- `body(sql)` — 프로시저 본문 SQL. DBMS 별 파라미터 구문 차이 주의(MySQL: `userId`, MSSQL: `@userId`, PostgreSQL: `RETURN QUERY` 필요).

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

## createColumnFactory (컬럼 팩토리 `c`)

`columns()`/`params()`/`returns()` 콜백에 주입되는 `c`. 각 메서드가 `ColumnBuilder` 를 반환하며 SQL 타입과 TS 원시 타입을 함께 고정한다.

| 메서드 | TS 타입 | SQL 매핑 |
| ------ | ------- | -------- |
| `c.int()` | number | INT (4바이트) |
| `c.bigint()` | number | BIGINT (8바이트) |
| `c.float()` | number | FLOAT/REAL (4바이트) |
| `c.double()` | number | DOUBLE (8바이트) |
| `c.decimal(precision, scale?)` | number | DECIMAL(precision, scale) — 고정 소수점 |
| `c.varchar(length)` | string | VARCHAR(length) — 가변 길이 |
| `c.char(length)` | string | CHAR(length) — 고정 길이 |
| `c.text()` | string | TEXT/LONGTEXT — 대용량 |
| `c.binary()` | Bytes | LONGBLOB / VARBINARY(MAX) / BYTEA |
| `c.boolean()` | boolean | TINYINT(1) / BIT / BOOLEAN |
| `c.datetime()` | DateTime | DATETIME |
| `c.date()` | DateOnly | DATE |
| `c.time()` | Time | TIME |
| `c.uuid()` | Uuid | BINARY(16) / UNIQUEIDENTIFIER / UUID |

### ColumnBuilder 수식 메서드

- `.autoIncrement()` — INSERT 시 자동 증가. `$inferInsert` 에서 해당 컬럼이 optional 이 됨.
- `.nullable()` — NULL 허용. 값 타입에 `undefined` 가 추가되고 `$inferInsert` 에서 optional.
- `.default(value)` — INSERT 시 미지정이면 사용할 기본값. `$inferInsert` 에서 optional. (정책: 사용자가 명시 지시한 경우에만 사용.)
- `.description(desc)` — 컬럼 설명. DDL Comment.

```typescript
.columns((c) => ({
  id: c.bigint().autoIncrement(),
  email: c.varchar(200).nullable(),
  status: c.varchar(20).default("active"),
}))
```

## createIndexFactory (인덱스 팩토리 `i`)

`indexes()` 콜백에 주입되는 `i`. `i.index(...columns)` 가 `IndexBuilder` 를 반환.

```typescript
class IndexBuilder<TKeys> {
  readonly meta: { columns; name?; unique?; orderBy?; description? };
  name(name: string): IndexBuilder;
  unique(): IndexBuilder;
  orderBy(...orderBy: ("ASC" | "DESC")[]): IndexBuilder;
  description(description: string): IndexBuilder;
}
```

- `i.index(...columns)` — 인덱스 컬럼을 가변 인자로(복합 인덱스). 컬럼명은 테이블 컬럼 키로 타입 체크.
- `.name(name)` — 인덱스 이름 직접 지정.
- `.unique()` — 유니크 인덱스로 표시.
- `.orderBy(...dirs)` — 컬럼별 정렬 방향. 인자 개수가 컬럼 개수와 일치해야 함.
- `.description(desc)` — 인덱스 설명.

```typescript
.indexes((i) => [
  i.index("email").unique(),
  i.index("status", "createdAt").orderBy("ASC", "DESC"),
])
```

## createRelationFactory (관계 팩토리 `r`)

`relations()` 콜백에 주입되는 `r`. Table 은 4종 모두, View 는 `relationKey`/`relationKeyTarget` 만 노출. description·single 옵션은 메서드 체이닝이 아니라 `opts` 인자로 전달한다(순환 참조 시 TS7022 회피).

- `r.foreignKey(columns, targetFn, opts?)` — N:1 FK 관계(DB FK 제약 **생성**). `columns` 는 FK 컬럼 배열, `targetFn` 은 대상 테이블 지연 반환(`() => User`). `opts.description?`. → `include()` 시 단일 객체로 로드.
- `r.foreignKeyTarget(targetTableFn, relationName, opts?)` — 1:N FK 역참조. `relationName` 은 대상 테이블에서 이쪽을 가리키는 FK 관계 이름. `opts.single: true` 면 1:1(단일 객체), 미지정/`false` 면 배열. `opts.description?`.
- `r.relationKey(columns, targetFn, opts?)` — `foreignKey` 와 동일하나 DB FK 제약 **미생성**(논리적 관계). View 에서도 사용 가능.
- `r.relationKeyTarget(targetTableFn, relationName, opts?)` — `foreignKeyTarget` 의 DB FK 미생성 버전. `opts.single`/`description` 동일.

대상은 항상 지연 함수(`() => Table`)로 넘긴다 — 순환 참조(A↔B) 방지.

```typescript
const Post = Table("Post")
  .columns((c) => ({ id: c.bigint().autoIncrement(), authorId: c.bigint() }))
  .primaryKey("id")
  .relations((r) => ({
    author: r.foreignKey(["authorId"], () => User, { description: "작성자" }),
  }));

const User = Table("User")
  .columns((c) => ({ id: c.bigint().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
    profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),
  }));
```

## 빌더 클래스 (관계)

`createRelationFactory` 가 반환하는 인스턴스의 클래스도 export 된다. `meta` 만 보유하는 데이터 홀더이며 메서드 체이닝은 없다(옵션은 팩토리 `opts`).

- `ForeignKeyBuilder` — N:1 FK(`meta: { ownerFn, columns, targetFn, description? }`).
- `ForeignKeyTargetBuilder` — 1:N FK 역참조(`meta: { targetTableFn, relationName, description?, isSingle? }`).
- `RelationKeyBuilder` / `RelationKeyTargetBuilder` — 위 둘의 DB FK 미생성 버전.

## 타입 추론 유틸리티

빌더의 phantom 필드 뒤에 있는 추론 타입. 직접 import 해 쓸 일은 드물지만 export 됨.

- `InferColumns<TBuilders>` — 컬럼 빌더 레코드 → 실제 값 타입 레코드.
- `InferColumnExprs<TBuilders>` — 컬럼 빌더 레코드 → `ExprInput<V>` 레코드(프로시저 파라미터 입력 타입).
- `InferInsertColumns<TBuilders>` — INSERT 타입(필수/optional 분리).
- `InferUpdateColumns<TBuilders>` — UPDATE 타입(전부 optional).
- `RequiredInsertKeys`/`OptionalInsertKeys` — INSERT 필수/optional 키 추출.
- `DataToColumnBuilderRecord<TData>` — 데이터 레코드 → 컬럼 빌더 레코드(`insertInto` 대상 타입 제약용).
- `InferDeepRelations<TRelations>` — 관계 정의 → 심층(중첩) 관계 타입. 모든 관계는 optional(include 전 undefined). 같은 테이블 재방문 시 순환을 끊음.
- `ExtractRelationTarget` / `ExtractRelationTargetResult` — 단일/배열 관계 대상 타입 추출(내부용).
- `ColumnBuilderRecord` / `RelationBuilderRecord` — 컬럼/관계 빌더 레코드 타입.

## 주의사항

- 모든 빌더 메서드는 새 인스턴스를 반환하는 불변 체이닝 — 중간 결과를 변수에 담아 분기 재사용 가능.
- 관계 `target`/`owner` 는 반드시 지연 함수로 — 즉시 참조하면 모듈 로드 순서·순환 참조로 깨짐.
- View 의 관계는 `relationKey*` 만(DB FK 없음). Table 만 `foreignKey*` 로 실제 FK 제약 생성.
- 컬럼은 기본 `NOT NULL`. `.nullable()`/`.default()` 는 도메인 근거가 있을 때만(orm.md 정책).
