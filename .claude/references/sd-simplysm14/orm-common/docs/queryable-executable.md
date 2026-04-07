# Queryable / Executable

## `Queryable`

체이닝 방식으로 table/view에 대한 SELECT, INSERT, UPDATE, DELETE, UPSERT 쿼리를 구성하는 클래스.

```typescript
export class Queryable<TData extends DataRecord, TFrom extends TableBuilder | never> {
  constructor(readonly meta: QueryableMeta<TData>);

  // SELECT / DISTINCT / LOCK
  select<R>(fn: (columns: QueryableRecord<TData>) => R): Queryable<UnwrapQueryableRecord<R>, never>;
  distinct(): Queryable<TData, never>;
  lock(): Queryable<TData, TFrom>;

  // TOP / LIMIT
  top(count: number): Queryable<TData, TFrom>;
  limit(skip: number, take: number): Queryable<TData, TFrom>;

  // ORDER BY
  orderBy(fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>, orderBy?: "ASC" | "DESC"): Queryable<TData, TFrom>;

  // WHERE
  where(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom>;
  search(fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[], searchText: string): Queryable<TData, TFrom>;

  // GROUP BY / HAVING
  groupBy(fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[]): Queryable<TData, never>;
  having(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, never>;

  // JOIN
  join<A extends string, R>(as: A, fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>): Queryable<TData & { [K in A]?: R[] }, TFrom>;
  joinSingle<A extends string, R>(as: A, fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>): Queryable<TData & { [K in A]?: R }, TFrom>;

  // INCLUDE (관계 기반 자동 JOIN)
  include(fn: (item: PathProxy<TData>) => PathProxy<any>): Queryable<TData, TFrom>;

  // WRAP / UNION
  wrap(): Queryable<TData, never>;
  static union<TData>(...queries: Queryable<TData, any>[]): Queryable<TData, never>;

  // WITH RECURSIVE
  recursive(fn: (qr: RecursiveQueryable<TData>) => Queryable<TData, any>): Queryable<TData, never>;

  // SELECT 실행
  execute(): Promise<TData[]>;
  single(): Promise<TData | undefined>;
  first(): Promise<TData | undefined>;
  count(fn?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>): Promise<number>;
  exists(): Promise<boolean>;

  // INSERT
  insert(records: TFrom["$inferInsert"][]): Promise<void>;
  insert<K>(records: TFrom["$inferInsert"][], outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  insertIfNotExists(record: TFrom["$inferInsert"]): Promise<void>;
  insertIfNotExists<K>(record: TFrom["$inferInsert"], outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>>;
  insertInto<TTable>(targetTable: TTable): Promise<void>;
  insertInto<TTable, TOut>(targetTable: TTable, outputColumns: TOut[]): Promise<Pick<TData, TOut>[]>;

  // UPDATE
  update(recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>): Promise<void>;
  update<K>(recordFwd: ..., outputColumns: K[]): Promise<Pick<TFrom["$columns"], K>[]>;

  // DELETE
  delete(): Promise<void>;
  delete<K>(outputColumns: K[]): Promise<Pick<TFrom["$columns"], K>[]>;

  // UPSERT
  upsert(updateFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>): Promise<void>;
  upsert<U>(updateFn: ..., insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>): Promise<void>;
  upsert<U, K>(updateFn: ..., insertFn: ..., outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;

  // FK 제약조건
  switchFk(enabled: boolean): Promise<void>;

  // QueryDef 생성
  getSelectQueryDef(): SelectQueryDef;
  getResultMeta(outputColumns?: string[]): ResultMeta;
  getInsertQueryDef(records: ..., outputColumns?: ...): InsertQueryDef;
  getInsertIfNotExistsQueryDef(record: ..., outputColumns?: ...): InsertIfNotExistsQueryDef;
  getInsertIntoQueryDef(targetTable: ..., outputColumns?: ...): InsertIntoQueryDef;
  getUpdateQueryDef(recordFwd: ..., outputColumns?: ...): UpdateQueryDef;
  getDeleteQueryDef(outputColumns?: ...): DeleteQueryDef;
  getUpsertQueryDef(updateRecordFn: ..., insertRecordFn: ..., outputColumns?: ...): UpsertQueryDef;
}
```

### 주요 메서드 설명

- **select()**: SELECT할 column 지정. 프록시 객체를 통해 column을 매핑.
- **where()**: WHERE 조건 추가. 여러 번 호출 시 AND로 결합.
- **search()**: 텍스트 검색. `parseSearchQuery`를 내부 사용하여 LIKE 패턴 변환.
- **join()**: 1:N LEFT OUTER JOIN (결과 배열). **joinSingle()**: N:1/1:1 LEFT OUTER JOIN (단일 객체).
- **include()**: TableBuilder에 정의된 관계를 기반으로 자동 JOIN. 중첩 관계도 지원 (`p.author.company`).
- **wrap()**: 현재 Queryable을 서브쿼리로 래핑. distinct()/groupBy() 후 count() 시 필요.
- **recursive()**: WITH RECURSIVE CTE 생성. 계층 데이터 조회에 사용.
- **upsert()**: WHERE 조건 일치 시 UPDATE, 미일치 시 INSERT. UPDATE/INSERT 데이터를 각각 지정 가능.
- **insert()**: MSSQL 1000행 제한을 위해 자동 청크 분할.
- **count()**: distinct()/groupBy() 이후 직접 호출 불가. wrap() 먼저 사용해야 함.

