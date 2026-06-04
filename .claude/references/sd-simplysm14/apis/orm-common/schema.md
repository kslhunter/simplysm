# @simplysm/orm-common — 스키마 정의 (Table / View / Procedure / column / index / relation)

DB 객체(Table/View/Procedure)와 그 구성요소(column/index/관계)를 fluent 빌더로 선언하는 묶음. 모든 빌더는 immutable — 각 메서드가 새 인스턴스를 반환한다. 정의한 빌더는 `DbContext` 안에서 `this.queryable()`/`this.executable()` 로 등록한다. column 은 기본 `NOT NULL`; `.nullable()`/`.default(...)` 는 도메인 근거가 있을 때만 붙인다(orm.md).

## Table / TableBuilder

```typescript
function Table<TName extends string>(name: TName): TableBuilder<TName, {}, {}>;

class TableBuilder<TName, TColumns, TRelations> {
  readonly meta: { name; description?; database?; schema?; columns?; primaryKey?; relations?; indexes? };
  readonly $inferSelect;   // columns + 관계(optional)
  readonly $inferColumns;  // column 값 타입만
  readonly $inferInsert;   // INSERT 타입 (autoIncrement/nullable/default 는 optional)
  readonly $inferUpdate;   // UPDATE 타입 (전부 optional)

  description(desc: string): TableBuilder;
  database(db: string): TableBuilder;
  schema(schema: string): TableBuilder;
  columns(fn: (c) => TNewColumns): TableBuilder;
  primaryKey(...columns: (keyof TColumns)[]): TableBuilder;
  indexes(fn: (i) => IndexBuilder[]): TableBuilder;
  relations(fn: (r) => TRelations): TableBuilder;
}
```

- `Table(name)` — 빈 `TableBuilder` 생성. 이후 fluent 메서드로 채운다.
- `description(desc)` — 테이블 설명. CREATE TABLE 시 DDL comment 로 들어감.
- `database(db)` — 데이터베이스명 고정. 미지정 시 `DbContext` 의 기본 database.
- `schema(schema)` — 스키마명(MSSQL/PostgreSQL). MySQL 무시.
- `columns(fn)` — column factory `c` 를 받아 `{ name: c.타입() }` 레코드를 반환. 아래 column factory 참조. 호출 후 `$inferColumns` 등 타입이 갱신.
- `primaryKey(...columns)` — PK column 이름(들). 여러 개 넘기면 복합 PK.
- `indexes(fn)` — index factory `i` 를 받아 `IndexBuilder[]` 반환.
- `relations(fn)` — relation factory `r` 를 받아 FK/역참조 관계 레코드 반환. Table 은 `foreignKey`/`foreignKeyTarget`/`relationKey`/`relationKeyTarget` 모두 사용 가능.
- `$inferSelect` — SELECT 결과 타입(컬럼 + include 가능한 관계는 optional). `queryable` 콜백 인자의 원천.
- `$inferInsert` / `$inferUpdate` — `insert`/`update` 입력 타입. INSERT 는 autoIncrement·nullable·default column 이 optional, UPDATE 는 전부 optional.

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()]);
```

## View / ViewBuilder

```typescript
function View(name: string): ViewBuilder;

class ViewBuilder<TDbContext, TData, TRelations> {
  readonly meta: { name; description?; database?; schema?; viewFn?; relations? };
  readonly $inferSelect;  // TData

  description(desc): ViewBuilder;
  database(db): ViewBuilder;
  schema(schema): ViewBuilder;
  query(viewFn: (db) => Queryable<TViewData, any>): ViewBuilder;
  relations(fn: (r) => T): ViewBuilder;
}
```

- `View(name)` — 빈 `ViewBuilder` 생성.
- `query(viewFn)` — 뷰 본문 SELECT 를 `db` 를 받는 함수로 정의. 반환 `Queryable` 의 select 결과가 뷰 데이터 타입이 됨. `queryable(this, View)` 등록 시 이 함수가 평가되어 column 이 구성된다.
- `relations(fn)` — 뷰는 `relationKey`/`relationKeyTarget` 만 사용 가능(DB FK 미생성). `foreignKey` 는 타입상 불가.
- `description`/`database`/`schema` — Table 과 동일 의미.

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MainDb) =>
    db.user().where((u) => [expr.eq(u.status, "active")]).select((u) => ({ id: u.id, name: u.name })),
  );
```

