# @simplysm/orm-common — Queryable / Executable / 검색

`Queryable<TData, TFrom>` 는 table/view 에 대한 SELECT, INSERT, UPDATE, DELETE, UPSERT 를 immutable 체이닝으로 구성하는 빌더.
각 메서드는 새 `Queryable` 을 반환함.

- `TData` — 결과 행 타입.
- `TFrom` — 소스 `TableBuilder`(CUD 가능 여부 결정, view, custom select 후엔 `never`).

사용법: [orm.md](../../manuals/orm.md), [orm-union.md](../../manuals/orm-union.md).

콜백은 `QueryableRecord<TData>`(컬럼이 `ExprUnit` 으로 래핑된 프록시)를 받아
`expr.*` 로 조건/표현식을 만듦([expr.md](./expr.md)).

## SELECT 옵션, 제한, 정렬

- `select(fn)` — `fn(cols)` 가 새 컬럼 구조(중첩/배열 가능)를 반환.
  - 결과는 `Queryable<UnwrapQueryableRecord<R>, never>`(이후 CUD 불가).
  - raw 상수는 자동으로 `ExprUnit` 래핑.
- `distinct()` — DISTINCT 적용(`TFrom`→`never`).
- `lock()` — FOR UPDATE 행 잠금(트랜잭션 내). `TFrom` 유지.
- `top(count)` — 상위 N 행. ORDER BY 없이도 사용.
- `limit(skip, take)` — OFFSET/LIMIT 페이지네이션. **`orderBy()` 선행 필수**(없으면 throw).
- `orderBy(fnOrKey, orderBy?)` — 정렬 추가(누적).
  - `fnOrKey` 는 정렬 컬럼 반환 함수 또는 체인 경로 문자열(`obj.getChainValue` 로 해석, 동적 정렬용).
  - `orderBy`=`"ASC"|"DESC"`, 기본 ASC.

## WHERE / 검색

- `where(predicate)` — `predicate(cols)` 가 `WhereExprUnit[]` 반환. 여러 번 호출 시 AND 결합.
- `search(fn, searchText)` — `fn(cols)` 가 문자열 컬럼 배열 반환, `searchText` 를 `parseSearchQuery` 로 파싱해 OR/MUST/NOT 조건을 LIKE(소문자 비교)로 추가. 빈 문자열이면 자기 자신 반환(무동작).

## GROUP BY / HAVING

- `groupBy(fn)` — `fn(cols)` 가 그룹 컬럼 배열 반환(`TFrom`→`never`).
- `having(predicate)` — `predicate(cols)` 가 `WhereExprUnit[]` 반환(누적, `TFrom`→`never`).

## JOIN

- `join(as, fn)` — 1:N LEFT OUTER JOIN.
  - `fn(qr: JoinQueryable, cols)` 가 조인 대상 `Queryable` 반환.
  - 결과 타입에 `{ [as]?: R[] }`(배열) 추가.
- `joinSingle(as, fn)` — N:1/1:1 LEFT OUTER JOIN. 결과에 `{ [as]?: R }`(단일 객체) 추가, 기존 동명 key 는 제거.
- `JoinQueryable` (콜백 1번째 인자) 메서드: `from(table)`(대상 테이블의 Queryable), `select(columns)`(커스텀 컬럼), `union(...queries)`(2개 이상 UNION).

## include — 관계 자동 JOIN

- `include(fn)` — `TableBuilder` 에 정의된 FK/FKTarget/RelationKey 관계를 자동 조인.
  - `fn(item: PathProxy<TData>)` 가 관계 경로 프록시를 반환(예: `item.posts.user`).
  - 다단계 경로는 부모 관계 내부로 중첩 배치.
  - N:1(FK)은 `joinSingle`, 1:N(FKTarget)은 `single` 여부에 따라 `joinSingle`/`join`.
  - 관계 미정의, 비-TableBuilder 면 throw.

