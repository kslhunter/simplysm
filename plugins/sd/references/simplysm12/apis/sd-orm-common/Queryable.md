# @simplysm/sd-orm-common — Queryable

`class Queryable<D extends DbContext, T>`. 불변(immutable) 체이닝 쿼리 빌더. 각 메서드는 새 Queryable 을 반환(원본 유지). `db.<테이블필드>` 가 테이블 Queryable 이며 거기서 체이닝한다. `_def`(IQueryableDef)에 절을 누적하고, 실행 메서드에서 `getSelectQueryDef()` 등으로 `TQueryDef` 로 직렬화해 `db.executeDefsAsync` 호출.

타입: entity 콜백 인자는 `TEntity<T>`(각 컬럼이 `QueryUnit`, 관계는 중첩). `select` 후 커스텀 entity 가 되면 `_isCustomEntity=true` 로 표시되어 편집/INSERT 류가 금지된다.

## 생성 / 식별

- `constructor(db, tableType: Type<T>, as?)` — 테이블 기준 생성. `@Table` 없으면 throw. (그 외 clone/wrapping 용 오버로드 존재.)
- `static union<ND, NT>(qrs: Queryable<ND, NT>[], as?): Queryable<ND, NT>` — 여러 Queryable 을 UNION. 내부적으로 각각 wrap+orderBy 제거 후 결합.
- `get tableName(): string` / `get tableDescription(): string` / `get tableNameDef(): IQueryTableNameDef` — wrapping 이후엔 호출 시 throw.
- `ofType<A>(): Queryable<D, A>` — 타입만 캐스팅(런타임 동작 없음).

## SELECT 조립 (조회 빌드 시)

- `select<R>(fwd: (entity) => TSelectEntity<R>): Queryable<D, R>` — 출력 컬럼/구조 지정. 이후 customEntity 가 되어 편집 불가.
- `selectByType<A>(tableType: Type<A>): Queryable<D, A>` — 대상 테이블의 컬럼들만 골라 select.
- `where(predicate: (entity) => 조건배열): Queryable<D, T>` — AND 누적(기존 where 와도 AND). predicate 는 `qh` 결과/Queryable 배열.
- `having(predicate)` — GROUP BY 후 조건. where 와 동형.
- `distinct(): Queryable<D, T>` — DISTINCT.
- `top(count: number)` — 상위 N.
- `orderBy(fwdOrName, desc?)` — 정렬 추가. 첫 인자는 entity 함수 또는 `"fk.col"` 체인 문자열(문자열이면 필요한 include 자동 수행). 같은 표현식 중복 시 throw. `desc=true` 면 DESC.
- `clearOrderBy()` — 정렬 제거.
- `limit(skip: number, take: number)` — OFFSET/FETCH.
- `sample(rowCount: number)` — 샘플링(TABLESAMPLE 등 dialect 의존).
- `groupBy(fwd: (entity) => 값배열)` — 그룹화. `"NULL"` 로 평가되는 항목은 제외.
- `lock(): Queryable<D, T>` — 행 잠금 힌트.

## 피벗 / 언피벗

- `pivot(valueFwd, valueDupFwd, emptyValue, pivotFwd, pivotKeys): Queryable<D, T & Record<P, V>>` — `pivotKeys` 별 컬럼 생성. mysql 은 `IF(...)`+groupBy 로, mssql 류는 PIVOT 절로. `valueFwd`=피벗 값 컬럼, `valueDupFwd`=값 컬럼 재가공(집계 등), `emptyValue`=빈 셀 값, `pivotFwd`=피벗 기준 컬럼, `pivotKeys`=펼칠 키 목록. value 가 QueryUnit 아니면 미구현 throw.
- `unpivot(valueColumn, pivotColumn, pivotKeys, _resultType): Queryable<...>` — 열→행. mysql 미구현 throw. `valueColumn`=값 담을 새 컬럼명, `pivotColumn`=원래 컬럼명을 담을 컬럼명, `pivotKeys`=언피벗할 기존 컬럼명들, `_resultType`=값 타입.

## JOIN / 관계 로딩

- `join<A, J, R>(joinTypeOrQrs, as, fwd): Queryable<D, Omit<T,A> & { [A]: R[] }>` — 1:N JOIN. `joinTypeOrQrs`=대상 테이블 타입 또는 Queryable 배열(배열이면 union). `as`=결과 키. `fwd(qr, en)`=조인 대상에 where 등 적용해 반환. 동일 as 중복이면 그대로 반환.
- `joinSingle<A, J, R>(joinTypeOrQrs, as, fwd): Queryable<D, T & { [A]?: R }>` — 1:1 JOIN(단일 객체).
- `include(arg: (entity) => 관계 | 관계[])` — `@ForeignKey`/`@ForeignKeyTarget`/Reference 정의를 따라 관계 자동 JOIN. 콜백 본문에서 접근 체인 파싱(`item.parent.child`). FK 는 joinSingle, FKT 는 `isSingle` 에 따라 join/joinSingle.
- `includeByTableChainedName(tableChainedName: string)` — `"fk.fk2"` 점 표기 체인으로 include. wrapping 이후엔 throw.

## 검색

