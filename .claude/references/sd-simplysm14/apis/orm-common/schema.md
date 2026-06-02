# @simplysm/orm-common — 스키마 정의

DB 객체(Table/View/Procedure)와 그 구성요소(Column/Index/관계)를 fluent 빌더로 선언하는 묶음. 모든 빌더는 immutable — 각 메서드가 새 인스턴스를 반환한다. 정의한 빌더는 `DbContext` 의 `queryable()`/`executable()` 로 등록한다.

## Table / TableBuilder

테이블 정의 빌더. `Table(name)` 으로 시작해 메서드 체이닝.

- `Table<TName>(name: TName): TableBuilder` — 빈 테이블 빌더 생성.
- `TableBuilder.description(desc: string)` — 테이블 설명. DDL Comment 로 사용.
- `TableBuilder.database(db: string)` — 소속 database 이름.
- `TableBuilder.schema(schema: string)` — schema 이름(MSSQL=dbo, PostgreSQL=public). MySQL 은 무시.
- `TableBuilder.columns(fn: (c) => Record<string, ColumnBuilder>)` — column 정의. `c` 는 column factory(아래 ColumnBuilder factory). 타입 추론의 핵심.
- `TableBuilder.primaryKey(...columns: string[])` — PK column 지정. 여러 개 전달 시 복합 PK.
- `TableBuilder.indexes(fn: (i) => IndexBuilder[])` — index 정의. `i` 는 index factory.
- `TableBuilder.relations(fn: (r) => Record<string, RelationBuilder>)` — FK/역참조 관계 정의. `r` 은 relation factory(FK + RelationKey 모두 사용 가능).
- `TableBuilder.meta` — 위 설정이 담긴 메타(`name`/`description`/`database`/`schema`/`columns`/`primaryKey`/`relations`/`indexes`). 런타임에서 읽음.
- 타입 추론 프로퍼티(값은 없고 타입만): `$inferSelect`(column+관계 전체), `$inferColumns`(column 만), `$inferInsert`(autoIncrement/nullable/default 는 optional), `$inferUpdate`(전부 optional).

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({ posts: r.foreignKeyTarget(() => Post, "author") }));
```

## View / ViewBuilder

뷰 정의 빌더. SELECT Queryable 로 데이터 소스를 정의. 관계는 RelationKey 만 가능(DB FK 미생성).

- `View(name: string): ViewBuilder` — 빈 뷰 빌더 생성.
- `ViewBuilder.description(desc: string)` — 뷰 설명(DDL Comment).
- `ViewBuilder.database(db: string)` — 소속 database 이름.
- `ViewBuilder.schema(schema: string)` — schema 이름(MSSQL/PostgreSQL).
- `ViewBuilder.query(viewFn: (db) => Queryable)` — 뷰 본문 SELECT 정의. `db` 는 DbContext, 반환은 Queryable.
- `ViewBuilder.relations(fn: (r) => ...)` — 관계 정의(`relationKey`/`relationKeyTarget` 만).
- `ViewBuilder.meta` — `name`/`description`/`database`/`schema`/`viewFn`/`relations`.
- `$inferSelect` — 뷰 데이터 타입(타입 추론용).

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) => db.user().where((u) => [expr.eq(u.status, "active")]));
```

## Procedure / ProcedureBuilder

저장 프로시저 정의 빌더. `DbContext.executable()` 로 등록해 `Executable` 로 실행.

- `Procedure(name: string): ProcedureBuilder` — 빈 프로시저 빌더 생성.
- `ProcedureBuilder.description(desc: string)` — 설명(DDL Comment).
- `ProcedureBuilder.database(db: string)` — 소속 database.
- `ProcedureBuilder.schema(schema: string)` — schema 이름.
- `ProcedureBuilder.params(fn: (c) => Record<string, ColumnBuilder>)` — 입력 파라미터 정의(column factory 사용).
- `ProcedureBuilder.returns(fn: (c) => Record<string, ColumnBuilder>)` — 반환 결과 column 정의.
- `ProcedureBuilder.body(sql: string)` — 본문 SQL. DBMS별 구문 차이 주의(MySQL: `param`, MSSQL: `@param`, PostgreSQL: `RETURN QUERY` 필요).
- `ProcedureBuilder.meta` — `name`/`description`/`database`/`schema`/`params`/`returns`/`query`.
- `$params` / `$returns` — 타입 추론용.

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

## ColumnBuilder / createColumnFactory

`columns()`/`params()`/`returns()` 콜백의 `c` 로 받는 factory. 타입별 메서드로 column 을 만든 뒤 modifier 체이닝.

factory 타입 메서드:
- `c.int()` — INT(4바이트). 값 타입 `number`.
- `c.bigint()` — BIGINT(8바이트). 값 타입 `number`(bigint 아님).
- `c.float()` — FLOAT(4바이트 단정밀도). `number`.
- `c.double()` — DOUBLE(8바이트 배정밀도). `number`.
- `c.decimal(precision, scale?)` — DECIMAL 고정소수점. `precision` 전체 자릿수, `scale` 소수 자릿수(선택). `number`.
- `c.varchar(length)` — VARCHAR(가변). `length` 최대 길이. `string`.
- `c.char(length)` — CHAR(고정). `string`.
- `c.text()` — TEXT 대용량. `string`.
- `c.binary()` — 바이너리(MySQL=LONGBLOB, MSSQL=VARBINARY(MAX), PostgreSQL=BYTEA). `Bytes`.
- `c.boolean()` — BOOLEAN(MySQL=TINYINT(1), MSSQL=BIT, PostgreSQL=BOOLEAN). `boolean`.
- `c.datetime()` — DATETIME(날짜+시간). `DateTime`.
- `c.date()` — DATE(날짜만). `DateOnly`.
- `c.time()` — TIME(시간만). `Time`.
- `c.uuid()` — UUID(MySQL=BINARY(16), MSSQL=UNIQUEIDENTIFIER, PostgreSQL=UUID). `Uuid`.