## `queryable`

Queryable 생성 팩토리 함수. DbContext 내부에서 사용.

```typescript
export function queryable<TBuilder extends TableBuilder | ViewBuilder>(
  db: DbContextBase,
  builder: TBuilder,
  alias?: string,
): () => Queryable<TBuilder["$inferSelect"], TBuilder extends TableBuilder ? TBuilder : never>;
```

## `getMatchedPrimaryKeys`

FK column 배열과 대상 테이블의 PK를 매칭하여 PK column 이름 배열을 반환한다.

```typescript
export function getMatchedPrimaryKeys(
  fkCols: string[],
  targetTable: TableBuilder<any, any>,
): string[];
```

## `QueryableRecord`

Queryable의 column 프록시 레코드 타입. 각 column이 `ExprUnit`으로 래핑되고, 중첩 관계는 재귀적으로 표현된다.

```typescript
export type QueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : TData[K] extends (infer U extends DataRecord)[]
      ? [QueryableRecord<U>]
      : TData[K] extends DataRecord
        ? QueryableRecord<TData[K]>
        : ExprUnit<TData[K] & ColumnPrimitive>;
};
```

## `QueryableWriteRecord`

UPDATE/INSERT용 column 레코드 타입. `ExprUnit` 또는 리터럴 값을 받는다.

```typescript
export type QueryableWriteRecord<TData> = {
  [K in keyof TData]: ExprInput<TData[K] & ColumnPrimitive>;
};
```

## `NullableQueryableRecord`

모든 column이 nullable인 Queryable 레코드 타입.

```typescript
export type NullableQueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K] | undefined>
    : TData[K] extends (infer U extends DataRecord)[]
      ? [NullableQueryableRecord<U>]
      : TData[K] extends DataRecord
        ? NullableQueryableRecord<TData[K]>
        : ExprUnit<(TData[K] & ColumnPrimitive) | undefined>;
};
```

## `UnwrapQueryableRecord`

QueryableRecord에서 실제 데이터 타입을 추출한다.

```typescript
export type UnwrapQueryableRecord<R> = {
  [K in keyof R]: R[K] extends ExprUnit<infer T> ? T
    : R[K] extends [infer U] ? UnwrapQueryableRecord<U>[]
    : R[K] extends Record<string, any> ? UnwrapQueryableRecord<R[K]>
    : R[K];
};
```

## `PathProxy`

include()에서 관계 경로를 타입 안전하게 지정하기 위한 프록시 타입.

```typescript
export type PathProxy<TObject> = {
  [K in keyof TObject]-?: TObject[K] extends (infer U)[] | undefined
    ? PathProxy<U>
    : TObject[K] extends infer U | undefined
      ? PathProxy<U>
      : PathProxy<TObject[K]>;
} & { [PATH_SYMBOL]: string[] };
```

## `Executable`

Stored Procedure 실행 래퍼 클래스.

```typescript
export class Executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  constructor(db: DbContextBase, builder: ProcedureBuilder<TParams, TReturns>);

  getExecProcQueryDef(params?: InferColumnExprs<TParams>): ExecProcQueryDef;
  execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]>;
}
```

## `executable`

Executable 생성 팩토리 함수.

```typescript
export function executable<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord>(
  db: DbContextBase,
  builder: ProcedureBuilder<TParams, TReturns>,
): () => Executable<TParams, TReturns>;
```

## `parseSearchQuery`

검색 쿼리 문자열을 파싱하여 SQL LIKE 패턴으로 변환한다.

```typescript
export function parseSearchQuery(searchText: string): ParsedSearchQuery;
```

### 검색 구문

| 구문 | 의미 | 예시 |
|------|------|------|
| `term1 term2` | OR (하나 이상 일치) | `apple banana` |
| `+term` | 필수 포함 (AND) | `+apple +banana` |
| `-term` | 제외 (NOT) | `apple -banana` |
| `"exact phrase"` | 정확한 구문 일치 (필수) | `"맛있는 과일"` |
| `*` | 와일드카드 | `app*` -> `app%` |

### 이스케이프 시퀀스

`\\` (리터럴 `\`), `\*` (리터럴 `*`), `\%` (리터럴 `%`), `\"` (리터럴 `"`), `\+` (리터럴 `+`), `\-` (리터럴 `-`)

## `ParsedSearchQuery`

검색 쿼리 파싱 결과.

```typescript
export interface ParsedSearchQuery {
  or: string[];
  must: string[];
  not: string[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `or` | `string[]` | 일반 검색어 (OR 조건) - LIKE 패턴 |
| `must` | `string[]` | 필수 검색어 (AND 조건, + 접두사 또는 따옴표) - LIKE 패턴 |
| `not` | `string[]` | 제외 검색어 (NOT 조건, - 접두사) - LIKE 패턴 |
