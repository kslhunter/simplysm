# @simplysm/orm-common — 스키마 정의

DB 객체(Table/View/Procedure)와 그 구성요소(Column/Index/관계)를 fluent 빌더로 선언하는 묶음. 모든 빌더는 immutable — 각 메서드가 새 인스턴스를 반환한다. 정의한 빌더는 `DbContext` 안에서 `this.queryable()`/`this.executable()` 로 등록한다.

## Table / TableBuilder

`Table(name)` → `TableBuilder` 시작점. 체이닝으로 database·schema·columns·primaryKey·indexes·relations 를 붙인다.

- `Table<TName>(name: TName): TableBuilder` — 이름만 가진 빈 빌더 생성. 이후 체이닝으로 정의를 쌓음.
- `description(desc: string)` — 테이블 설명. DDL 코멘트로 쓰임. 스키마 문서화·DB 코멘트가 필요할 때.
- `database(db: string)` — 소속 database 이름. dialect별 네임스페이스의 첫 분절. 멀티 DB 환경에서 필수.
- `schema(schema: string)` — schema 이름. MSSQL(dbo)·PostgreSQL(public) 에서만 의미. MySQL 은 무시.
- `columns(fn: (c) => Record<string, ColumnBuilder>)` — 컬럼 정의. `c` 는 `createColumnFactory()` 결과(int/varchar/... 타입 메서드). 타입 추론(`$inferSelect` 등)의 기준이 됨.
- `primaryKey(...columns)` — PK 컬럼 키. 여러 개 넘기면 복합 PK. CUD 의 output(pkColNames)·include 의 FK↔PK 매칭에 사용.
- `indexes(fn: (i) => IndexBuilder[])` — 인덱스 배열. `i` 는 `createIndexFactory()` 결과(`i.index(...cols)`). DDL `addIndex` 생성에 사용.
- `relations(fn: (r) => Record<string, 관계빌더>)` — FK/역참조 관계. `r` 는 Table 일 때 foreignKey/foreignKeyTarget/relationKey/relationKeyTarget 모두 제공. include() 자동 조인의 근거.

추론 전용 가상 프로퍼티(런타임 값 없음, 타입만): `$inferSelect`(컬럼+관계, 관계는 optional), `$inferColumns`(컬럼만), `$inferInsert`(autoIncrement/nullable/default 제외 시 필수), `$inferUpdate`(전부 optional).

```typescript
const Post = Table("Post")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
    content: c.text().nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("authorId")])
  .relations((r) => ({ author: r.foreignKey(["authorId"], () => User) }));
```

## View / ViewBuilder

`View(name)` → `ViewBuilder`. `query()` 로 SELECT Queryable 을 데이터 소스로 지정. View 는 컬럼 추론을 query 결과 타입(`TData`)에서 얻고, FK 는 등록하지 않으므로 관계는 relationKey 계열만 쓴다.

- `View(name: string): ViewBuilder` — 빈 View 빌더.
- `description(desc)` / `database(db)` / `schema(schema)` — Table 과 동일 의미.
- `query<TViewData, TDb>(viewFn: (db: TDb) => Queryable<TViewData, any>)` — View 본문 SELECT. `db` 는 DbContext, 반환 Queryable 의 컬럼 구조가 View 컬럼이 됨. `queryable()` 등록 시 이 viewFn 을 실행해 컬럼 alias 를 재배치함.
- `relations(fn: (r) => ...)` — 관계 정의. View 의 `r` 은 relationKey/relationKeyTarget 만 제공(DB FK 미생성). 반환 타입에 관계가 합쳐짐(`TData & InferDeepRelations`).

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select((u) => ({ id: u.id, name: u.name })),
  );
