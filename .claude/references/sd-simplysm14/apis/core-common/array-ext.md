# @simplysm/core-common — 배열 확장 메서드

`@simplysm/core-common` import 시 `Array.prototype` 에 설치되는 확장 메서드. 배열을 조회·그룹화·정렬·중복제거·Map/객체/트리 변환·diff/merge·집계할 때 함께 읽힘. 모두 `array.method(...)` 로 직접 호출. enumerable=false 로 설치되어 `for...in`·`Object.keys` 에 노출되지 않음.

표기: **읽기 전용**(원본 불변, 새 배열/값 반환) vs **@mutates**(원본 직접 수정). 정렬/중복제거는 두 버전(예: `orderBy` vs `orderByThis`)이 있음.

## 조회 / 필터

- `single(predicate?)`: → `T | undefined` — 조건에 맞는 단 하나 반환. **2개 이상이면 ArgumentError throw**. 0개면 undefined. "유일해야 한다"는 불변식 검증에 사용.
- `first(predicate?)`: → `T | undefined` — 첫 요소(predicate 있으면 첫 매칭). 없으면 undefined.
- `last(predicate?)`: → `T | undefined` — 마지막 요소(predicate 있으면 뒤에서 첫 매칭).
- `filterExists()`: → `NonNullable<T>[]` — null/undefined 제거(타입도 좁혀짐).
- `ofType(type)`: → 좁혀진 배열 — PrimitiveTypeStr(`"string"`·`"number"`·`"boolean"`·`"DateTime"`·`"DateOnly"`·`"Time"`·`"Uuid"`·`"Bytes"`) 또는 생성자(`Type<N>`)로 필터. 문자열이면 typeof/instanceof, 생성자면 `instanceof` 또는 `constructor` 일치. 혼합 배열에서 특정 타입만 뽑을 때.
- `filterAsync(predicate)`: → `Promise<T[]>` — 비동기 조건 필터(**순차** 실행).

## 비동기 매핑

- `mapAsync(selector)`: → `Promise<R[]>` — 비동기 매핑(**순차** 실행, 순서 보존).
- `parallelAsync(fn)`: → `Promise<R[]>` — `Promise.all` 기반 **병렬** 실행. 하나라도 reject 면 전체 reject. 독립 IO 를 동시에 돌릴 때.
- `mapMany(selector?)`: → 평탄화 배열 — selector 매핑 후 1단계 flat + `filterExists`. selector 없으면 자신을 flat. 중첩 배열 펼칠 때.
- `mapManyAsync(selector?)`: → `Promise<...>` — 비동기 매핑 후 평탄화(순차).

## 그룹화 / Map·객체 변환

- `groupBy(keySelector, valueSelector?)`: → `{ key, values }[]` — key 별 그룹. 원시 key 는 O(n), 객체 key 는 깊은 비교 O(n²). 객체 key 가 불필요하면 `toArrayMap` 권장.
- `toMap(keySelector, valueSelector?)`: → `Map<K, V|T>` — key→단일값. **중복 key 면 ArgumentError**. 1:1 인덱싱에 사용.
- `toMapAsync(keySelector, valueSelector?)`: → `Promise<Map>` — 위의 비동기(순차) 버전(selector 가 Promise 반환 허용).
- `toArrayMap(keySelector, valueSelector?)`: → `Map<K, (V|T)[]>` — key→값 배열(중복 허용). O(n) 그룹화의 기본 선택지.
- `toSetMap(keySelector, valueSelector?)`: → `Map<K, Set<V|T>>` — key→Set(중복 자동 제거).
- `toMapValues(keySelector, valueSelector)`: → `Map<K, V>` — key 별로 모은 **항목 배열 전체**를 valueSelector(items)→집계값으로 변환. 그룹별 합계 등.
- `toObject(keySelector, valueSelector?)`: → `Record<string, V|T>` — key(string)→값 객체. 중복 key(둘 다 non-null)면 ArgumentError.

## 트리화

