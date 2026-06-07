# @simplysm/core-common — 배열/Set/Map 확장

`@simplysm/core-common` 진입점을 import 하면 `Array`/`ReadonlyArray`/`Set`/`Map` 프로토타입에 확장 메서드가 전역 설치됨(별도 import 불필요, 패키지를 한 번이라도 import 한 코드 전체에 적용). LINQ 류 조회·그룹화·집합 연산·diff/merge·트리 변환을 다룰 때 함께 참조. 관련 결과 타입(`ArrayDiffsResult`/`ArrayOneWayDiffResult`/`TreeArray`/`ComparableType`)도 진입점에서 export 됨.

## Array 확장 — 조회/필터

- `single(predicate?): TItem | undefined` — 조건에 맞는 유일 요소. 2개 이상 매칭이면 `ArgumentError`(데이터 무결성 단언용). predicate 생략 시 전체 대상.
- `first(predicate?): TItem | undefined` — 첫 매칭(생략 시 `[0]`). 없으면 undefined.
- `last(predicate?): TItem | undefined` — 마지막 매칭(생략 시 끝 요소). 뒤에서부터 탐색.
- `filterExists(): NonNullable<TItem>[] ` — null/undefined 제거(타입도 좁힘).
- `ofType(type)` — 특정 타입만 필터. `type` 이 `PrimitiveTypeStr`(`"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`)면 해당 원시·값타입, 생성자(`Type<N>`)면 `instanceof`/생성자 일치로 좁힘.
- `filterAsync(predicate): Promise<TItem[]>` — 비동기 술어를 순차 평가하는 필터.

## Array 확장 — 매핑/평탄화 (비동기)

- `mapAsync(selector): Promise<TResult[]>` — 비동기 매핑(순차).
- `mapMany()` — 한 단계 평탄화 후 null 제거. `mapMany(selector)` — 매핑 후 평탄화.
- `mapManyAsync(selector): Promise<TResult[]>` — 비동기 매핑 후 평탄화(순차).
- `parallelAsync(fn): Promise<TResult[]>` — `Promise.all` 병렬 처리. 하나라도 reject 면 전체 즉시 reject(원자성). 부분 실패를 허용하려면 사용하지 말 것.

## Array 확장 — 그룹화/Map/Object 변환

- `groupBy(keySelector, valueSelector?): { key; values }[]` — key 별 그룹. 원시 key 는 O(n)(Map), 객체 key 는 O(n²)(깊은 비교). 원시 key 만이면 `toArrayMap` 이 더 효율적.
- `toMap(keySelector, valueSelector?): Map` — key→단일값 Map. 중복 key 면 `ArgumentError`.
- `toMapAsync(...)` — 비동기 selector 버전(중복 시 `ArgumentError`).
- `toArrayMap(keySelector, valueSelector?): Map<K, V[]>` — key→배열 Map(O(n)). 중복 key 허용·누적.
- `toSetMap(keySelector, valueSelector?): Map<K, Set<V>>` — key→Set Map.
- `toMapValues(keySelector, valueSelector)` — key 별로 모은 배열을 `valueSelector(items)` 로 집계해 Map 생성.
- `toObject(keySelector, valueSelector?): Record<string, V>` — 문자열 key→값 객체. 중복 key 면 `ArgumentError`(undefined 값은 덮어쓰기 허용).
- `toTree(keyProp, parentKey): TreeArray<TItem>[]` — 평면 배열을 트리로(`parentKey` 가 null 인 것이 루트, 각 노드에 `children` 추가, 항목은 `clone` 됨, O(n)).

## Array 확장 — 중복제거/정렬

