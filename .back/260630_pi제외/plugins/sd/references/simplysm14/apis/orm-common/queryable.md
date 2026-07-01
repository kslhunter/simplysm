# @simplysm/orm-common — Queryable / Executable / 검색

`db.X()` 가 반환하는 `Queryable` 로 SELECT·CUD·UPSERT QueryDef를 만들고 실행하거나, `Executable` 로 procedure를 실행하며, 검색 문자열을 LIKE 패턴으로 파싱할 때 같이 읽는 군. 사용법: [orm.md](../../manuals/orm.md), UNION 사용법: [orm-union.md](../../manuals/orm-union.md)

## Queryable

```ts
class Queryable<TData extends DataRecord, TFrom extends TableBuilder<any, any> | never> {
  readonly meta: QueryableMeta<TData>;
  constructor(meta: QueryableMeta<TData>);
}
```

- `TData` — SELECT 결과 행 타입. `select`/`join`/`include`/`wrap`/`union` 체이닝이 이 타입을 바꾼다.
- `TFrom` — CUD 대상 TableBuilder 타입. `select`/집계/union 등 CUD 대상이 아닌 Queryable은 `never` 로 바뀐다.
- `meta` — QueryDef 생성을 위한 내부 상태. public readonly지만 구조 타입은 export되지 않는다.

## Queryable SELECT 옵션

```ts
select<R extends Record<string, any>>(fn: (columns: QueryableRecord<TData>) => R): Queryable<UnwrapQueryableRecord<R>, never>;
distinct(): Queryable<TData, never>;
lock(): Queryable<TData, TFrom>;
top(count: number): Queryable<TData, TFrom>;
limit(skip: number, take: number): Queryable<TData, TFrom>;
orderBy(fnOrKey: string | ((columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>), orderBy?: "ASC" | "DESC"): Queryable<TData, TFrom>;
```

- `select(fn)` — SELECT column 구조를 새로 지정한다. callback 반환 객체의 `ExprUnit` 은 값 타입으로, primitive literal은 literal 타입으로 역변환된다.
- `fn.columns` — 현재 결과 구조의 column proxy. primitive field는 `ExprUnit`, 객체/배열 관계는 재귀 proxy.
- `distinct()` — `meta.distinct = true` 를 설정한다. 이후 `count()` 를 직접 호출하면 throw한다.
- `lock()` — `meta.lock = true` 를 설정한다. SQL 렌더러는 SELECT 잠금 구문을 붙인다.
- `top(count)` — `meta.top = count` 를 설정한다.
- `count: number` — 상위 N행 개수.
- `limit(skip, take)` — `meta.limit = [skip, take]` 를 설정한다. `orderBy` 가 없으면 throw한다.
- `skip: number` — 건너뛸 행 수.
- `take: number` — 가져올 행 수.
- `orderBy(fnOrKey, orderBy?)` — 정렬 조건을 누적한다.
- `fnOrKey: string` — `obj.getChainValue(columns, fnOrKey, true)` 로 column proxy를 찾는 chain path.
- `fnOrKey: (columns) => ExprUnit` — 정렬 expression을 직접 반환하는 callback.
- `orderBy?: "ASC"|"DESC"` — 정렬 방향. 미지정이면 QueryDef tuple에 방향을 넣지 않는다.
- `"ASC"` — 오름차순 정렬.
- `"DESC"` — 내림차순 정렬.

## Queryable WHERE / GROUP / JOIN

```ts
where(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom>;
search(fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[], searchText: string): Queryable<TData, TFrom>;
groupBy(fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[]): Queryable<TData, never>;
having(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, never>;
join<A extends string, R extends DataRecord>(as: A, fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>): Queryable<TData & { [K in A]?: R[] }, TFrom>;
joinSingle<A extends string, R extends DataRecord>(as: A, fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>): Queryable<Omit<TData, A> & { [K in A]?: R }, TFrom>;
include(fn: (item: PathProxy<TData>) => PathProxy<unknown>): Queryable<TData, TFrom>;
```

