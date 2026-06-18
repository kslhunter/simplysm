# @simplysm/sd-core-common — 배열 확장 (Array.ext)

`@simplysm/sd-core-common` import 시 전역 `Array`/`ReadonlyArray` 프로토타입에 추가되는 LINQ 류 메서드들. 비교가 필요한 곳은 `ObjectUtils.equal`(깊은 비교) 사용. `predicate`/`selector` 콜백은 모두 `(item, index)` 시그니처.

## 조회 / 필터

- `single(predicate?): T | undefined` — 조건(없으면 전체)에 맞는 요소가 정확히 1개면 반환, 2개 이상이면 Error. 0개면 undefined.
- `first(predicate?): T | undefined` — 조건에 맞는 첫 요소(없으면 `[0]`).
- `last(predicate?): T | undefined` — 조건에 맞는 마지막 요소(없으면 마지막 원소). 뒤에서부터 탐색.
- `filterExists(): NonNullable<T>[] ` — null/undefined 제거(`!= null`).
- `ofType<N extends T>(type: Type<WrappedType<N>>): N[]` — `instanceof type` 또는 `constructor === type` 인 요소만. primitive 는 `WrappedType`(String/Number/Boolean) 으로 지정.
- `filterAsync(predicate: (item, index) => Promise<boolean>): Promise<T[]>` — 순차(직렬) 비동기 필터.

## 매핑

- `mapAsync<R>(selector: (item, index) => Promise<R>): Promise<R[]>` — 순차 비동기 map.
- `parallelAsync<R>(fn): Promise<R[]>` — `Promise.all` 병렬 비동기 map.
- `mapMany(): T` / `mapMany<R>(selector): R[]` — selector 결과(또는 자기자신)를 `flat()` 후 `filterExists()`. 1단계 평탄화 + null 제거.
- `mapManyAsync<R>(selector: (item, index) => Promise<R[]>): Promise<R[]>` — 비동기 매핑 후 mapMany.

## 그룹화 / Map·Object 변환

`keySelector`/`valueSelector` 모두 `(item, index)`. valueSelector 생략 시 값은 item 자체.

- `groupBy<K>(keySelector)` / `groupBy<K,V>(keySelector, valueSelector): { key: K; values: V[] }[]` — 키 동등성은 `ObjectUtils.equal`(객체 키도 그룹화 가능).
- `toMap<K>(keySelector)` / `toMap<K,V>(keySelector, valueSelector): Map<K, V>` — 키 중복 시 Error.
- `toMapAsync<K,V>(keySelector, valueSelector?): Promise<Map<K,V>>` — 비동기 selector 허용, 키 중복 시 Error.
- `toArrayMap<K,V>(keySelector, valueSelector?): Map<K, V[]>` — 같은 키의 값들을 배열로 누적.
- `toSetMap<K,V>(keySelector, valueSelector?): Map<K, Set<V>>` — 같은 키의 값들을 Set 으로 누적.
- `toMapValues<K,V>(keySelector, valueSelector: (items: T[]) => V): Map<K, V>` — 키별로 모은 배열 전체를 valueSelector 로 집계(그룹 합계 등).
- `toObject(keySelector: (item,index) => string)` / `toObject<V>(keySelector, valueSelector): Record<string, V>` — 객체로 변환. 키 중복 시 Error.
- `toTree<K extends keyof T, P extends keyof T>(keyProp, parentKey): ITreeArray<T>[]` — `parentKey` 값이 null 인 것을 루트로, `parentKey === keyProp` 매칭으로 `children` 트리 구성. 각 노드는 `ObjectUtils.clone` 된다. `ITreeArray<T> = T & { children: ITreeArray<T>[] }`.

## 정렬 / 중복제거

`selector` 반환은 `string | number | DateOnly | DateTime | Time | undefined`. Date 계열은 `tick` 으로 비교, 문자열은 `localeCompare`, undefined 는 항상 끝/처음. 비교 불가 타입 혼합 시 Error.

- `orderBy(selector?): T[]` — 오름차순 새 배열. `orderByDesc(selector?): T[]` — 내림차순 새 배열.
- `distinct(matchAddress?): T[]` — 중복 제거 새 배열. `matchAddress === true` 면 참조(`===`) 비교(Set 사용), 아니면 primitive 는 타입+값 키, 객체는 `ObjectUtils.equal` 로 비교.
- `shuffle(): T[]` — Fisher–Yates 셔플 새 배열.
- (제자리, 원본 변형 후 반환) `orderByThis(selector?)`, `orderByDescThis(selector?)`, `distinctThis(matchAddress?)`.

## 차이 / 병합

- `diffs<P>(target, options?): TArrayDiffsResult<T, P>[]` — 두 배열의 추가/삭제/수정 산출. `options.excludes?: string[]`(동일성 비교 제외 필드), `options.keys?: string[]`(이 키들이 같으면 "수정"으로 매칭). 결과 항목: `{source:undefined,target:P}`(추가) | `{source:T,target:undefined}`(삭제) | `{source:T,target:P}`(수정).
- `oneWayDiffs<K extends keyof T>(orgItems, keyPropNameOrFn, options?): TArrayDiffs2Result<T>[]` — 원본(배열 또는 `Map<key,item>`) 대비 현재 배열의 변경 단방향 감지.
  - `keyPropNameOrFn: K | ((item) => K)` — 매칭 키(프로퍼티명 또는 추출 함수). 키 값이 null 이면 무조건 `create`.
  - `options.includeSame?: boolean` — true 면 변경없는 항목도 `type:"same"` 으로 포함(기본 false, 제외).
  - `options.excludes?` / `options.includes?: string[]` — 동일성 비교 시 제외/포함 필드.
  - 결과: `{type:"create",item,orgItem:undefined}` | `{type:"update",item,orgItem}` | `{type:"same",item,orgItem}`.
- `merge<P>(target, options?): (T | P | (T & P))[]` — `diffs` 결과로 원본 clone 에 수정(`ObjectUtils.merge`)·추가를 반영(삭제는 미반영). `options` 는 diffs 와 동일(`keys`/`excludes`).

## 집계

- `sum(selector?): number` — 합계. 값이 number 아니면 Error.
- `min()` / `min<P>(selector?): P | undefined` — 최솟값(number/string 만, 아니면 Error).
- `max()` / `max<P>(selector?): P | undefined` — 최댓값(number/string 만, 아니면 Error).

## 가변(in-place) 조작 — 체인용 this 반환

- `insert(index, ...items): this` — index 위치에 splice 삽입.
- `remove(item): this` / `remove(selector: (item,index) => boolean): this` — 일치 요소(또는 조건 통과 요소) 전부 제거.
- `toggle(item): this` — 있으면 제거, 없으면 push.
- `clear(): this` — 전체 제거(`remove(() => true)`).

## export 타입

- `TArrayDiffsResult<T, P>` — diffs 결과 유니온(위 참조).
- `TArrayDiffs2Result<T>` — oneWayDiffs 결과 유니온(위 참조).
- `ITreeArray<T> = T & { children: ITreeArray<T>[] }` — toTree 노드 타입.
