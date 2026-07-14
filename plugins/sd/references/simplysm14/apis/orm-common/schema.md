# @simplysm/orm-common — 스키마 빌더

Fluent immutable 빌더로 table/view/procedure 스키마를 정의함. 각 체이닝 메서드는 새 builder 인스턴스를 반환하며, `$infer*` phantom 필드가 컬럼·관계로부터 소비자 타입을 추론함. 사용법: [orm.md](../../manuals/orm.md).

## Table — `Table(name)` / `TableBuilder<TName, TColumns, TRelations = {}>`

`Table(name)` 은 빈 `TableBuilder` 를 만듦. `.columns().primaryKey().indexes().relations()` 로 정의를 누적함.

### $infer 추론 타입 (소비자 타입)

- `$inferSelect` — `InferColumns<TColumns> & InferDeepRelations<TRelations>`. SELECT 결과 행 타입. 관계는 lazy 하게 다단계 해소되며 모두 optional(`include` 안 하면 `undefined`), 순환은 같은 테이블 재방문 시 컬럼만 반환해 끊음.
- `$inferColumns` — `InferColumns<TColumns>`. 관계 제외, 컬럼만의 값 타입.
- `$inferInsert` — `InferInsertColumns<TColumns>`. INSERT 입력. `autoIncrement`/`nullable`/`default` 컬럼은 optional, 나머지는 필수.
- `$inferUpdate` — `InferUpdateColumns<TColumns>`. UPDATE 입력. 모든 필드 optional.

### 체이닝 메서드 (모두 새 인스턴스 반환)

- `description(desc: string)` — 테이블 DDL 코멘트.
- `database(db: string)` — 데이터베이스명.
- `schema(schema: string)` — 스키마명(MSSQL/PostgreSQL).
- `columns(fn)` — `fn(c)` 가 `createColumnFactory()` 의 `c` 로 컬럼 레코드를 반환. `TColumns` 를 갱신.
- `primaryKey(...columns)` — PK 컬럼명 가변인자. 컬럼 key 로 제약, 복합 PK 지원.
- `indexes(fn)` — `fn(i)` 가 `createIndexFactory()` 의 `i` 로 `IndexBuilder[]` 반환.
- `relations(fn)` — `fn(r)` 가 `TableRelationFactory`(FK+RelationKey 모두 가능)로 관계 레코드 반환. 제네릭 `T` 는 **무제약**이라 `() => typeof X` 타겟이 const 형성 중 eager 평가되지 않아 TS6 순환을 피함.

### meta (런타임 구조)

`{ name, description?, database?, schema?, columns?, primaryKey?: (keyof TColumns & string)[], relations?, indexes?: IndexBuilder[] }`.

## View — `View(name)` / `ViewBuilder<TDbContext, TName, TData, TRelations = {}>`

`View(name)` 은 빈 `ViewBuilder` 를 만듦. `$inferSelect` = `TData & InferDeepRelations<TRelations>`.

- `description(desc)` / `database(db)` / `schema(schema)` — table 과 동일.
- `query(viewFn)` — `(db) => Queryable<TViewData, any>` 를 받아 view 데이터 소스 SELECT 를 정의함. 반환 builder 의 `TData` 가 `TViewData` 로 확정됨.
- `relations(fn)` — `fn(r)` 가 `ViewRelationFactory`(RelationKey 계열만 가능)로 관계 반환. table 과 달리 DB FK 를 만들지 않는 논리 관계만 허용.

## Procedure — `Procedure(name)` / `ProcedureBuilder<TParams, TReturns>`

`Procedure(name)` 은 `ProcedureBuilder<never, never>` 를 만든다. `$params`/`$returns` phantom 필드로 파라미터·반환 컬럼 타입을 추론(`Executable` 이 사용).

- `description(desc)` / `database(db)` / `schema(schema)` — 동일.
- `params(fn)` — column factory 로 입력 파라미터 정의, `TParams` 갱신.
- `returns(fn)` — column factory 로 반환 컬럼 정의, `TReturns` 갱신.
- `body(sql: string)` — 프로시저 본문 SQL. DBMS 별 파라미터 구문 차이 주의(MySQL `userId`, MSSQL `@userId`, PostgreSQL `RETURN QUERY`).

## Column — `createColumnFactory()` / `ColumnBuilder<TValue, TMeta>`

`createColumnFactory()` 가 반환하는 객체의 메서드로 컬럼 타입을 만듦. 각 메서드는 `ColumnBuilder` 를 반환하며 값 타입(TS) 과 SQL `dataType` 을 함께 고정함.

| 메서드                       | 값 타입    | SQL / DBMS 매핑                                     |
| ---------------------------- | ---------- | --------------------------------------------------- |
| `int()`                      | `number`   | INT(4B)                                             |
| `bigint()`                   | `number`   | BIGINT(8B)                                          |
| `float()`                    | `number`   | FLOAT(단정밀도)                                     |
| `double()`                   | `number`   | DOUBLE(배정밀도)                                    |
| `decimal(precision, scale?)` | `number`   | DECIMAL(고정 소수점)                                |
| `varchar(length)`            | `string`   | VARCHAR(가변 길이)                                  |
| `char(length)`               | `string`   | CHAR(고정 길이)                                     |
| `text()`                     | `string`   | TEXT/LONGTEXT                                       |
| `binary()`                   | `Bytes`    | MySQL LONGBLOB / MSSQL VARBINARY(MAX) / PG BYTEA    |
| `boolean()`                  | `boolean`  | MySQL TINYINT(1) / MSSQL BIT / PG BOOLEAN           |
| `datetime()`                 | `DateTime` | DATETIME                                            |
| `date()`                     | `DateOnly` | DATE                                                |
| `time()`                     | `Time`     | TIME                                                |
| `uuid()`                     | `Uuid`     | MySQL BINARY(16) / MSSQL UNIQUEIDENTIFIER / PG UUID |