- `where(predicate)` — 조건 배열을 `meta.where` 에 누적한다. 여러 `where` 호출 결과는 배열로 이어진다.
- `predicate.columns` — 현재 column proxy.
- `search(fn, searchText)` — `searchText.trim() === ""` 이면 현재 Queryable을 그대로 반환한다.
- `fn` — 검색 대상 문자열 column 배열을 반환한다.
- `searchText` — `parseSearchQuery` 로 `or`/`must`/`not` LIKE 패턴으로 파싱된다.
- `search` OR terms — 각 term은 지정 column 중 하나라도 `lower(column) LIKE pattern` 이면 매칭된다.
- `search` MUST terms — 각 term마다 지정 column 중 하나 이상이 매칭되어야 한다.
- `search` NOT terms — 지정 column 어느 곳에도 매칭되지 않아야 한다.
- `groupBy(fn)` — GROUP BY expression 배열을 설정하고 CUD 대상 타입을 `never` 로 바꾼다.
- `having(predicate)` — HAVING 조건 배열을 `meta.having` 에 누적한다.
- `join(as, fn)` — LEFT OUTER JOIN 결과를 `as?: R[]` 배열 relation으로 추가한다.
- `joinSingle(as, fn)` — LEFT OUTER JOIN 결과를 `as?: R` 단일 relation으로 추가한다. 기존 `TData` 의 같은 key는 제거 후 대체된다.
- `as: string` — 결과에 추가할 relation property 이름이자 join alias 경로 일부.
- `fn.qr` — `from`/`select`/`union` 으로 join 대상 Queryable을 만드는 JoinQueryable.
- `fn.cols` — parent Queryable column proxy.
- `include(fn)` — TableBuilder 관계 메타를 따라 자동 JOIN을 추가한다.
- `fn.item: PathProxy<TData>` — primitive field를 제외한 relation key만 접근 가능한 path proxy.
- `include` FK/RelationKey — N:1 관계를 `joinSingle` 로 추가한다.
- `include` FKTarget/RelationKeyTarget — `isSingle === true` 면 `joinSingle`, 아니면 `join` 으로 추가한다.
- `include` 오류 — TableBuilder 기반이 아니면 throw, relation 이름이 없으면 throw, 역참조 relationName이 대상 table에 없거나 FK/RelationKey가 아니면 throw한다.

## JoinQueryable / RecursiveQueryable callback API

```ts
// join/joinSingle callback의 qr
from<T extends TableBuilder<any, any>>(table: T): Queryable<T["$inferSelect"], T>;
select<R extends DataRecord>(columns: QueryableRecord<R>): Queryable<R, never>;
union<TData extends DataRecord>(...queries: Queryable<TData, any>[]): Queryable<TData, never>;

// recursive callback의 qr
from<T extends TableBuilder<any, any>>(table: T): Queryable<T["$inferSelect"] & { self?: TBaseData[] }, T>;
select<R extends DataRecord>(columns: QueryableRecord<R>): Queryable<R & { self?: TBaseData[] }, never>;
union<TData extends DataRecord>(...queries: Queryable<TData, any>[]): Queryable<TData & { self?: TBaseData[] }, never>;
```

- `from(table)` — 전달된 join/CTE alias로 TableBuilder queryable을 만든다.
- `select(columns)` — 직접 만든 column record를 가진 custom Queryable을 만든다.
- `union(...queries)` — 최소 2개 queryable을 UNION ALL source로 결합한다. 2개 미만이면 `ArgumentError`.
- `recursive` callback 결과 — `self?: TBaseData[]` relation을 포함해 재귀 CTE self 참조를 표현한다.

## Queryable subquery / union / recursive

```ts
wrap(): Queryable<TData, never>;
static union<TData extends DataRecord>(...queries: Queryable<TData, any>[]): Queryable<TData, never>;
recursive(fn: (qr: RecursiveQueryable<TData>) => Queryable<TData, any>): Queryable<TData, never>;
```

