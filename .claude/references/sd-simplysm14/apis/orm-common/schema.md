# @simplysm/orm-common — 스키마 정의 (Table / View / Procedure / column / index / relation)

DB 객체(Table/View/Procedure)와 그 구성요소(column/index/관계)를 fluent 빌더로 선언하는 묶음. 모든 빌더는 immutable — 각 메서드가 새 인스턴스를 반환한다. 정의한 빌더는 `DbContext` 안에서 `this.queryable()`/`this.executable()` 로 등록해 사용한다. column 은 기본 `NOT NULL` 이며 `.nullable()`/`.default(...)` 는 도메인 근거가 있을 때만 붙인다(orm.md 정책).

## Table / TableBuilder

```typescript
function Table<TName extends string>(name: TName): TableBuilder<TName, {}, {}>;
```

`Table(name)` 으로 시작해 fluent 체이닝으로 정의한다. 각 메서드는 새 `TableBuilder` 를 반환.

- `database(db)` — 데이터베이스 이름 설정. dialect 네임스페이스 산출에 사용.
- `schema(schema)` — 스키마 이름 설정(MSSQL: dbo, PostgreSQL: public). MySQL 은 무시.
- `description(desc)` — 테이블 코멘트(DDL COMMENT). 문서화 목적.
- `columns((c) => ({...}))` — column 정의. `c` 는 column 팩토리(아래). 반환 객체의 키가 컬럼명.
- `primaryKey(...columns)` — PK 컬럼 지정(가변 인자). 둘 이상이면 복합 PK.
- `indexes((i) => [...])` — 인덱스 정의. `i` 는 index 팩토리.
- `relations((r) => ({...}))` — 관계(FK/역참조/논리관계) 정의. `r` 은 relation 팩토리.

타입 추론 필드(런타임 값 아님): `$inferSelect`(컬럼+관계), `$inferColumns`(컬럼만), `$inferInsert`(autoIncrement/nullable/default 는 optional), `$inferUpdate`(전부 optional). `Queryable` 의 결과/입력 타입이 여기서 파생된다.

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.int().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    isActive: c.boolean().default(true),
    companyId: c.int().nullable(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company),
    posts: r.foreignKeyTarget(() => Post, "user"),
  }));
```

## column 팩토리 / ColumnBuilder

`columns((c) => ...)` 의 `c` 가 노출하는 타입 생성 메서드. 각자 `ColumnBuilder` 를 반환하고, 그 위에 수식 메서드를 체이닝한다.

타입 메서드:

- `int()` — INT(4바이트 정수). 일반 정수 PK/카운트.
- `bigint()` — BIGINT(8바이트 정수). 큰 범위 ID.
- `float()` — 단정밀도 부동소수점. 정밀도 덜 중요한 실수.
- `double()` — 배정밀도 부동소수점. 일반 실수 연산.
- `decimal(precision, scale?)` — 고정 소수점. `precision`=전체 자릿수, `scale`=소수 자릿수(선택). 금액처럼 반올림 오차가 곤란한 값.
- `varchar(length)` — 가변 길이 문자열. `length`=최대 길이.
- `char(length)` — 고정 길이 문자열. 코드값처럼 길이가 일정한 값.
- `text()` — 대용량 텍스트(본문 등).
- `binary()` — 바이너리(MySQL LONGBLOB / MSSQL VARBINARY(MAX) / PostgreSQL BYTEA). 값 타입은 `Bytes`.
- `boolean()` — 불리언(MySQL TINYINT(1) / MSSQL BIT / PostgreSQL BOOLEAN).
- `datetime()` — 날짜+시간. 값 타입 `DateTime`.
- `date()` — 날짜만. 값 타입 `DateOnly`.
- `time()` — 시간만. 값 타입 `Time`.
- `uuid()` — UUID(MySQL BINARY(16) / MSSQL UNIQUEIDENTIFIER / PostgreSQL UUID). 값 타입 `Uuid`.

수식 메서드(`ColumnBuilder`):

- `autoIncrement()` — 자동 증가. INSERT 타입에서 optional 처리. 보통 정수 PK 에만.
- `nullable()` — NULL 허용. 값 타입에 `undefined` 추가, INSERT 타입에서 optional. 도메인상 값이 없을 수 있을 때만.
- `default(value)` — INSERT 시 미지정이면 사용할 기본값. INSERT 타입에서 optional. 사용자가 명시적으로 지시한 경우에만.
- `description(desc)` — 컬럼 코멘트(DDL COMMENT).

## index 팩토리 / IndexBuilder

`indexes((i) => [...])` 의 `i.index(...columns)` 로 시작. immutable 체이닝.

- `index(...columns)` — 인덱스 대상 컬럼(가변 인자, 복합 인덱스 가능). `IndexBuilder` 반환.
- `name(name)` — 인덱스 이름 지정. 미지정 시 자동 명명.
- `unique()` — 유니크 인덱스로 설정. 중복 방지 제약이 필요할 때.
- `orderBy(...orderBy)` — 컬럼별 정렬 방향(`"ASC" | "DESC"`). 인자 수가 컬럼 수와 일치해야 함. 범위/정렬 조회 최적화용.
- `description(desc)` — 인덱스 코멘트.

```typescript
.indexes((i) => [
  i.index("email").unique(),
  i.index("status", "createdAt").orderBy("ASC", "DESC"),
])
```

## relation 팩토리 / 관계 빌더

`relations((r) => ({...}))` 의 `r` 가 노출하는 관계 정의 메서드. Table 은 FK 계열 + RelationKey 계열 모두, View 는 RelationKey 계열만 사용 가능. 관계는 `include()`(queryable.md)로 자동 조인되며, 정의만 한다고 DB 쿼리가 나가지는 않는다. `description`/`single` 등 옵션은 메서드 체이닝이 아니라 마지막 `opts` 인자로 전달한다(순환 참조로 인한 TS7022 회피 목적).

- `foreignKey(columns, targetFn, opts?)` — N:1 FK. DB 에 실제 FK 제약 생성. `columns`=현재 테이블의 FK 컬럼 배열, `targetFn`=대상 테이블 지연 팩토리(`() => User`). `opts.description` 선택.
- `foreignKeyTarget(targetTableFn, relationName, opts?)` — 1:N 역참조. DB 객체는 안 만들고 `include` 시 배열로 로드. `relationName`=대상 테이블에 정의된 FK 관계 이름. `opts.single: true` 면 단일 객체(1:1)로 로드, `opts.description` 선택.
- `relationKey(columns, targetFn, opts?)` — N:1 논리 관계. `foreignKey` 와 동일하나 DB FK 제약을 생성하지 않음. View 에서도 사용 가능. 물리 FK 를 걸 수 없는 관계(뷰↔테이블 등)에 사용.
- `relationKeyTarget(targetTableFn, relationName, opts?)` — 1:N 논리 역참조. `foreignKeyTarget` 의 FK 미생성 버전. `opts.single`/`opts.description` 동일.

opts 공통 필드:

- `description`: string — 관계 코멘트.
- `single`: true — (target 계열만) 역참조를 배열이 아닌 단일 객체로 로드. 1:1 관계일 때.

```typescript
const Post = Table("Post")
  .columns((c) => ({ id: c.int().autoIncrement(), userId: c.int(), title: c.varchar(300) }))
  .primaryKey("id")
  .relations((r) => ({
    user: r.foreignKey(["userId"], () => User, { description: "작성자" }),
  }));