`ColumnBuilder` 체이닝(각각 새 인스턴스):

- `autoIncrement()` — 자동 증가. INSERT 추론에서 optional 처리.
- `nullable()` — NULL 허용. 값 타입에 `undefined` 추가, INSERT 에서 optional.
- `default(value: TValue)` — 기본값. INSERT 에서 optional.
- `description(desc: string)` — 컬럼 DDL 코멘트.

### Column 추론 유틸 타입

- `ColumnBuilderRecord` — `Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>`. `columns()`/`params()`/`returns()` 콜백 반환 타입.
- `InferColumns<T>` — 각 컬럼의 값 타입 레코드(`ColumnBuilder<V,...>` → `V`).
- `InferColumnExprs<T>` — 각 컬럼을 `ExprInput<V>`(값 또는 `ExprUnit`)로. 프로시저 파라미터 입력에 사용.
- `RequiredInsertKeys<T>` — `autoIncrement`/`nullable`/`default` 없는 필수 컬럼 key.
- `OptionalInsertKeys<T>` — 위 외 선택 컬럼 key.
- `InferInsertColumns<T>` — 필수 key 는 `Pick`, 선택 key 는 `Partial`.
- `InferUpdateColumns<T>` — 전체 `Partial`.
- `DataToColumnBuilderRecord<TData>` — `DataRecord` 의 `ColumnPrimitive` 필드만 `ColumnBuilder` 레코드로 역변환. `Queryable.insertInto` 의 대상 테이블 컬럼 제약에 사용.

## Index — `createIndexFactory<TColumnKey>()` / `IndexBuilder<TKeys extends string[]>`

`createIndexFactory().index(...columns)` 로 `IndexBuilder` 생성. 컬럼명은 테이블 컬럼 key 로 제약.

- `name(name: string)` — 인덱스명.
- `unique()` — 유니크 인덱스.
- `orderBy(...orderBy)` — 컬럼별 `"ASC" | "DESC"` 가변인자(컬럼 수와 일치).
- `description(description: string)` — 인덱스 코멘트.

meta: `{ columns: TKeys, name?, unique?, orderBy?: ("ASC"|"DESC")[], description? }`.

## Relation — `createRelationFactory<TColumnKey>()` + 관계 빌더 클래스

table 은 `TableRelationFactory`(= `RelationFkFactory & RelationRkFactory`), view 는 `ViewRelationFactory`(= `RelationRkFactory`) 를 콜백 인자로 받음. 관계 description/single 은 메서드 체이닝이 아니라 factory 의 `opts` 인자로 전달함(순환 참조 TS7022 회피).

### factory 메서드

- `foreignKey(columns: TColumnKey[], targetFn, opts?: { description? })` → `ForeignKeyBuilder`. N:1, **DB FK 제약 생성**. `targetFn` 은 `() => Table` 타겟(무제약, lazy).
- `foreignKeyTarget(targetTableFn, relationName, opts)` → `ForeignKeyTargetBuilder`. 1:N 역참조(DB FK 생성). `opts.single: true` 면 단일 객체(1:1), 미지정/`false` 면 배열. `relationName` 은 대상 테이블의 FK 관계명.
- `relationKey(columns, targetFn, opts?)` → `RelationKeyBuilder`. N:1, **DB FK 미생성** 논리 관계. View 에서도 사용 가능.
- `relationKeyTarget(targetTableFn, relationName, opts)` → `RelationKeyTargetBuilder`. 1:N 논리 역참조(DB FK 미생성). `opts.single` 동작은 `foreignKeyTarget` 과 동일.

### 관계 빌더 클래스 (meta 보관)

- `ForeignKeyBuilder<TTargetFn>` — meta `{ columns: string[], targetFn, description? }`.
- `ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle>` — meta `{ targetTableFn, relationName, description?, isSingle? }`.
- `RelationKeyBuilder<TTargetFn>` — `ForeignKeyBuilder` 와 같은 형태, DB FK 만 미생성.
- `RelationKeyTargetBuilder<TTargetTableFn, TIsSingle>` — `ForeignKeyTargetBuilder` 와 같은 형태, DB FK 만 미생성.
- `RelationBuilderRecord` — 위 네 빌더의 유니온 레코드. `relations()` 콜백 반환 타입.

### 관계 추론 타입 (소비자 타입)

- `ExtractRelationTarget<TRelation, TVisited>` — FK/RelationKey(N:1)의 단일 대상 타입. 대상 Table 이면 `컬럼 & 심층관계`, View 이면 `데이터 & 심층관계`. `TVisited` 에 이미 있는 이름이면 컬럼/데이터만 반환(순환 차단).
- `ExtractRelationTargetResult<TRelation, TVisited>` — FKTarget/RelationKeyTarget(1:N)의 대상 타입. `TIsSingle extends true` 면 단일 객체, 아니면 배열.
- `InferDeepRelations<TRelations, TVisited>` — 관계 레코드의 각 key 를 위 둘의 유니온으로, **전부 optional**(`include` 안 하면 `undefined`). 무제약 입력이라 관계 없는 `{}` 테이블도 빈 객체로 안전 해소.

## _Migration (`models/system-migration.ts`)

`_Migration` — `Table("_migration")` 으로 정의된 시스템 마이그레이션 테이블 빌더. 컬럼 `code: varchar(255)`, PK `code`. 적용된 마이그레이션 이름을 적재하며 `DbContext._migration`/`initialize` 가 사용함.
