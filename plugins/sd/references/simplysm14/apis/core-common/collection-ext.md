# @simplysm/core-common — collection-ext

진입점을 import 하면 전역 설치되는 Array/ReadonlyArray/Set/Map 프로토타입 확장과 결과 타입. 컬렉션 조회·그룹화·정렬·diff/merge·트리 변환을 한 작업에서 다룰 때 봄.

## 설치와 규약

- `import "@simplysm/core-common"`(또는 임의 심볼 import) 시 `index.ts` 가 `arr-ext`/`set-ext`/`map-ext` 를 먼저 import 하므로 프로토타입 메서드가 전역 설치됨. 별도 import 없이 배열/Set/Map 인스턴스에서 호출함.
- `ReadonlyArray<T>` — 원본을 바꾸지 않는 읽기 확장(`ReadonlyArrayExt`)을 제공함.
- `Array<T>` — 읽기 확장 + 원본 변경 확장(`MutableArrayExt`)을 함께 제공함.
- `@mutates`(원본 변경) 메서드: `distinctThis`, `orderByThis`, `orderByDescThis`, `insert`, `remove`, `toggle`, `clear`(Array), `adds`, `toggle`(Set), `update`(Map). 그 외 Array 메서드는 새 배열/값을 반환함.

## Array 조회·비동기·집계

- `single(predicate?: (item, index) => boolean): T | undefined` — 조건에 맞는 단일 요소. 결과가 2개 이상이면 `ArgumentError`, 없으면 undefined.
- `first(predicate?): T | undefined` — predicate 가 있으면 `find`, 없으면 첫 요소.
- `last(predicate?): T | undefined` — predicate 가 있으면 뒤에서 앞으로 탐색, 없으면 마지막 요소.
- `filterExists(): NonNullable<T>[]` — null/undefined 를 제거하고 타입을 `NonNullable` 로 좁힘.
- `filterAsync(predicate: (item, index) => Promise<boolean>): Promise<T[]>` — predicate 를 순차 실행해 true 요소만 모음.
- `ofType(type)` — 지정 타입 요소만 반환. `PrimitiveTypeStr`(`"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`, `"Bytes"`=Uint8Array)는 `typeof`/`instanceof` 로, 생성자 타입은 `instanceof` 또는 `constructor` 일치로 판정함.
- `mapAsync(selector: (item, index) => Promise<R>): Promise<R[]>` — selector 를 순차 실행해 결과 배열을 만듦.
- `mapMany(): T extends readonly U[] ? U[] : T` — selector 없이 중첩 배열을 한 단계 평탄화하고 null/undefined 를 제거함.
- `mapMany(selector: (item, index) => R[]): R[]` — selector 결과 배열을 평탄화하고 null/undefined 를 제거함.
- `mapManyAsync(selector: (item, index) => Promise<R[]>): Promise<R[]>` — 비동기 selector 를 순차 실행 후 평탄화함.
- `parallelAsync(fn: (item, index) => Promise<R>): Promise<R[]>` — `Promise.all(this.map(fn))` 으로 **병렬** 실행함. 하나라도 reject 되면 전체가 즉시 reject 됨.
- `sum(selector?: (item, index) => number): number` — 숫자 합계. selector 없으면 요소 자체를 숫자로 사용. 숫자가 아니면 `ArgumentError`, 빈 배열은 0.
- `min(selector?)` / `max(selector?)` — 문자열·숫자 최소/최대. 빈 배열은 undefined, 문자열/숫자가 아니면 `ArgumentError`.
- `shuffle(): T[]` — Fisher-Yates 로 섞은 새 배열을 반환함.

## Array 그룹화·맵·트리

공통 인자: `keySelector: (item, index) => K`(그룹/Map key 생성), `valueSelector?: (item, index) => V`(있으면 원본 대신 변환값 저장).

- `groupBy(keySelector, valueSelector?): { key: K; values: (T | V)[] }[]` — key 별 그룹 배열. 원시 key 는 Map 인덱스로 O(n), 객체 key 는 `obj.equal` 깊은 비교라 O(n²).
- `toMap(keySelector, valueSelector?): Map<K, T | V>` — key 당 단일 값 Map. 중복 key 면 `ArgumentError`.
- `toMapAsync(keySelector, valueSelector?): Promise<Map<K, T | V>>` — key/value selector 가 Promise 또는 값을 반환 가능, 순차 처리. 중복 key 면 `ArgumentError`.
- `toArrayMap(keySelector, valueSelector?): Map<K, (T | V)[]>` — key 별 배열 Map.
- `toSetMap(keySelector, valueSelector?): Map<K, Set<T | V>>` — key 별 Set Map.
- `toMapValues(keySelector, valueSelector: (items: T[]) => V): Map<K, V>` — key 별 원본 배열을 모은 뒤 그룹 배열 전체를 집계값으로 변환함.
- `toObject(keySelector: (item, index) => string, valueSelector?): Record<string, T | V>` — 문자열 key 객체. 같은 key 에 null/undefined 가 아닌 값이 이미 있으면 `ArgumentError`.
- `toTree(keyProp: keyof T, parentKey: keyof T): TreeArray<T>[]` — `parentKey` 값이 null/undefined 인 항목을 루트로 삼음. 각 항목을 `obj.clone` 한 뒤 `children` 을 붙이며 내부적으로 `toArrayMap` 으로 O(n).