## 서브쿼리 / UNION / 재귀 CTE

- `wrap()` — 현재 Queryable 을 서브쿼리로 감싼 새 Queryable(`never`). `distinct()`/`groupBy()` 이후 `count()` 할 때 필요.
- `static Queryable.union(...queries)` — 2개 이상 Queryable 을 UNION(중복 제거).
  - 첫 쿼리의 컬럼 구조 사용.
  - 2개 미만이면 `ArgumentError`.
- `recursive(fn)` — WITH RECURSIVE CTE 생성(계층 데이터).
  - `fn(qr: RecursiveQueryable<TData>)` 가 재귀부를 반환.
  - `RecursiveQueryable` 메서드 `from(table)`/`select(columns)`/`union(...queries)` 는 결과에 `self?: TData[]`(자기 참조) 를 부착함.

## SELECT 실행

- `execute(): Promise<TData[]>` — SELECT 실행, 결과 배열.
- `single(): Promise<TData | undefined>` — 단일 결과. 2개 이상이면 `ArgumentError`.
- `first(): Promise<TData | undefined>` — `top(1)` 실행 후 첫 행.
- `count(fn?): Promise<number>` — 행 수.
  - `fn` 으로 셀 컬럼 지정 가능.
  - `distinct()`/`groupBy()` 직후 호출 시 throw(먼저 `wrap()`).
- `exists(): Promise<boolean>` — `top(1)` 결과 존재 여부.
- `getSelectQueryDef(): SelectQueryDef` — SELECT AST 반환(서브쿼리, EXISTS 구성에 사용).
- `getResultMeta(outputColumns?): ResultMeta` — 결과 파싱용 메타(컬럼 타입, JOIN 단일/배열). `outputColumns` 로 부분 컬럼만.

## INSERT

오버로드: `outputColumns` 미지정 시 `Promise<void>`, 지정 시 해당 컬럼만 `Pick<TFrom["$inferColumns"], K>` 로 반환.

- `insert(records: TFrom["$inferInsert"][], outputColumns?)` — 다건 INSERT.
  - MSSQL 행 제한 대응으로 **1000건씩 청크 분할** 실행.
  - 빈 배열이면 무동작.
  - AI 컬럼에 명시값이 있으면 `overrideIdentity` 자동 설정.
- `insertIfNotExists(record, outputColumns?)` — 현재 WHERE 조건에 맞는 행이 없을 때만 INSERT. output 지정 시 단일 레코드 반환.
- `insertInto(targetTable, outputColumns?)` — 현재 SELECT 결과를 `targetTable`(`TableBuilder<any, DataToColumnBuilderRecord<TData>>` 로 컬럼 호환 제약)에 INSERT INTO SELECT.
- QueryDef 생성기: `getInsertQueryDef(records, outputColumns?)`, `getInsertIfNotExistsQueryDef(record, outputColumns?)`, `getInsertIntoQueryDef(targetTable, outputColumns?)`.

## UPDATE / DELETE

오버로드: `outputColumns` 미지정 시 `Promise<void>`, 지정 시 `Pick<TFrom["$inferColumns"], K>[]`.

- `update(recordFwd, outputColumns?)` — `recordFwd(cols)` 가 `QueryableWriteRecord<TFrom["$inferUpdate"]>`(갱신 컬럼→값/표현식)를 반환. 현재 where/join/limit 가 반영됨.
- `delete(outputColumns?)` — 현재 where/join/limit 기준 DELETE.
- QueryDef 생성기: `getUpdateQueryDef(recordFwd, outputColumns?)`, `getDeleteQueryDef(outputColumns?)`.

## UPSERT

`upsert(updateFn, insertFn?, outputColumns?)` — WHERE 조건 행이 있으면 UPDATE, 없으면 INSERT(MERGE 패턴).