modifier(생성된 ColumnBuilder 에 체이닝):
- `.autoIncrement()` — 자동 증가. INSERT 타입에서 optional 처리. (PK 식별 시 OUTPUT 의 aiColName 으로도 사용)
- `.nullable()` — NULL 허용. 값 타입에 `undefined` 추가, INSERT 타입에서 optional.
- `.default(value)` — INSERT 시 미지정 기본값. INSERT 타입에서 optional. (예: `"CURRENT_TIMESTAMP"`)
- `.description(desc)` — column 설명(DDL Comment).
- `ColumnBuilder.meta` — `ColumnMeta`(`type`/`dataType`/`autoIncrement?`/`nullable?`/`default?`/`description?`).

```typescript
.columns((c) => ({
  id: c.bigint().autoIncrement(),
  status: c.varchar(20).default("active"),
  email: c.varchar(200).nullable(),
}))
```

## IndexBuilder / createIndexFactory

`indexes()` 콜백의 `i` factory.

- `i.index(...columns: string[]): IndexBuilder` — index 생성. 여러 column 전달 시 복합 index.
- `IndexBuilder.name(name)` — index 이름 지정(미지정 시 자동).
- `IndexBuilder.unique()` — 유니크 index.
- `IndexBuilder.orderBy(...orderBy: ("ASC"|"DESC")[])` — column 별 정렬 방향. column 수와 인자 수 일치 필요.
- `IndexBuilder.description(description)` — index 설명(DDL Comment).
- `IndexBuilder.meta` — `columns`/`name?`/`unique?`/`orderBy?`/`description?`.

```typescript
.indexes((i) => [
  i.index("email").unique(),
  i.index("status", "createdAt").orderBy("ASC", "DESC"),
])
```

## 관계 빌더 (relations 콜백의 r factory)

Table 의 `relations()` 는 FK+RelationKey 둘 다, View 의 `relations()` 는 RelationKey 만 사용 가능.

- `r.foreignKey(columns: string[], targetFn: () => Table, opts?: { description? })` — N:1 FK(DB FK 제약 생성). `columns` 는 owner 의 FK column, `targetFn` 은 지연 평가 대상 테이블. → `ForeignKeyBuilder`.
- `r.foreignKeyTarget(targetTableFn: () => Table, relationName: string, opts?: { single?: boolean; description? })` — 1:N 역참조(DB FK 생성 측의 반대편). `relationName` 은 대상 테이블에 정의된 FK 관계 이름. `single:true` 면 단일 객체(1:1), 기본은 배열. → `ForeignKeyTargetBuilder`.
- `r.relationKey(columns, targetFn, opts?)` — N:1 논리 관계(DB FK **미생성**). View 에서도 사용. → `RelationKeyBuilder`.
- `r.relationKeyTarget(targetTableFn, relationName, opts?: { single?; description? })` — 1:N 논리 역참조(DB FK 미생성). `single:true` → 단일. → `RelationKeyTargetBuilder`.

각 관계 빌더의 `meta`:
- `ForeignKeyBuilder.meta` / `RelationKeyBuilder.meta` — `ownerFn`/`columns`/`targetFn`/`description?`.
- `ForeignKeyTargetBuilder.meta` / `RelationKeyTargetBuilder.meta` — `targetTableFn`/`relationName`/`description?`/`isSingle?`.

> 주의: `description`/`single` 은 메서드 체이닝(`.description()`)이 아니라 factory 의 `opts` 인자로 전달한다(순환 참조 TS7022 회피).

```typescript
const Post = Table("Post")
  .columns((c) => ({ id: c.bigint().autoIncrement(), authorId: c.bigint() }))
  .primaryKey("id")
  .relations((r) => ({ author: r.foreignKey(["authorId"], () => User, { description: "작성자" }) }));
```

## 타입 추론 유틸 / 레코드 타입

빌더에서 export 되는 추론 헬퍼·레코드 타입(직접 타입 작성 시):

- `ColumnBuilderRecord` — `Record<string, ColumnBuilder>`. `columns()` 반환 타입.
- `InferColumns<TBuilders>` — column 레코드 → 값 타입 객체.
- `InferColumnExprs<TBuilders>` — column 레코드 → `ExprInput` 입력 타입 객체(프로시저 params).
- `InferInsertColumns<TBuilders>` — INSERT 타입(필수/optional 분리).
- `InferUpdateColumns<TBuilders>` — UPDATE 타입(전부 Partial).
- `RequiredInsertKeys` / `OptionalInsertKeys` — INSERT 필수/선택 key 추출.
- `DataToColumnBuilderRecord<TData>` — 데이터 레코드 → column 빌더 레코드(insertInto 타입 매칭용).
- `RelationBuilderRecord` — 4개 관계 빌더 union 의 레코드.
- `InferDeepRelations<TRelations, TVisited?>` — 관계 정의 → 심층 관계 타입(전부 optional, 동일 테이블 재방문 시 순환 차단).
- `ExtractRelationTarget` / `ExtractRelationTargetResult` — 단일(N:1)/배열·단일(1:N) 대상 타입 추출.
