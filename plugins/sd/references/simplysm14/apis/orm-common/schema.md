# @simplysm/orm-common — 스키마 빌더

`Table`/`View`/`Procedure` 로 DB 객체를 정의하고 column/index/relation 메타와 `$infer*` 타입을 함께 다룰 때 같이 읽는 군. 사용법: [orm.md](../../manuals/orm.md)

## TableBuilder / Table

```ts
function Table<TName extends string>(name: TName): TableBuilder<TName, ColumnBuilderRecord, {}>;
class TableBuilder<TName extends string, TColumns extends ColumnBuilderRecord, TRelations = {}> {
  readonly meta: {
    name: TName;
    description?: string;
    database?: string;
    schema?: string;
    columns?: TColumns;
    primaryKey?: (keyof TColumns & string)[];
    relations?: TRelations;
    indexes?: IndexBuilder<(keyof TColumns & string)[]>[];
  };
  readonly $inferSelect!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  readonly $inferColumns!: InferColumns<TColumns>;
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;
  description(desc: string): TableBuilder<TName, TColumns, TRelations>;
  database(db: string): TableBuilder<TName, TColumns, TRelations>;
  schema(schema: string): TableBuilder<TName, TColumns, TRelations>;
  columns<TNewColumnDefs extends ColumnBuilderRecord>(fn: (c: ReturnType<typeof createColumnFactory>) => TNewColumnDefs): TableBuilder<TName, TNewColumnDefs, TRelations>;
  primaryKey(...columns: (keyof TColumns & string)[]): TableBuilder<TName, TColumns, TRelations>;
  indexes(fn: (i: ReturnType<typeof createIndexFactory<keyof TColumns & string>>) => IndexBuilder<string[]>[]): TableBuilder<TName, TColumns, TRelations>;
  relations<T>(fn: (r: TableRelationFactory<keyof TColumns & string>) => T): TableBuilder<TName, TColumns, T>;
}
```

- `name: TName` — table 이름. `Table(name)` 생성 시 meta에 저장되고 QueryDef 객체명에 쓰인다.
- `description?: string` — table 설명. `description(desc)` 호출 시 meta에 저장된다.
- `database?: string` — table별 database override. 없으면 DbContext database를 사용한다.
- `schema?: string` — table별 schema override. 없으면 DbContext schema를 사용한다.
- `columns?: TColumns` — `columns(fn)` 이 반환한 column builder record.
- `primaryKey?: string[]` — `primaryKey(...columns)` 로 지정한 PK column 목록.
- `relations?: TRelations` — `relations(fn)` 이 반환한 FK/RelationKey builder record.
- `indexes?: IndexBuilder[]` — `indexes(fn)` 이 반환한 index builder 목록.
- `$inferSelect` — column 타입과 optional relation 타입을 합친 SELECT 결과 타입.
- `$inferColumns` — relation 없이 column만 추론한 타입.
- `$inferInsert` — autoIncrement/nullable/default column을 optional로 둔 INSERT 입력 타입.
- `$inferUpdate` — 모든 column이 optional인 UPDATE 입력 타입.
- `description(desc)` — meta.description을 바꾼 새 builder를 반환한다.
- `database(db)` — meta.database를 바꾼 새 builder를 반환한다.
- `schema(schema)` — meta.schema를 바꾼 새 builder를 반환한다.
- `columns(fn)` — column factory를 넘겨 column 정의를 만들고 column 타입 제네릭을 교체한다.
- `primaryKey(...columns)` — column key 배열을 PK로 저장한다.
- `indexes(fn)` — index factory를 넘겨 index 목록을 만들고 저장한다.
- `relations(fn)` — table 전용 relation factory(FK + 논리 관계)를 넘겨 relation record를 만들고 relation 타입 제네릭을 교체한다.

## ViewBuilder / View