- `wrap()` — 현재 Queryable을 subquery FROM으로 감싸고 새 alias를 부여한다. `distinct`/`groupBy` 이후 `count()` 직접 호출이 막혀 있을 때 필요하다.
- `Queryable.union(...queries)` — 최소 2개 Queryable을 UNION ALL source 배열로 저장한다. 2개 미만이면 `ArgumentError`.
- `queries` — 같은 `TData` shape의 Queryable 목록. SQL 렌더러는 `from` 배열을 `UNION ALL` 로 렌더링한다.
- `recursive(fn)` — base query와 recursive query를 `with: { name, base, recursive }` 로 저장한다.
- `fn` — `RecursiveQueryable<TData>` 를 받아 recursive part Queryable을 반환한다.

## Queryable SELECT 실행 / QueryDef

```ts
execute(): Promise<TData[]>;
single(): Promise<TData | undefined>;
first(): Promise<TData | undefined>;
count(fn?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>): Promise<number>;
exists(): Promise<boolean>;
getSelectQueryDef(): SelectQueryDef;
getResultMeta(outputColumns?: string[]): ResultMeta;
```

- `execute()` — `getSelectQueryDef()` 와 `getResultMeta()` 를 `executeDefs` 에 넘기고 첫 result set을 반환한다.
- `single()` — 결과가 2개 이상이면 `ArgumentError`, 0개면 `undefined`, 1개면 해당 row.
- `first()` — `top(1).execute()` 의 첫 row를 반환한다.
- `count(fn?)` — `select({ cnt: expr.count(...) }).single()` 로 row 수를 구하고 결과가 없으면 0.
- `fn` — count 대상 column expression. 없으면 `COUNT(*)`.
- `count` 제한 — `distinct` 또는 `groupBy` 직후에는 throw하고 `wrap()` 후 호출하라는 메시지를 낸다.
- `exists()` — `top(1).execute()` 결과 길이가 0보다 크면 `true`.
- `getSelectQueryDef()` — 현재 meta를 `SelectQueryDef` AST로 변환한다.
- `getResultMeta(outputColumns?)` — column type과 join 단일/배열 정보를 만든다.
- `outputColumns?: string[]` — 지정 시 해당 full key만 ResultMeta columns에 포함한다.

## Queryable INSERT

```ts
insert(records: TFrom["$inferInsert"][]): Promise<void>;
insert<K extends keyof TFrom["$inferColumns"] & string>(records: TFrom["$inferInsert"][], outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;
insertIfNotExists(record: TFrom["$inferInsert"]): Promise<void>;
insertIfNotExists<K extends keyof TFrom["$inferColumns"] & string>(record: TFrom["$inferInsert"], outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>>;
insertInto<TTable extends TableBuilder<any, DataToColumnBuilderRecord<TData>>>(targetTable: TTable): Promise<void>;
insertInto<TTable extends TableBuilder<any, DataToColumnBuilderRecord<TData>>, TOut extends keyof TTable["$inferColumns"] & string>(targetTable: TTable, outputColumns: TOut[]): Promise<Pick<TData, TOut>[]>;
getInsertQueryDef(records: TFrom["$inferInsert"][], outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): InsertQueryDef;
getInsertIfNotExistsQueryDef(record: TFrom["$inferInsert"], outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): InsertIfNotExistsQueryDef;
getInsertIntoQueryDef<TTable extends TableBuilder<any, DataToColumnBuilderRecord<TData>>>(targetTable: TTable, outputColumns?: (keyof TTable["$inferColumns"] & string)[]): InsertIntoQueryDef;
```

- `records` — 삽입할 row 배열. `insert` 는 빈 배열이면 outputColumns가 있을 때 `[]`, 없을 때 `undefined` 를 반환한다.
- `insert` chunk — MSSQL row limit 대응으로 1000개 단위로 나누어 실행한다.
- `outputColumns?: K[]` — 지정하면 삽입/조건부 삽입/insertInto 결과 column을 반환한다.
- `record` — `insertIfNotExists` 로 삽입할 단일 row.
- `insertIfNotExists` — 현재 SELECT 조건을 `existsSelectQuery` 로 사용해 존재하지 않을 때만 삽입하는 QueryDef를 만든다.
- `targetTable` — 현재 SELECT 결과 primitive shape와 호환되는 TableBuilder.
- `insertInto` — 현재 SELECT 결과를 대상 table에 INSERT INTO SELECT 한다.
- `getInsertQueryDef` — autoIncrement column에 명시값이 있으면 `overrideIdentity` 와 `aiColName` 을 설정한다.
- `getInsertIfNotExistsQueryDef` — 현재 SelectQueryDef에서 `select` 를 제거한 exists query를 포함한다.
- `getInsertIntoQueryDef` — `recordsSelectQuery` 로 현재 SelectQueryDef를 포함한다.