## Array 정렬·중복 제거

- `distinct(options?: boolean | { matchAddress?: boolean; keyFn?: (item) => string | number }): T[]` — 중복 제거 새 배열.
  - `options: boolean` — `true` 는 `{ matchAddress: true }` 와 같다.
  - `matchAddress?: boolean` — true 면 Set 기반 참조 비교(O(n)). false/미지정이면 원시값은 타입+값, 객체는 깊은 비교(O(n²)).
  - `keyFn?: (item) => string | number` — 있으면 반환 key 로 중복 판정(O(n)). 대량 객체 배열에 권장.
- `orderBy(selector?)` / `orderByDesc(selector?)` — 비교 가능 값 기준 정렬한 **새 배열**. 비교 타입은 `string | number | DateTime | DateOnly | Time | undefined`(날짜/시간은 tick 으로 비교). null/undefined 는 오름차순에서 앞, 내림차순에서 뒤. 비교 불가 타입 조합이면 `ArgumentError`.

## Array diff·merge

- `diffs(target: P[], options?): ArrayDiffsResult<T, P>[]` — this(source)와 target 을 비교해 삭제/추가/업데이트 후보를 반환함.
  - `options.keys?: string[]` — 지정 시 해당 key 값 배열을 JSON 문자열화해 같은 key 후보를 찾음(전체 일치 우선, 없으면 key 일치). target 중복 key 는 남은 첫 매칭만 사용.
  - `options.excludes?: string[]` — `obj.equal` 비교에서 제외할 최상위 속성.
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?): ArrayOneWayDiffResult<T>[]` — this 를 새 상태로 보고 원본과 비교해 생성/수정/동일을 판정함.
  - `orgItems: T[] | Map<T[K], T>` — 원본 목록 또는 원본 key Map.
  - `keyPropNameOrGetValFn: K | ((item) => string | number | undefined)` — key 속성명 또는 key 추출 함수. key 결과가 null/undefined 면 `create` 로 처리.
  - `options.includeSame?: boolean` — true 면 변경 없는 항목도 `{ type: "same" }` 으로 포함, false/미지정이면 생략(기본 false).
  - `options.excludes?: string[]` / `options.includes?: string[]` — `obj.equal` 비교에서 제외/포함할 최상위 속성.
- `merge(target: P[], options?): (T | P | (T & P))[]` — `diffs` 결과 중 양쪽에 있는 항목은 `obj.merge(source, target)` 로 병합하고, target 에만 있는 항목은 뒤에 추가함. `options.keys/excludes` 는 `diffs` 와 동일.

## Array 원본 변경 메서드 (@mutates)

- `distinctThis(options?): T[]` — `distinct` 규칙으로 원본에서 중복을 제거하고 원본을 반환함.
- `orderByThis(selector?)` / `orderByDescThis(selector?)` — 원본을 오름/내림차순으로 in-place 정렬함.
- `insert(index: number, ...items: T[]): this` — `index` 위치에 `items` 를 삽입함.
- `remove(item: T): this` — `===` 로 같은 항목을 모두 제거함(뒤에서 앞으로 순회).
- `remove(selector: (item, index) => boolean): this` — selector 가 true 인 항목을 모두 제거함.
- `toggle(item: T): this` — 있으면 제거, 없으면 push.
- `clear(): this` — 모든 항목 제거.

## Set 확장 (@mutates)

- `adds(...values: T[]): this` — 여러 값을 순서대로 `add` 하고 Set 자신을 반환함.
- `toggle(value: T, addOrDel?: "add" | "del"): this` — `"add"`=강제 추가, `"del"`=강제 삭제, 생략=있으면 삭제·없으면 추가. 조건부 토글을 간결히 표현할 때.

## Map 확장

- `getOrCreate(key: K, newValue: V): V` — key 가 없으면 `newValue` 를 저장하고 값을 반환함.
- `getOrCreate(key: K, newValueFn: () => V): V` — key 가 없으면 팩토리를 호출해 반환값을 저장함. **주의**: V 자체가 함수 타입이면 직접 전달 시 팩토리로 호출되므로, 함수 값을 저장하려면 함수를 반환하는 팩토리로 감쌈.
- `update(key: K, updateFn: (v: V | undefined) => V): void` (@mutates) — 현재 값(없으면 undefined)을 `updateFn` 에 넘기고 반환값을 set 함. key 가 없어도 호출되어 카운터 증가·배열 누적 등에 씀.

## 결과 타입

- `ArrayDiffsResult<TOriginal, TOther>` — `{ source: undefined; target }`(target 에만 있음=INSERT) | `{ source; target: undefined }`(source 에만 있음=DELETE) | `{ source; target }`(key 는 같으나 내용 다름=UPDATE).
- `ArrayOneWayDiffResult<TItem>` — `{ type: "create"; item; orgItem: undefined }` | `{ type: "update"; item; orgItem }` | `{ type: "same"; item; orgItem }`.
- `TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] }` — `toTree` 결과 노드 타입.
- `ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined` — 정렬/비교 헬퍼 입력 타입.
