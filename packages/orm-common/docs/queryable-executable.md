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

  // ORDER BY (lambda 또는 체인 경로 문자열)
  orderBy(fnOrKey: string | ((columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>), orderBy?: "ASC" | "DESC"): Queryable<TData, TFrom>;

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
  update<K>(recordFwd: ..., outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;

  // DELETE
  delete(): Promise<void>;
  delete<K>(outputColumns: K[]): Promise<Pick<TFrom["$inferColumns"], K>[]>;

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

### include 후 relation 접근: `!` vs `?.`

`@simplysm/orm-common`의 relation은 타입 시스템상 **항상 optional**로 추론된다 (`x.rfq?: ...`). 하지만 실제 런타임 nullability는 **관계 종류**와 **FK 컬럼의 nullable 여부**로 결정된다.

> `foreignKey`와 `relationKey`(N:1)는 동일 규칙, `foreignKeyTarget`과 `relationKeyTarget`(1:N · 1:1 역참조)도 동일 규칙으로 취급한다.

**규칙:**

- **N:1 관계(`foreignKey` / `relationKey`)** — 본인이 FK 컬럼을 보유하므로 FK 컬럼의 nullable 여부로 분기
  - **FK NOT NULL + `.include(x => x.relation)`**: **`x.relation!.field`** (non-null assertion)
    - 근거: `.include()`로 JOIN이 강제되고 FK NOT NULL이므로 DB 레벨에서 존재 보장
    - `?.` 사용 금지 — 절대 도달하지 않는 undefined 경로에 방어 코드를 넣는 것은 dead branch 생성
  - **FK nullable + `.include()`**: **`x.relation?.field`** (optional chaining)
    - 근거: FK가 null이면 relation도 없음
- **역참조(`foreignKeyTarget` / `relationKeyTarget`, `single` 무관) + `.include()`**: **항상 `x.relation?.field`** (optional chaining)
  - 근거: 본인이 key를 가진 게 아니라 상대 테이블이 본인을 참조한다. include 결과는 array(0개 가능) 또는 single:true의 단일 객체(존재하지 않을 수 있음) 모두 항상 nullable이다. NOT NULL 보장 불가
  - `!` 사용 금지
- **`.include()` 미사용**: relation 참조 금지 (조회되지 않음)

**예시:**

```ts
// N:1 — NewPoItem.rfqId: NOT NULL, Customer.endCustomerId: NOT NULL
db.newPoItem()
  .include((x) => x.rfq)
  .include((x) => x.customer.endCustomer) // 체이닝도 동일 규칙
  .select((x) => ({
    rfqCode: x.rfq!.code,                           // NOT NULL → !
    endCustomerCode: x.customer!.endCustomer!.code, // 둘 다 NOT NULL → !
  }));

// N:1 — Distributor.defaultCustomerId: nullable
db.distributor()
  .include((x) => x.defaultCustomer)
  .select((x) => ({
    defaultCustomerName: x.defaultCustomer?.name, // nullable → ?.
  }));

// 1:N 역참조 (foreignKeyTarget, array)
db.user()
  .include((x) => x.posts)
  .select((x) => ({
    postCount: x.posts?.length,           // 항상 ?.
    firstTitle: x.posts?.[0]?.title,      // 배열 요소 접근도 ?.
  }));

// 1:1 역참조 (foreignKeyTarget, single: true)
db.user()
  .include((x) => x.profile)
  .select((x) => ({
    bio: x.profile?.bio, // single이어도 항상 ?. (Profile 행이 없을 수 있음)
  }));
```

**잘못된 예시:**

- `rfqCode: x.rfq?.code` (N:1, FK NOT NULL인데 `?.` 사용) — 타입 추론 한계를 회피만 하고 의도를 숨김. 린트가 잡지 못함
- `rfqCode: x.rfq.code` (assertion 없음) — TS 에러 `possibly 'undefined'`
- `postCount: x.posts!.length` (역참조에 `!` 사용) — 빈 array일 가능성을 무시
- `bio: x.profile!.bio` (역참조 single에 `!` 사용) — 상대 행이 없으면 undefined

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
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? QueryableRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? QueryableRecord<U>[] | undefined
          : never
        : TData[K] extends DataRecord
          ? QueryableRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? QueryableRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};
```

## `QueryableWriteRecord`

UPDATE/INSERT용 column 레코드 타입. `ExprUnit` 또는 리터럴 값을 받는다.

```typescript
export type QueryableWriteRecord<TData> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive ? ExprInput<TData[K]> : never;
};
```

## `UnwrapQueryableRecord`

QueryableRecord에서 실제 데이터 타입을 추출한다.

```typescript
export type UnwrapQueryableRecord<R> = {
  [K in keyof R as K extends symbol ? never : K]: R[K] extends ExprUnit<infer T>
    ? T
    : NonNullable<R[K]> extends (infer U)[]
      ? U extends Record<string, any>
        ? UnwrapQueryableRecord<U>[] | Extract<R[K], undefined>
        : never
      : NonNullable<R[K]> extends Record<string, any>
        ? UnwrapQueryableRecord<NonNullable<R[K]>> | Extract<R[K], undefined>
        : never;
};
```

## `PathProxy`

include()에서 관계 경로를 타입 안전하게 지정하기 위한 프록시 타입. `ColumnPrimitive`가 아닌 필드(FK, FKT 관계)만 접근 가능하다.

```typescript
export type PathProxy<TObject> = {
  [K in keyof TObject as TObject[K] extends ColumnPrimitive ? never : K]-?: PathProxy<
    UnwrapArray<TObject[K]>
  >;
} & { readonly [PATH_SYMBOL]: string[] };
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