## Queryable UPDATE / DELETE / UPSERT

```ts
update(recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>): Promise<void>;
update<K extends keyof TFrom["$inferColumns"] & string>(recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>, outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;
delete(): Promise<void>;
delete<K extends keyof TFrom["$inferColumns"] & string>(outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;
upsert(updateFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>): Promise<void>;
upsert<K extends keyof TFrom["$inferColumns"] & string>(insertFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>, outputColumns?: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;
upsert<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(updateFn: (cols: QueryableRecord<TData>) => U, insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>): Promise<void>;
upsert<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>, K extends keyof TFrom["$inferColumns"] & string>(updateFn: (cols: QueryableRecord<TData>) => U, insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>, outputColumns?: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;
getUpdateQueryDef(recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>, outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): UpdateQueryDef;
getDeleteQueryDef(outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): DeleteQueryDef;
getUpsertQueryDef<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(updateRecordFn: (cols: QueryableRecord<TData>) => U, insertRecordFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>, outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): UpsertQueryDef;
```

- `recordFwd` — 현재 column proxy를 받아 update할 column/value expression record를 반환한다.
- `outputColumns` — 지정하면 affected row의 해당 column 배열을 반환한다.
- `delete(outputColumns?)` — 현재 where/join/top/limit 조건을 가진 delete QueryDef를 실행한다.
- `upsert` — 현재 SELECT 조건으로 존재 여부를 판단해 있으면 update, 없으면 insert하는 QueryDef를 만든다.
- `updateFn` — update record 생성 함수.
- `insertFn` — insert record 생성 함수. 생략된 overload에서는 updateFn 결과를 insert record로도 사용한다.
- `insertFn(updateRecord)` — `updateFn` 이 만든 raw update record를 받아 insert record를 만든다.
- `getUpdateQueryDef` — table/as/record/top/where/joins/limit/output을 만든다.
- `getDeleteQueryDef` — table/as/top/where/joins/limit/output을 만든다.
- `getUpsertQueryDef` — 현재 SelectQueryDef에서 `select` 를 제거한 exists query와 updateRecord/insertRecord를 만든다.
- CUD source 제한 — source가 TableBuilder가 아니거나 table columns가 없으면 CUD helper가 throw한다.

## Queryable DDL helper

```ts
switchFk(enabled: boolean): Promise<void>;
```

- `enabled: boolean` — `true` 는 FK 활성화, `false` 는 FK 비활성화.
- `switchFk` — source가 TableBuilder 또는 ViewBuilder가 아니면 throw하고, DbContext `switchFk(objectName, enabled)` 에 위임한다.

## queryable factory

```ts
function queryable<TBuilder extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: TBuilder,
  as?: string,
): () => Queryable<TBuilder["$inferSelect"], TBuilder extends TableBuilder<any, any> ? TBuilder : never>;
```

- `db` — alias 발급, object name 해석, QueryDef 실행에 쓰는 DbContextBase.
- `tableOrView` — TableBuilder 또는 ViewBuilder source.
- `as?: string` — alias override. 미지정이면 `db.getNextAlias()` 로 새 alias를 받는다.
- TableBuilder source — columns meta를 `expr.col(type, alias, key)` proxy로 바꾼다.
- ViewBuilder source — `viewFn(db)` 의 columns를 새 alias로 변환한다.
- 유효하지 않은 meta — Table columns 또는 View viewFn을 만들 수 없으면 throw한다.

## Queryable 타입 유틸리티 / PathProxy