- `distinct(options?): TItem[]` — 중복 제거(새 배열). `options` 가 boolean 이면 `matchAddress`(참조 비교, Set 기반 O(n)). 객체이면 `{ matchAddress?, keyFn? }` — `keyFn`(item→string|number) 주면 O(n), 없으면 객체는 깊은 비교 O(n²).
- `orderBy(selector?): TItem[]` / `orderByDesc(selector?): TItem[]` — 오름/내림차순 새 배열. selector 는 `string|number|DateOnly|DateTime|Time|undefined` 반환(날짜류는 tick 비교). null/undefined 는 오름차순에서 앞, 내림차순에서 뒤.
- `sum(selector?): number` — 합계(빈 배열 0). 숫자 아닌 값이면 `ArgumentError`.
- `min()/max()` (선택자 버전 포함) — 최소/최대(number·string 만, 그 외 `ArgumentError`). 빈 배열이면 undefined.
- `shuffle(): TItem[]` — Fisher-Yates 셔플 새 배열.

## Array 확장 — diff/merge

- `diffs(target, options?): ArrayDiffsResult[]` — 두 배열 비교. `options.keys`(키 비교용 속성들), `options.excludes`(비교 제외 속성). 전체 일치 우선, 없으면 key 일치를 UPDATE 로 봄. 결과 union `ArrayDiffsResult<TOriginal, TOther>`: `{ source: undefined; target }`(INSERT) / `{ source; target: undefined }`(DELETE) / `{ source; target }`(UPDATE).
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?): ArrayOneWayDiffResult[]` — 원본(배열 또는 Map) 대비 단방향 diff. key 추출은 속성명 또는 함수. `options`: `includeSame`(같은 항목도 결과 포함), `excludes`/`includes`(비교 대상 속성 한정). 결과 `ArrayOneWayDiffResult<TItem>`: `{ type: "create"; item; orgItem: undefined }`(key 없거나 원본에 없음) / `{ type: "update"; item; orgItem }`(값 다름) / `{ type: "same"; item; orgItem }`(`includeSame` 시).
- `merge(target, options?): (...)[]` — `diffs` 결과로 source 를 기준 삼아 UPDATE 는 `obj.merge`, INSERT 는 추가한 새 배열(clone 기반). `keys`/`excludes` 는 `diffs` 와 동일.

```ts
const result = current.diffs(prev, { keys: ["id"] });
for (const d of result) {
  if (d.source == null) insert(d.target);       // INSERT
  else if (d.target == null) remove(d.source);  // DELETE
  else update(d.source, d.target);              // UPDATE
}
```

## Array 확장 — 원본 변경(@mutates)

원본 배열을 직접 수정하는 변형 메서드. `this` 또는 자기 자신을 반환해 체이닝 가능:

- `distinctThis(options?)` — 원본에서 중복 제거(역순 splice).
- `orderByThis(selector?)` / `orderByDescThis(selector?)` — 원본 정렬(`Array.sort`).
- `insert(index, ...items)` — index 위치에 삽입.
- `remove(item)` / `remove(selector)` — 일치 항목/조건 항목 제거(역순 순회).
- `toggle(item)` — 있으면 제거, 없으면 추가.
- `clear()` — 전체 비움.

## Set 확장

- `adds(...values): this` — 여러 값 일괄 추가.
- `toggle(value, addOrDel?: "add" | "del"): this` — 값 토글. `addOrDel` 생략 시 자동 토글, `"add"` 강제 추가, `"del"` 강제 제거(조건부 추가/제거를 한 줄로).

## Map 확장

- `getOrCreate(key, newValue): V` / `getOrCreate(key, newValueFn: () => V): V` — 없으면 설정 후 반환. 둘째 인자가 함수면 **팩토리로 호출**되므로, 함수 자체를 값으로 저장하려면 `() => myFn` 처럼 팩토리로 감쌀 것.
- `update(key, updateFn: (v: V | undefined) => V): void` — 현재 값(없으면 undefined)을 받아 새 값 설정. 카운터 증가·배열 누적 등에.

```ts
const countMap = new Map<string, number>();
countMap.update("a", (v) => (v ?? 0) + 1);
const groupMap = new Map<string, string[]>();
groupMap.getOrCreate("g", () => []).push("item");
```