- `toTree(keyProp, parentKey)`: → `TreeArray<T>[]` — 평면 배열을 트리로. `parentKey` 값이 null/undefined 인 항목이 루트, 각 노드에 `children` 추가(항목은 clone 됨). 내부 `toArrayMap` 으로 O(n). `TreeArray<T> = T & { children: TreeArray<T>[] }`.

```ts
items.toTree("id", "parentId");
// [{ id: 1, name: "root", children: [{ id: 2, ..., children: [] }] }]
```

## 정렬 / 중복제거

- `orderBy(selector?)` / `orderByDesc(selector?)`: → `T[]` (새 배열) — selector 가 반환한 string/number/boolean/DateTime/DateOnly/Time/undefined 로 정렬. null/undefined 는 오름차순 앞·내림차순 뒤. 날짜타입은 tick 비교, 문자열은 `localeCompare`. selector 없으면 요소 자체.
- `orderByThis(selector?)` / `orderByDescThis(selector?)`: → `T[]` @mutates — 원본을 in-place 정렬.
- `distinct(options?)`: → `T[]` (새 배열) — 중복 제거. options: `true`/`{ matchAddress: true }`=참조 비교 O(n), `{ keyFn }`=커스텀 key O(n), 미지정=원시는 값·객체는 깊은 비교 O(n²). 대량 객체 배열엔 `keyFn` 권장.
- `distinctThis(options?)`: → `T[]` @mutates — 원본에서 중복 제거(첫 등장만 유지).

## diff / merge

- `diffs(target, options?)`: → `ArrayDiffsResult<T,P>[]` — 두 배열 비교. 결과 항목은 `{ source: undefined, target }`(INSERT) / `{ source, target: undefined }`(DELETE) / `{ source, target }`(UPDATE). options: `keys`=동일성 판정 key(없으면 전체 깊은 비교), `excludes`=비교 제외 속성. target 에 중복 key 면 첫 매칭만.
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?)`: → `ArrayOneWayDiffResult<T>[]` — 현재 배열을 원본(배열 또는 `Map<key, item>`) 대비 분류. 결과 type: `"create"`(key 값 없거나 원본에 없음)·`"update"`(값 다름)·`"same"`(같음, `includeSame: true` 일 때만 포함). keyPropNameOrGetValFn 은 key 속성명 또는 `(item)=>키값` 함수. options.excludes/includes 로 비교 범위 조정. 저장 시 INSERT/UPDATE 판정에 사용.
- `merge(target, options?)`: → `(T|P|(T&P))[]` (새 배열) — `diffs` 결과로 source 를 기준 삼아 병합. UPDATE 는 `obj.merge` 로 깊은 병합, INSERT 는 추가, DELETE 는 유지(원본 보존). options 는 `diffs` 와 동일.

`ArrayDiffsResult`·`ArrayOneWayDiffResult`·`TreeArray`·`ComparableType`(=`string | number | boolean | DateTime | DateOnly | Time | undefined`) 타입이 함께 export 됨.

## 집계

- `sum(selector?)`: → number — 합계(빈 배열 0). 숫자 아닌 값이면 ArgumentError.
- `min(selector?)` / `max(selector?)`: → `string | number | undefined` — 최소/최대. 숫자·문자열만 허용(아니면 ArgumentError). 빈 배열 undefined.

## 그 외 @mutates

- `insert(index, ...items)`: → this — index 위치에 삽입.
- `remove(item)` / `remove(selector)`: → this — 일치 항목(또는 조건 매칭) 모두 제거(역순 순회 O(n)).
- `toggle(item)`: → this — 있으면 제거·없으면 push.
- `clear()`: → this — 전체 비움.

## shuffle

- `shuffle()`: → `T[]` (새 배열) — Fisher–Yates 무작위 섞기. 원본 불변.

```ts
const grouped = users.toArrayMap((u) => u.teamId);     // Map<teamId, User[]>
const sorted = items.orderBy((x) => x.createdAt);       // DateTime 기준 오름차순
const diff = next.oneWayDiffs(prev, "id");              // create/update/same 분류
```