```

빌더 클래스: `ForeignKeyBuilder`, `ForeignKeyTargetBuilder`, `RelationKeyBuilder`, `RelationKeyTargetBuilder` 가 export 되며, `meta` 프로퍼티로 정의 내용을 노출한다(DDL 자동화·검증용). 보통 직접 `new` 하지 않고 위 팩토리로 생성한다.

## View / ViewBuilder

```typescript
function View(name: string): ViewBuilder<...>;
```

쿼리 결과를 가상 테이블로 정의한다. `query` 콜백 안에서 `DbContext` 를 받아 `Queryable` 을 반환하면 그것이 뷰 본문이 된다.

- `database(db)` / `schema(schema)` / `description(desc)` — Table 과 동일.
- `query((db) => db.x().select(...))` — 뷰 본문 SELECT 정의. `db` 는 `DbContext`, 반환은 `Queryable`. select 결과 컬럼이 뷰 컬럼이 됨.
- `relations((r) => ({...}))` — 논리 관계(RelationKey 계열)만 정의 가능.

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: AppDb) =>
    db.user().where((u) => [expr.eq(u.isActive, true)]).select((u) => ({ id: u.id, name: u.name })),
  );
```

## Procedure / ProcedureBuilder

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>;
```

저장 프로시저를 정의한다. `executable()` 로 등록 후 `Executable.execute(params)`(queryable.md)로 호출.

- `database(db)` / `schema(schema)` / `description(desc)` — 동일.
- `params((c) => ({...}))` — 입력 파라미터 정의. `c` 는 column 팩토리. 키가 파라미터명.
- `returns((c) => ({...}))` — 반환 결과 컬럼 정의.
- `body(sql)` — 프로시저 본문 SQL. dialect 별 파라미터 구문 차이 주의(MySQL/PostgreSQL: `userId`, MSSQL: `@userId`).

타입 추론 필드: `$params`, `$returns`(`Executable` 의 입력/출력 타입 파생).

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

## 타입 추론 유틸 / 기타 export

column-builder 가 함께 export 하는 타입(주로 빌더 내부·executor·고급 타입 작업용):

- `ColumnBuilderRecord` — `Record<string, ColumnBuilder<...>>`. `columns()` 반환 타입.
- `InferColumns<T>` — column 빌더 레코드에서 실제 값 타입 추론.
- `InferColumnExprs<T>` — 각 컬럼을 `ExprInput<V>` 로 추론(프로시저 파라미터 타입 등).
- `InferInsertColumns<T>` / `InferUpdateColumns<T>` — INSERT(필수/optional 분리)·UPDATE(전부 optional) 타입.
- `RequiredInsertKeys<T>` / `OptionalInsertKeys<T>` — INSERT 필수/optional 키 집합.
- `DataToColumnBuilderRecord<TData>` — 데이터 레코드를 column 빌더 레코드로 역변환(`insertInto` 대상 테이블 제약에 사용).
- `RelationBuilderRecord` — 관계 빌더 레코드 타입.
- `InferDeepRelations<TRelations>` / `ExtractRelationTarget<T>` / `ExtractRelationTargetResult<T>` — 관계를 통한 심층 타입 추론(관계는 `include` 전이라 모두 optional 로 추론).

`Table`/`View`/`Procedure` 빌더와 `_Migration`(시스템 마이그레이션 테이블 정의)도 함께 노출된다.