```ts
function View<TName extends string>(name: TName): ViewBuilder<DbContextBase, TName, DataRecord, {}>;
class ViewBuilder<TDbContext extends DbContextBase, TName extends string, TData extends DataRecord, TRelations = {}> {
  readonly meta: {
    name: TName;
    description?: string;
    database?: string;
    schema?: string;
    viewFn?: (db: TDbContext) => Queryable<TData, any>;
    relations?: TRelations;
  };
  readonly $inferSelect!: TData & InferDeepRelations<TRelations>;
  description(desc: string): ViewBuilder<TDbContext, TName, TData, TRelations>;
  database(db: string): ViewBuilder<TDbContext, TName, TData, TRelations>;
  schema(schema: string): ViewBuilder<TDbContext, TName, TData, TRelations>;
  query<TViewData extends DataRecord, TDb extends DbContextBase>(viewFn: (db: TDb) => Queryable<TViewData, any>): ViewBuilder<TDb, TName, TViewData, TRelations>;
  relations<T>(fn: (r: ViewRelationFactory<keyof TData & string>) => T): ViewBuilder<TDbContext, TName, TData, T>;
}
```

- `name: TName` — view 이름. `View(name)` 생성 시 meta에 저장된다.
- `description?: string` — view 설명. `description(desc)` 호출 시 meta에 저장된다.
- `database?: string` — view별 database override.
- `schema?: string` — view별 schema override.
- `viewFn?: (db) => Queryable` — `query(viewFn)` 이 저장하는 view SELECT 정의 함수. 없으면 create view QueryDef 생성 시 throw한다.
- `relations?: TRelations` — view relation record. View factory는 RelationKey 계열만 노출한다.
- `$inferSelect` — view query 데이터 타입과 optional relation 타입을 합친 SELECT 결과 타입.
- `query(viewFn)` — DbContext를 받아 Queryable을 반환하는 함수를 저장하고 view 데이터 타입 제네릭을 교체한다.
- `relations(fn)` — view용 논리 relation factory를 넘겨 relation record를 만든다.

## ProcedureBuilder / Procedure

```ts
function Procedure(name: string): ProcedureBuilder<never, never>;
class ProcedureBuilder<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  readonly $params!: TParams;
  readonly $returns!: TReturns;
  readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    params?: TParams;
    returns?: TReturns;
    query?: string;
  };
  description(desc: string): ProcedureBuilder<TParams, TReturns>;
  database(db: string): ProcedureBuilder<TParams, TReturns>;
  schema(schema: string): ProcedureBuilder<TParams, TReturns>;
  params<T extends ColumnBuilderRecord>(fn: (c: ReturnType<typeof createColumnFactory>) => T): ProcedureBuilder<T, TReturns>;
  returns<T extends ColumnBuilderRecord>(fn: (c: ReturnType<typeof createColumnFactory>) => T): ProcedureBuilder<TParams, T>;
  body(sql: string): ProcedureBuilder<TParams, TReturns>;
}
```

- `name: string` — procedure 이름.
- `description?: string` — procedure 설명. `description(desc)` 호출 시 meta에 저장된다.
- `database?: string` — procedure별 database override.
- `schema?: string` — procedure별 schema override.
- `params?: TParams` — `params(fn)` 이 반환한 입력 parameter column record.
- `returns?: TReturns` — `returns(fn)` 이 반환한 반환 column record.
- `query?: string` — `body(sql)` 이 저장하는 procedure 본문 SQL. 없으면 create proc QueryDef 생성 시 throw한다.
- `$params` — `Executable` 파라미터 타입 추론용 phantom field.
- `$returns` — `Executable` 반환 타입 추론용 phantom field.
- `params(fn)` — column factory로 procedure 입력 parameter를 정의한다.
- `returns(fn)` — column factory로 procedure 반환 column을 정의한다.
- `body(sql)` — procedure 본문 SQL을 저장한다.

## ColumnBuilder / createColumnFactory