- 오버로드:
  - `updateFn(cols)` 만 — update/insert 동일 레코드, `void`.
  - `(updateFn, outputColumns)` — output 지정.
  - `(updateFn, insertFn)` — `insertFn(updateRecord)` 가 update 결과 레코드를 받아 insert 레코드를 따로 생성.
  - `(updateFn, insertFn, outputColumns)` — 둘 다.
- QueryDef 생성기: `getUpsertQueryDef(updateRecordFn, insertRecordFn, outputColumns?)`.

## 기타

- `switchFk(enabled: boolean)` — 이 table/view 의 FK 제약 on/off(트랜잭션 내 가능). 비-table/view 면 throw.

## 소비자 타입

- `QueryableRecord<TData>` — `TData` 의 각 필드를 매핑: `ColumnPrimitive`→`ExprUnit<T>`, `DataRecord[]`→`QueryableRecord<U>[]`, 중첩 `DataRecord`→`QueryableRecord`. 콜백이 받는 컬럼 프록시 타입.
- `QueryableWriteRecord<TData>` — 각 `ColumnPrimitive` 필드를 `ExprInput<T>`(값 또는 `ExprUnit`)로. update/upsert/insert 콜백 반환 타입.
- `UnwrapQueryableRecord<R>` — `select()` 결과를 역변환: `ExprUnit<T>`→`T`, 중첩/배열 재귀 언랩, `undefined` 보존, symbol key 제거. `select` 후 `TData` 가 됨.
- `PathProxy<TObject>` — `include()` 경로 지정용 프록시. `ColumnPrimitive` 가 아닌(관계) 필드만 접근 가능, 배열은 요소 타입으로 언랩, `[PATH_SYMBOL]` 에 경로 수집.

## 팩토리, 헬퍼

- `queryable(db, tableOrView, as?)` — Table/View 별 `Queryable` 팩토리 함수 반환.
  - `as` 미지정 시 `db.getNextAlias()`.
  - Table+columns 면 컬럼을 `expr.col` 로 초기화, View+viewFn 면 base query 컬럼을 alias 변환.
  - `DbContext.queryable` 의 내부 구현.
- `getMatchedPrimaryKeys(fkCols, targetTable): string[]` — FK 컬럼 배열을 대상 테이블 PK 와 매칭해 PK 컬럼명 반환.
  - 개수 불일치 시 throw.
  - `include` 의 조인 조건 구성에 사용.

## Executable — 프로시저 실행 (`exec/executable.ts`)

`Executable<TParams, TReturns>` — `ProcedureBuilder` 를 래핑. `DbContext.executable()` 로 생성.

- `execute(params: InferColumnExprs<TParams>): Promise<InferColumns<TReturns>[][]>` — 프로시저 실행, 결과 셋 배열 반환.
- `getExecProcQueryDef(params?): ExecProcQueryDef` — 실행 AST.
  - 파라미터는 `ExprUnit` 이면 그 expr, 아니면 메타 타입으로 `expr.val` 래핑.
  - 프로시저에 파라미터가 없는데 전달하면 throw.
- `executable(db, builder)` — `() => Executable` 팩토리 함수.

## 텍스트 검색 (`exec/search-parser.ts`)

`parseSearchQuery(searchText): ParsedSearchQuery` — 검색 문자열을 SQL LIKE 패턴으로 파싱. `Queryable.search` 가 사용.

- `ParsedSearchQuery` — `{ or: string[]; must: string[]; not: string[] }`.
  - `or`=OR(하나 이상), `must`=AND 필수(`+`접두/따옴표), `not`=NOT 제외(`-`접두).
  - 값은 LIKE 패턴.
- 구문: 공백 구분=OR, `+term`=필수, `-term`=제외, `"구문"`=정확 구문(필수), `*`=와일드카드(`app*`→`app%`). 와일드카드 없는 단어는 `%term%`(부분일치).
- 이스케이프: `\\` `\*` `\%` `\"` `\+` `\-` 는 각 리터럴 문자. 닫히지 않은 따옴표는 일반 텍스트.