```ts
type QueryableRecord<TData extends DataRecord> = { [K in keyof TData]: ... };
type QueryableWriteRecord<TData> = { [K in keyof TData]: TData[K] extends ColumnPrimitive ? ExprInput<TData[K]> : never };
type UnwrapQueryableRecord<R> = { [K in keyof R as K extends symbol ? never : K]: ... };
type PathProxy<TObject> = { [K in keyof TObject as TObject[K] extends ColumnPrimitive ? never : K]-?: PathProxy<UnwrapArray<TObject[K]>> } & { readonly [PATH_SYMBOL]: string[] };
function getMatchedPrimaryKeys(fkCols: string[], targetTable: TableBuilder<any, any>): string[];
```

- `QueryableRecord` — query callback에서 쓰는 column proxy 타입. primitive는 `ExprUnit<T>`, object/array relation은 재귀 proxy.
- `QueryableWriteRecord` — update/upsert write record 타입. primitive field만 `ExprInput<T>` 를 허용한다.
- `UnwrapQueryableRecord` — `select` callback 반환에서 `ExprUnit<T>` 를 `T` 로, 중첩 객체/배열을 재귀적으로 DataRecord로 바꾼다.
- `PathProxy` — `include` path 수집용 타입. primitive field는 접근 대상에서 제외된다.
- `fkCols: string[]` — FK column 이름 배열.
- `targetTable` — PK를 읽을 대상 TableBuilder.
- `getMatchedPrimaryKeys` — 대상 table primaryKey가 없거나 FK/PK 길이가 다르면 throw하고, 맞으면 PK column 배열을 반환한다.

## Executable / executable

```ts
class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(db: DbContextBase, builder: ProcedureBuilder<TParams, TReturns>);
  getExecProcQueryDef(params?: InferColumnExprs<TParams>): ExecProcQueryDef;
  execute(params: InferColumnExprs<TParams>): Promise<InferColumns<TReturns>[][]>;
}
function executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord>(db: DbContextBase, builder: ProcedureBuilder<TParams, TReturns>): () => Executable<TParams, TReturns>;
```

- `db` — procedure object name 기본 database/schema와 execution 위임에 쓰는 DbContextBase.
- `builder` — ProcedureBuilder meta(params/returns/query/name)를 가진 procedure 정의.
- `params?: InferColumnExprs<TParams>` — procedure parameter expression record. params를 넘겼는데 builder meta.params가 없으면 throw한다.
- `getExecProcQueryDef` — `type: "execProc"`, procedure object name, parameter expression map을 만든다.
- `execute(params)` — ExecProcQueryDef 1개를 `db.executeDefs` 에 넘기고 반환 result set 배열을 그대로 반환한다.
- `executable(db, builder)` — 호출할 때마다 새 `Executable` 을 반환하는 factory를 만든다.

## parseSearchQuery / ParsedSearchQuery

```ts
interface ParsedSearchQuery {
  or: string[];
  must: string[];
  not: string[];
}
function parseSearchQuery(searchText: string): ParsedSearchQuery;
```

- `or: string[]` — 일반 검색어 LIKE 패턴. 공백 token 기본 대상.
- `must: string[]` — 필수 포함 LIKE 패턴. `+term` 또는 따옴표 phrase가 들어간다.
- `not: string[]` — 제외 LIKE 패턴. `-term` 이 들어간다.
- `searchText: string` — 검색 쿼리 문자열. trim 결과가 빈 문자열이면 세 배열 모두 빈 배열.
- `term1 term2` — 각 term을 `or` 에 넣는다.
- `+term` — `term` 을 `must` 에 넣는다.
- `-term` — `term` 을 `not` 에 넣는다.
- `"exact phrase"` — 따옴표 내부를 `must` 에 넣는다.
- `*` — SQL LIKE `%` wildcard로 바꾼다. wildcard가 없으면 term 양쪽에 `%` 를 붙인다.
- `\\`, `\*`, `\%`, `\"`, `\+`, `\-` — backslash, 별표, percent, 따옴표, plus, minus literal 이스케이프.
- 미정의 `\x` 이스케이프 — backslash를 제거하고 `x` literal로 처리한다.
- 닫히지 않은 따옴표 — 따옴표를 포함한 일반 token으로 처리된다.
- LIKE 특수 문자 escape — backslash, `%`, `_`, `[` 는 SQL LIKE pattern 안에서 escape 처리된다.