## Procedure / ProcedureBuilder

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>;

class ProcedureBuilder<TParams, TReturns> {
  readonly meta: { name; description?; database?; schema?; params?; returns?; query? };
  readonly $params; readonly $returns;

  description(desc): ProcedureBuilder;
  database(db): ProcedureBuilder;
  schema(schema): ProcedureBuilder;
  params(fn: (c) => T): ProcedureBuilder;
  returns(fn: (c) => T): ProcedureBuilder;
  body(sql: string): ProcedureBuilder;
}
```

- `Procedure(name)` — 빈 빌더 생성.
- `params(fn)` — 입력 파라미터를 column factory 로 정의. `Executable.execute(params)` 의 입력 타입이 됨.
- `returns(fn)` — 결과 column 정의. `execute` 결과 행 타입이 됨.
- `body(sql)` — 프로시저 본문 SQL. DBMS별 구문 차이 주의(MySQL: `userId`, MSSQL: `@userId`, PostgreSQL: `RETURN QUERY` 필요).
- `description`/`database`/`schema` — Table 과 동일.

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

## column factory / ColumnBuilder

`columns`/`params`/`returns` 콜백 인자 `c` 가 column factory. 각 메서드는 `ColumnBuilder` 를 반환하고 `.autoIncrement()`/`.nullable()`/`.default()`/`.description()` 로 속성을 더한다(모두 immutable).

타입 메서드:

- `int()` — INT(4바이트 정수).
- `bigint()` — BIGINT(8바이트 정수). autoIncrement PK 에 주로 사용.
- `float()` — FLOAT(단정밀도 실수).
- `double()` — DOUBLE(배정밀도 실수).
- `decimal(precision, scale?)` — 고정 소수점. `precision`=전체 자릿수, `scale`=소수 자릿수(선택). 금액 등 정밀도 필요 시.
- `varchar(length)` — 가변 길이 문자열. `length`=최대 길이.
- `char(length)` — 고정 길이 문자열.
- `text()` — 대용량 텍스트.
- `binary()` — 바이너리(MySQL LONGBLOB / MSSQL VARBINARY(MAX) / PostgreSQL BYTEA). 값 타입 `Bytes`.
- `boolean()` — 불리언(MySQL TINYINT(1) / MSSQL BIT / PostgreSQL BOOLEAN).
- `datetime()` — 날짜+시간. 값 타입 `DateTime`.
- `date()` — 날짜만. 값 타입 `DateOnly`.
- `time()` — 시간만. 값 타입 `Time`.
- `uuid()` — UUID(MySQL BINARY(16) / MSSQL UNIQUEIDENTIFIER / PostgreSQL UUID). 값 타입 `Uuid`.

`ColumnBuilder` 속성 메서드:

- `autoIncrement()` — INSERT 시 자동 증가. INSERT 타입에서 optional 처리. PK 자동 증가 column 에.
- `nullable()` — NULL 허용. 값 타입에 `undefined` 추가, INSERT optional. 도메인상 값이 없을 수 있을 때만.
- `default(value)` — INSERT 시 미지정이면 사용할 기본값. INSERT optional 처리. 사용자가 명시 지시한 경우에만.
- `description(desc)` — column 설명(DDL comment).

```typescript
.columns((c) => ({
  id: c.bigint().autoIncrement(),
  price: c.decimal(10, 2),
  email: c.varchar(200).nullable(),
  status: c.varchar(20).default("active"),
}))
```

## index factory / IndexBuilder

`indexes` 콜백 인자 `i` 의 `index(...columns)` 로 시작해 fluent 로 옵션을 더한다.

- `i.index(...columns)` — index 대상 column 이름(들). 여러 개면 복합 index.
- `.name(name)` — index 이름 지정. 미지정 시 자동 생성.
- `.unique()` — 유니크 index.
- `.orderBy(...orderBy)` — column별 정렬 방향 배열("ASC"|"DESC"). column 수와 길이 일치해야 함.
- `.description(description)` — index 설명(DDL comment).

```typescript
.indexes((i) => [
  i.index("email").unique(),
  i.index("status", "createdAt").orderBy("ASC", "DESC"),
])
```

## relation factory

`relations` 콜백 인자 `r`. Table 은 4종 모두, View 는 `relationKey`/`relationKeyTarget` 만. 대상 빌더는 순환 참조 방지를 위해 모두 `() => Target` 지연 함수로 넘긴다. `description`/`single` 은 메서드 체이닝이 아니라 마지막 `opts` 인자로 전달(체이닝은 TS7022 유발로 제거됨).

- `r.foreignKey(columns, () => Target, opts?)` — N:1 FK 관계(DB FK 제약 **생성**). `columns`=현재 테이블 FK column 배열, 대상은 그 테이블의 PK 와 매칭. `opts.description?`. → `ForeignKeyBuilder`.
- `r.foreignKeyTarget(() => Target, relationName, opts?)` — FK 역참조(1:N, DB FK 생성 측의 역방향). `relationName`=대상 테이블에서 이쪽을 가리키는 FK 관계 이름. `opts.single: true` 면 1:1 단일 객체, 아니면 배열. `opts.description?`. → `ForeignKeyTargetBuilder`.
- `r.relationKey(columns, () => Target, opts?)` — N:1 논리 관계(DB FK **미생성**). FK 와 동일하나 제약 없음. View 에서도 사용. → `RelationKeyBuilder`.
- `r.relationKeyTarget(() => Target, relationName, opts?)` — 1:N/1:1 논리 역참조(DB FK 미생성). `opts.single`/`opts.description` 동일. → `RelationKeyTargetBuilder`.

각 `opts`:

- `description?: string` — 관계 설명.
- `single?: boolean` (target 계열만) — true=결과를 단일 객체(1:1), false/미지정=배열(1:N). `include()`/`$inferSelect` 의 해당 키 타입이 단일/배열로 갈린다.

```typescript
const Post = Table("Post")
  .columns((c) => ({ id: c.bigint().autoIncrement(), authorId: c.bigint() }))
  .primaryKey("id")
  .relations((r) => ({ author: r.foreignKey(["authorId"], () => User, { description: "작성자" }) }));