```ts
class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  readonly meta: TMeta;
  autoIncrement(): ColumnBuilder<TValue, Omit<TMeta, "autoIncrement"> & { autoIncrement: true }>;
  nullable(): ColumnBuilder<TValue | undefined, Omit<TMeta, "nullable"> & { nullable: true }>;
  default(value: TValue): ColumnBuilder<TValue, Omit<TMeta, "default"> & { default: typeof value }>;
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }>;
}
function createColumnFactory(): {
  int(): ColumnBuilder<number, { type: "number"; dataType: { type: "int" } }>;
  bigint(): ColumnBuilder<number, { type: "number"; dataType: { type: "bigint" } }>;
  float(): ColumnBuilder<number, { type: "number"; dataType: { type: "float" } }>;
  double(): ColumnBuilder<number, { type: "number"; dataType: { type: "double" } }>;
  decimal(precision: number, scale?: number): ColumnBuilder<number, { type: "number"; dataType: { type: "decimal"; precision: number; scale?: number } }>;
  varchar(length: number): ColumnBuilder<string, { type: "string"; dataType: { type: "varchar"; length: number } }>;
  char(length: number): ColumnBuilder<string, { type: "string"; dataType: { type: "char"; length: number } }>;
  text(): ColumnBuilder<string, { type: "string"; dataType: { type: "text" } }>;
  binary(): ColumnBuilder<Bytes, { type: "Bytes"; dataType: { type: "binary" } }>;
  boolean(): ColumnBuilder<boolean, { type: "boolean"; dataType: { type: "boolean" } }>;
  datetime(): ColumnBuilder<DateTime, { type: "DateTime"; dataType: { type: "datetime" } }>;
  date(): ColumnBuilder<DateOnly, { type: "DateOnly"; dataType: { type: "date" } }>;
  time(): ColumnBuilder<Time, { type: "Time"; dataType: { type: "time" } }>;
  uuid(): ColumnBuilder<Uuid, { type: "Uuid"; dataType: { type: "uuid" } }>;
}
```

- `meta.type: ColumnPrimitiveStr` — TypeScript 원시 타입 이름.
- `meta.dataType: DataType` — SQL 타입 AST.
- `meta.autoIncrement?: boolean` — `autoIncrement()` 호출 시 `true`; INSERT 타입에서 optional로 처리된다.
- `meta.nullable?: boolean` — `nullable()` 호출 시 `true`; 값 타입에 `undefined` 가 추가되고 INSERT 타입에서 optional로 처리된다.
- `meta.default?: ColumnPrimitive` — `default(value)` 호출 시 저장되는 기본값; INSERT 타입에서 optional로 처리된다.
- `meta.description?: string` — column 설명.
- `autoIncrement()` — meta.autoIncrement를 `true` 로 설정한 새 builder를 반환한다.
- `nullable()` — meta.nullable을 `true` 로 설정하고 값 타입에 `undefined` 를 추가한 새 builder를 반환한다.
- `default(value)` — meta.default에 value를 저장한 새 builder를 반환한다.
- `description(desc)` — meta.description을 저장한 새 builder를 반환한다.
- `int` — 4바이트 정수 column.
- `bigint` — 8바이트 정수 column.
- `float` — 4바이트 부동소수점 column.
- `double` — 8바이트 부동소수점 column.
- `decimal(precision, scale?)` — 고정 소수점 column. `precision` 은 전체 자릿수, `scale` 은 소수점 이하 자릿수.
- `varchar(length)` — 가변 길이 문자열 column. `length` 는 최대 길이.
- `char(length)` — 고정 길이 문자열 column. `length` 는 고정 길이.
- `text` — 대용량 문자열 column.
- `binary` — binary column. DBMS별 DDL 렌더링은 MySQL `LONGBLOB`, MSSQL `VARBINARY(MAX)`, PostgreSQL `BYTEA`.
- `boolean` — boolean column. DBMS별 DDL 렌더링은 MySQL `BOOLEAN`, MSSQL `BIT`, PostgreSQL `BOOLEAN`.
- `datetime` — 날짜+시간 column.
- `date` — 날짜 전용 column.
- `time` — 시간 전용 column.
- `uuid` — UUID column. DBMS별 DDL 렌더링은 MySQL `BINARY(16)`, MSSQL `UNIQUEIDENTIFIER`, PostgreSQL `UUID`.

## Column 타입 유틸리티

```ts
type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;
type InferColumns<TBuilders extends ColumnBuilderRecord> = { [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? V : never };
type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = { [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never };
type RequiredInsertKeys<TBuilders extends ColumnBuilderRecord> = ...;
type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = ...;
type InferInsertColumns<TBuilders extends ColumnBuilderRecord> = Pick<InferColumns<TBuilders>, RequiredInsertKeys<TBuilders>> & Partial<Pick<InferColumns<TBuilders>, OptionalInsertKeys<TBuilders>>>;
type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<InferColumns<TBuilders>>;
type DataToColumnBuilderRecord<TData extends DataRecord> = { [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<..., any> };
```