- `search(fwd: (entity) => 문자열컬럼[], searchText): Queryable<D, T>` — 다중 컬럼 텍스트 검색. groupBy 있으면 having, 아니면 where 로. `"=="`/`"<>"` 접두 시 regexp/notRegexp(완전일치성), 그 외엔 공백 분할 토큰 AND(`includes`), 토큰별 `"<>"` 접두는 notIncludes. 컬럼 간 OR.

## wrap (서브쿼리화)

- `wrap(): Queryable<D, T>` / `wrap<R extends Partial<T>>(tableType): Queryable<D, R>` — 현재 쿼리를 서브쿼리(FROM)로 감싼 새 Queryable. groupBy/distinct/limit 후 count/join/편집을 다시 하려면 wrap 필요. tableType 지정 시 평면 컬럼만 추리고 distinct. mssql 류는 정렬 컬럼을 `__order_N` 으로 승격해 보존.

## 실행 (조회)

- `resultAsync(): Promise<T[]>` — SELECT 실행 + 타입/JOIN 파싱된 결과 배열. db 없으면 throw.
- `singleAsync(): Promise<T | undefined>` — 결과 1건. 2건 이상이면 throw(개발모드면 콘솔 출력).
- `countAsync()` / `countAsync(fwd: (entity) => 값)`: `Promise<number>` — 행 수(인자 주면 distinct count). distinct/groupBy 이후엔 wrap 안내하며 throw.
- `existsAsync(): Promise<boolean>` — count > 0.

## 실행 (편집) — customEntity/join/groupBy 등과 함께 쓰면 대부분 throw

- `insertAsync(records: TInsertObject<T>[])` / `insertAsync(records, outputColumns: OK[]): Promise<{ [K in OK]: T[K] }[]>` — INSERT. outputColumns 지정 시 해당 컬럼 반환(mysql 은 LAST_INSERT_ID/PK 재조회로 처리). records 빈 배열이면 [] 또는 undefined.
- `insertWithoutFkCheckAsync(records, outputColumns?)` — FK 체크 비활성화 후 INSERT(앞뒤로 configForeignKeyCheck off/on 삽입).
- `bulkInsertAsync(records: TInsertObject<T>[]): Promise<void>` — 드라이버 네이티브 대량 INSERT. wrapping 이후엔 throw. 빈 배열 no-op.
- `bulkUpsertAsync(records)` — mysql 전용(그 외 throw). 대량 UPSERT.
- `updateAsync(recordFwd: (entity) => TUpdateObject<T>, outputColumns?)` — UPDATE. recordFwd 는 entity 받아 변경 레코드 반환(Promise 가능).
- `deleteAsync(outputColumns?)` — DELETE(where/join 반영).
- `upsertAsync(inAndUpsertFwd)` / `upsertAsync(updateFwd, insertFwd, outputColumns?)` — UPSERT. WHERE 필수(없으면 throw). 1인자형은 동일 객체를 update/insert 양쪽에, 2인자형은 update 레코드로부터 insert 레코드 파생. AI(autoIncrement)+PK 단일 컬럼이면 IDENTITY_INSERT 자동 처리(mysql 외).
- `insertIntoAsync(tableType: Type<T>, stopAutoIdentity?)` — 현재 SELECT 결과를 다른 테이블로 INSERT INTO. `stopAutoIdentity` 는 mssql 류 전용(IDENTITY_INSERT on/off 감쌈, 그 외 throw).
- `configIdentityInsert(state: "on" | "off")` — IDENTITY_INSERT 설정을 prepareDefs 에 push.

## prepare (즉시 실행 대신 큐에 적재 → DbContext.executePreparedAsync 로 일괄)

- `insertPrepare(records)` / `insertWithoutFkCheckPrepare(records)` / `updatePrepare(recordFwd)` / `deletePrepare()` / `upsertPrepare(updateObjOrFwd, insertObjOrFwd?)` — 각 편집을 `db.prepareDefs` 에 누적(반환 없음).

## QueryDef 직렬화 (직접 IR 가 필요할 때)

- `getSelectQueryDef()` / `getInsertQueryDef(obj, outputColumns)` / `getUpdateQueryDef(obj, outputColumns)` / `getInsertIfNotExistsQueryDef(insertObj, outputColumns)` / `getUpsertQueryDef(updateObj, insertObj, outputColumns, aiKeyName, pkColNames)` / `getDeleteQueryDef(outputColumns)` — 각 절 검증 후 `I*QueryDef` 반환(부적합 조합이면 한국어 메시지로 throw).

## 관련 타입

- `TInsertObject<T>` — INSERT 가능한 컬럼만(`TQueryValue` 필드, undefined 가능 필드는 optional).
- `TUpdateObject<T>` — UPDATE 레코드. 각 필드는 값 또는 `QueryUnit`(표현식 갱신 가능).
- `TEntity<T>` / `TSelectEntity<T>` / `TEntityUnwrap<T>` / `TIncludeEntity<T>` — 컬럼을 QueryUnit 로 매핑한 엔티티 형(콜백 인자/결과 추론용).
- `IQueryableDef` — 내부 누적 절 정의(from/join/where/orderBy/limit/pivot/lock/sample 등). join 원소는 `isSingle` 플래그 보유.