const User = Table("User")
  .columns((c) => ({ id: c.bigint().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
    profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),
  }));
```

주의: FK column 개수와 대상 테이블 PK 개수가 다르면 `include()`/join 시 "FK/PK column count mismatch" throw. PK 가 복합이면 FK column 도 같은 순서·개수로.

## 빌더/추론 타입 (직접 참조 드묾)

- `ColumnBuilderRecord` — `Record<string, ColumnBuilder<...>>`. `columns`/`params`/`returns` 반환 타입.
- `RelationBuilderRecord` — 4종 relation 빌더의 union 레코드. `relations` 반환 타입.
- `InferColumns<T>` / `InferInsertColumns<T>` / `InferUpdateColumns<T>` / `InferColumnExprs<T>` — column 레코드에서 각각 값 타입 / INSERT 입력 / UPDATE 입력 / `ExprInput` 입력 타입을 추론. `$inferColumns` 등 내부 사용.
- `RequiredInsertKeys<T>` / `OptionalInsertKeys<T>` — INSERT 시 필수/선택 column key 분리(autoIncrement·nullable·default 가 선택).
- `DataToColumnBuilderRecord<TData>` — 데이터 레코드 → column 빌더 레코드 역변환. `insertInto` 의 대상 테이블 제약에 사용.
- `InferDeepRelations<T>` / `ExtractRelationTarget<T>` / `ExtractRelationTargetResult<T>` — 관계 정의에서 심층 결과 타입을 optional 로 추론(같은 테이블 재방문 시 순환 차단). `$inferSelect` 의 관계 부분.