- `ColumnBuilderRecord` — Table columns/Procedure params/returns 콜백 반환 타입.
- `InferColumns` — ColumnBuilder record에서 실제 값 타입을 추론한다.
- `InferColumnExprs` — ColumnBuilder record에서 `ExprInput` 입력 타입을 추론한다. Procedure 실행 parameter에 쓰인다.
- `RequiredInsertKeys` — autoIncrement/nullable/default가 없는 column key만 남긴다.
- `OptionalInsertKeys` — `RequiredInsertKeys` 를 제외한 INSERT optional key.
- `InferInsertColumns` — INSERT 입력 타입. 필수 key는 필수, optional key는 `Partial`.
- `InferUpdateColumns` — UPDATE 입력 타입. 모든 column이 optional.
- `DataToColumnBuilderRecord` — DataRecord의 primitive field만 ColumnBuilder record 모양으로 변환한다. `insertInto` target 제약에 쓰인다.

## IndexBuilder / createIndexFactory

```ts
class IndexBuilder<TKeys extends string[]> {
  readonly meta: {
    columns: TKeys;
    name?: string;
    unique?: boolean;
    orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
    description?: string;
  };
  name(name: string): IndexBuilder<TKeys>;
  unique(): IndexBuilder<TKeys>;
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys>;
  description(description: string): IndexBuilder<TKeys>;
}
function createIndexFactory<TColumnKey extends string>(): {
  index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys>;
};
```

- `columns: TKeys` — index 대상 column 배열.
- `name?: string` — index 이름. 미지정 시 add index QueryDef에서 `IDX_${table.name}_${columns.join("_")}`.
- `unique?: boolean` — `unique()` 호출 시 `true`; SQL 렌더링에서 unique index를 만든다.
- `orderBy?: "ASC"|"DESC"[]` — column별 정렬 방향. 미지정 column은 add index QueryDef에서 `"ASC"`.
- `description?: string` — index 설명.
- `"ASC"` — 오름차순 정렬 index column.
- `"DESC"` — 내림차순 정렬 index column.
- `index(...columns)` — column key 목록으로 IndexBuilder를 만든다.

## Relation builders / createRelationFactory

```ts
class ForeignKeyBuilder<TTargetFn> { readonly meta: { columns: string[]; targetFn: TTargetFn; description?: string } }
class ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle> { readonly meta: { targetTableFn: TTargetTableFn; relationName: string; description?: string; isSingle?: TIsSingle } }
class RelationKeyBuilder<TTargetFn> { readonly meta: { columns: string[]; targetFn: TTargetFn; description?: string } }
class RelationKeyTargetBuilder<TTargetTableFn, TIsSingle> { readonly meta: { targetTableFn: TTargetTableFn; relationName: string; description?: string; isSingle?: TIsSingle } }

type RelationFkFactory<TColumnKey extends string> = {
  foreignKey<TTargetFn>(columns: TColumnKey[], targetFn: TTargetFn, opts?: { description?: string }): ForeignKeyBuilder<TTargetFn>;
  foreignKeyTarget<TTargetTableFn>(targetTableFn: TTargetTableFn, relationName: string, opts: { single: true; description?: string }): ForeignKeyTargetBuilder<TTargetTableFn, true>;
  foreignKeyTarget<TTargetTableFn>(targetTableFn: TTargetTableFn, relationName: string, opts?: { single?: false; description?: string }): ForeignKeyTargetBuilder<TTargetTableFn, false>;
};
type RelationRkFactory<TColumnKey extends string> = {
  relationKey<TTargetFn>(columns: TColumnKey[], targetFn: TTargetFn, opts?: { description?: string }): RelationKeyBuilder<TTargetFn>;
  relationKeyTarget<TTargetTableFn>(targetTableFn: TTargetTableFn, relationName: string, opts: { single: true; description?: string }): RelationKeyTargetBuilder<TTargetTableFn, true>;
  relationKeyTarget<TTargetTableFn>(targetTableFn: TTargetTableFn, relationName: string, opts?: { single?: false; description?: string }): RelationKeyTargetBuilder<TTargetTableFn, false>;
};
type TableRelationFactory<TColumnKey extends string> = RelationFkFactory<TColumnKey> & RelationRkFactory<TColumnKey>;
type ViewRelationFactory<TColumnKey extends string> = RelationRkFactory<TColumnKey>;
function createRelationFactory<TColumnKey extends string = string>(): TableRelationFactory<TColumnKey>;
```