```

## Procedure / ProcedureBuilder

`Procedure(name)` → `ProcedureBuilder`. 파라미터·반환 컬럼·본문 SQL 을 정의. `DbContext.executable()` 로 등록해 `Executable` 로 실행한다.

- `Procedure(name: string): ProcedureBuilder<never, never>` — 빈 프로시저 빌더.
- `description(desc)` / `database(db)` / `schema(schema)` — Table 과 동일 의미.
- `params(fn: (c) => Record<string, ColumnBuilder>)` — 입력 파라미터. `c` 는 컬럼 factory. dialect별 호출 구문 차이(MSSQL `@param`, MySQL/PG `param`) 주의.
- `returns(fn: (c) => ...)` — 반환 결과 컬럼. 결과 행 타입 추론에 사용.
- `body(sql: string)` — 본문 SQL(메타 키는 `query`). dialect별 구문 차이(MSSQL `@param`·`[User]`, PG `RETURN QUERY`) 주의.

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

## ColumnBuilder / createColumnFactory

`createColumnFactory()` 가 타입별 컬럼 생성 메서드를 반환하고, 각 메서드의 결과 `ColumnBuilder` 에 수식자를 체이닝한다.

타입 메서드(전부 인자 없음, decimal/varchar/char 제외):

- `int()` — INT(4B, ±2^31). 일반 정수.
- `bigint()` — BIGINT(8B, ±2^63). ID·대용량 정수.
- `float()` — FLOAT(4B 단정밀도). 근사 실수.
- `double()` — DOUBLE(8B 배정밀도). 근사 실수 고정밀.
- `decimal(precision, scale?)` — DECIMAL 고정소수점. `precision`=전체 자릿수, `scale`=소수 자릿수. 금액 등 정확값.
- `varchar(length)` — 가변 길이 문자열. `length`=최대 길이.
- `char(length)` — 고정 길이 문자열. `length`=고정 길이. 코드값 등.
- `text()` — 대용량 텍스트(TEXT/LONGTEXT).
- `binary()` — 바이너리(MySQL LONGBLOB / MSSQL VARBINARY(MAX) / PG BYTEA). 값 타입 `Bytes`.
- `boolean()` — 불리언(MySQL TINYINT(1) / MSSQL BIT / PG BOOLEAN).
- `datetime()` — 날짜+시간(`DateTime`).
- `date()` — 날짜만(`DateOnly`).
- `time()` — 시간만(`Time`).
- `uuid()` — UUID(MySQL BINARY(16) / MSSQL UNIQUEIDENTIFIER / PG UUID). 값 타입 `Uuid`.

수식자(`ColumnBuilder` 메서드):

- `autoIncrement()` — 자동 증가. INSERT 추론에서 optional 처리, CUD output 의 aiColName 으로 식별. PK 자동키에.
- `nullable()` — NULL 허용. 값 타입에 `undefined` 추가, INSERT 추론에서 optional. "값 없음" 가능 컬럼에.
- `default(value)` — DDL 기본값. INSERT 추론에서 optional 처리. `"CURRENT_TIMESTAMP"` 같은 식 문자열도 허용.
- `description(desc)` — 컬럼 코멘트.

```typescript
.columns((c) => ({
  id: c.bigint().autoIncrement(),
  email: c.varchar(200).nullable(),
  status: c.varchar(20).default("active"),
}))
```

추론 유틸 타입: `ColumnBuilderRecord`(컬럼 레코드), `InferColumns`(값 타입), `InferColumnExprs`(ExprInput 타입), `InferInsertColumns`/`InferUpdateColumns`/`RequiredInsertKeys`/`OptionalInsertKeys`(INSERT/UPDATE 추론), `DataToColumnBuilderRecord`(데이터→컬럼 변환, `insertInto` 대상 검증용).

## IndexBuilder / createIndexFactory

`createIndexFactory<TColumnKey>()` → `{ index(...columns) }`. 반환 `IndexBuilder` 에 수식자 체이닝.

- `index(...columns): IndexBuilder` — 인덱스 컬럼 지정(복합 가능).
- `name(name)` — 인덱스 이름. 미지정 시 DDL 생성기가 자동 작명.
- `unique()` — 유니크 인덱스. 중복 방지 제약.
- `orderBy(...orderBy)` — 컬럼별 정렬 방향. 각 값 `"ASC"|"DESC"`, 컬럼 수와 개수 일치 필요. 정렬 최적화 인덱스에.
- `description(description)` — 인덱스 코멘트.

```typescript
.indexes((i) => [
  i.index("email").unique(),
  i.index("status", "createdAt").orderBy("ASC", "DESC"),
])
```

## 관계 빌더 (foreignKey / foreignKeyTarget / relationKey / relationKeyTarget)

`createRelationFactory(ownerFn)` 가 owner 종류에 따라 다른 factory 를 반환: Table 이면 FK 4종 전부, View 이면 relationKey 계열 2종만. `relations()` 콜백의 `r` 가 이 factory. 대상 테이블은 순환 참조 방지를 위해 `() => Table` 지연 함수로 전달.

- `r.foreignKey(columns, () => Target, opts?)` — N:1 FK 관계(DB FK 제약 생성). `columns`=현재 테이블의 FK 컬럼들. `opts.description`=관계 설명. include 시 단일 객체로 로드. → `ForeignKeyBuilder`.
- `r.foreignKeyTarget(() => Target, relationName, opts?)` — 1:N 역참조(DB FK 미생성, 상대 FK 를 역으로 봄). `relationName`=상대 테이블의 FK 관계 이름. `opts.single:true`=1:1 단일 객체로 로드(미지정/false 면 배열). `opts.description`=설명. → `ForeignKeyTargetBuilder`.
- `r.relationKey(columns, () => Target, opts?)` — N:1 논리 관계(DB FK 미생성). foreignKey 와 동일하나 제약 없음. View 에서도 사용 가능. → `RelationKeyBuilder`.
- `r.relationKeyTarget(() => Target, relationName, opts?)` — 1:N 논리 역참조(DB FK 미생성). foreignKeyTarget 과 동일. `opts.single`/`opts.description` 동일. View 에서도 사용 가능. → `RelationKeyTargetBuilder`.

```typescript
// 자식 테이블: N:1
.relations((r) => ({ author: r.foreignKey(["authorId"], () => User, { description: "작성자" }) }))
// 부모 테이블: 1:N 역참조 + 1:1 단일
.relations((r) => ({
  posts: r.foreignKeyTarget(() => Post, "author"),
  profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),
}))
```

빌더 클래스(메타만 보관, 메서드 없음): `ForeignKeyBuilder`/`ForeignKeyTargetBuilder`/`RelationKeyBuilder`/`RelationKeyTargetBuilder`. 추론 타입: `RelationBuilderRecord`, `InferDeepRelations`(관계를 optional 로, 같은 테이블 재방문 시 순환 절단), `ExtractRelationTarget`/`ExtractRelationTargetResult`.

> 주의: description/single 은 반드시 factory `opts` 인자로 전달한다. `.description()`·`.single()` 메서드 체이닝은 TS 순환 참조(TS7022) 때문에 제거되어 존재하지 않는다.