- `ForeignKeyBuilder` — 현재 Table에서 대상 Table로 가는 N:1 DB FK 관계. `initialize` 가 FK QueryDef를 생성한다.
- `ForeignKeyTargetBuilder` — 다른 Table이 현재 Table을 참조하는 역참조. `include` 시 기본 배열, `single: true` 면 단일 객체.
- `RelationKeyBuilder` — DB FK를 생성하지 않는 N:1 논리 관계. Table/View에서 사용 가능.
- `RelationKeyTargetBuilder` — DB FK를 생성하지 않는 역참조 논리 관계. Table/View에서 사용 가능.
- `columns: string[]` — FK/논리 관계의 source column 이름 배열.
- `targetFn` — 대상 Table/View builder를 반환하는 함수. 타입 제약 없이 저장되고 추론 시 lazy 해소된다.
- `targetTableFn` — 역참조 대상 Table/View builder를 반환하는 함수.
- `relationName: string` — 대상 Table/View 쪽 FK/RelationKey 관계 이름. relation 검증과 include 조건 생성에 쓰인다.
- `description?: string` — 관계 설명. factory `opts.description` 으로만 설정한다.
- `isSingle?: true|false` — 역참조 결과 형태. `true` 는 단일 객체, `false`/미지정은 배열.
- `opts.single: true` — `ForeignKeyTargetBuilder<..., true>` / `RelationKeyTargetBuilder<..., true>` 를 반환하고 relation 타입이 단일 객체가 된다.
- `opts.single?: false` — `ForeignKeyTargetBuilder<..., false>` / `RelationKeyTargetBuilder<..., false>` 를 반환하고 relation 타입이 배열이 된다.
- `foreignKey(columns, targetFn, opts?)` — DB FK를 생성하는 N:1 관계를 만든다.
- `foreignKeyTarget(targetTableFn, relationName, opts?)` — DB FK 역참조 관계를 만든다.
- `relationKey(columns, targetFn, opts?)` — DB FK를 만들지 않는 N:1 관계를 만든다.
- `relationKeyTarget(targetTableFn, relationName, opts?)` — DB FK를 만들지 않는 역참조 관계를 만든다.
- `TableRelationFactory` — Table `relations` 콜백에서 FK 계열과 RelationKey 계열을 모두 제공한다.
- `ViewRelationFactory` — View `relations` 콜백에서 RelationKey 계열만 제공한다.

## Relation 타입 유틸리티

```ts
type RelationBuilderRecord = Record<string, ForeignKeyBuilder<any> | ForeignKeyTargetBuilder<any, any> | RelationKeyBuilder<any> | RelationKeyTargetBuilder<any, any>>;
type ExtractRelationTarget<TRelation, TVisited extends string = never> = ...;
type ExtractRelationTargetResult<TRelation, TVisited extends string = never> = ...;
type InferDeepRelations<TRelations, TVisited extends string = never> = { [K in keyof TRelations]?: ExtractRelationTarget<TRelations[K], TVisited> | ExtractRelationTargetResult<TRelations[K], TVisited> };
```

- `RelationBuilderRecord` — relation callback 반환 record의 builder union 타입.
- `ExtractRelationTarget` — FK/RelationKey 대상 타입을 단일 객체로 추출한다. 같은 table/view 이름 재방문 시 column/data만 반환해 순환을 끊는다.
- `ExtractRelationTargetResult` — FKTarget/RelationKeyTarget 대상 타입을 `isSingle` 에 따라 단일 객체 또는 배열로 추출한다.
- `InferDeepRelations` — relation record의 각 key를 optional relation property로 만든다. include 전 접근 가능성을 `undefined` 로 표현한다.

## _Migration

```ts
const _Migration: TableBuilder<"_migration", { code: ColumnBuilder<string, ...> }, {}>;
```

- `_Migration` — `code: varchar(255)` 단일 PK를 가진 시스템 migration table builder.
- `code` — migration 이름을 저장하는 primary key column.
