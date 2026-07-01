# @simplysm/core-common — collection-ext

`@simplysm/core-common` 진입점을 import 하면 설치되는 Array/ReadonlyArray/Set/Map 프로토타입 확장과 관련 결과 타입. 컬렉션 조회·그룹화·정렬·diff/merge·트리 변환을 한 작업에서 확인할 때 본다.

## 설치와 타입

- `import "@simplysm/core-common"` 또는 임의 심볼 import — `index.ts` 가 `arr-ext`, `set-ext`, `map-ext` 를 먼저 import 하므로 프로토타입 메서드가 전역 설치된다.
- `ReadonlyArray<T> extends ReadonlyArrayExt<T>` — 원본을 바꾸지 않는 배열 확장 메서드를 제공한다.
- `Array<T> extends ReadonlyArrayExt<T>, MutableArrayExt<T>` — 읽기 확장과 원본 변경 확장을 함께 제공한다.
- `@mutates` 메서드 — `distinctThis`, `orderByThis`, `orderByDescThis`, `insert`, `remove`, `toggle`, `clear`, `Set.adds`, `Set.toggle`, `Map.update` 는 원본을 바꾼다.

## Array 조회·비동기·집계

- `single(predicate?: (item, index) => boolean): T | undefined` — 조건에 맞는 단일 요소를 반환한다. 결과가 2개 이상이면 `ArgumentError`, 없으면 undefined 다.
- `first(predicate?: (item, index) => boolean): T | undefined` — predicate 가 있으면 `find`, 없으면 첫 요소를 반환한다.
- `last(predicate?: (item, index) => boolean): T | undefined` — predicate 가 있으면 뒤에서 앞으로 탐색하고, 없으면 마지막 요소를 반환한다.
- `filterExists(): NonNullable<T>[]` — null/undefined 를 제거하고 타입을 `NonNullable` 로 좁힌다.
- `ofType(type: PrimitiveTypeStr | Type<N>)` — 지정 타입 요소만 반환한다. `PrimitiveTypeStr` 리터럴은 `"string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes"` 이며, `"Bytes"` 는 Uint8Array 다. 생성자 타입은 `instanceof` 또는 `constructor` 일치로 판정한다.
- `filterAsync(predicate: (item, index) => Promise<boolean>): Promise<T[]>` — predicate 를 순차 실행해 true 요소만 모은다.
- `mapAsync(selector: (item, index) => Promise<R>): Promise<R[]>` — selector 를 순차 실행해 결과 배열을 만든다.
- `mapMany(): T extends readonly U[] ? U[] : T` — 중첩 배열을 한 단계 평탄화하고 null/undefined 를 제거한다.
- `mapMany(selector: (item, index) => R[]): R[]` — selector 결과 배열을 평탄화하고 null/undefined 를 제거한다.
- `mapManyAsync(selector: (item, index) => Promise<R[]>): Promise<R[]>` — 비동기 selector 를 순차 실행한 뒤 평탄화한다.
- `parallelAsync(fn: (item, index) => Promise<R>): Promise<R[]>` — `Promise.all(this.map(fn))` 으로 병렬 실행한다. 하나라도 reject 되면 전체 Promise 가 reject 된다.
- `sum(selector?: (item, index) => number): number` — 숫자 합계를 반환한다. selector 가 없으면 요소 자체를 숫자로 사용하고, 숫자가 아니면 `ArgumentError`. 빈 배열은 0 이다.
- `min(selector?)` / `max(selector?)` — 문자열·숫자 최소/최대를 반환한다. 빈 배열은 undefined, 문자열/숫자가 아니면 `ArgumentError`.
- `shuffle(): T[]` — Fisher-Yates 방식으로 섞은 새 배열을 반환한다.

## Array 그룹화·맵·트리

- `groupBy(keySelector, valueSelector?): { key: K; values: (T | V)[] }[]` — key 별 그룹 배열을 만든다. 원시 key 는 Map 인덱스로 O(n), 객체 key 는 `obj.equal` 깊은 비교로 찾는다.
- `keySelector: (item, index) => K` — 그룹 또는 Map key 를 만든다.
- `valueSelector?: (item, index) => V` — 있으면 원본 대신 변환값을 values/Map 값으로 저장한다.
- `toMap(keySelector, valueSelector?): Map<K, T | V>` — key 당 하나의 값 Map 을 만든다. 이미 같은 key 가 있으면 `ArgumentError`.
- `toMapAsync(keySelector, valueSelector?): Promise<Map<K, T | V>>` — key/value selector 가 Promise 또는 값을 반환할 수 있으며 순차 처리한다. 중복 key 는 `ArgumentError`.
- `toArrayMap(keySelector, valueSelector?): Map<K, (T | V)[]>` — key 별 배열 Map 을 만든다.
- `toSetMap(keySelector, valueSelector?): Map<K, Set<T | V>>` — key 별 Set Map 을 만든다.
- `toMapValues(keySelector, valueSelector: (items: T[]) => V): Map<K, V>` — 먼저 key 별 원본 배열을 만들고 그룹 배열을 집계값으로 바꾼다.
- `toObject(keySelector: (item, index) => string, valueSelector?): Record<string, T | V>` — 문자열 key 객체를 만든다. 같은 key 에 null/undefined 가 아닌 값이 이미 있으면 `ArgumentError`.
- `toTree(keyProp: keyof T, parentKey: keyof T): TreeArray<T>[]` — `parentKey` 값이 null/undefined 인 항목을 루트로 삼고, 각 항목을 `obj.clone` 한 뒤 `children` 을 붙인다.

## Array 정렬·중복 제거

- `distinct(options?: boolean | { matchAddress?: boolean; keyFn?: (item) => string | number }): T[]` — 중복 제거 새 배열을 만든다.
- `options: boolean` — true 면 `{ matchAddress: true }` 와 같다.
- `matchAddress?: boolean` — true 면 Set 기반 참조 비교로 중복을 판단한다. false/미지정이면 원시값은 타입+값, 객체는 깊은 비교로 판단한다.
- `keyFn?: (item) => string | number` — 있으면 반환 key 로 중복을 판단한다.
- `orderBy(selector?)` / `orderByDesc(selector?)` — 비교 가능한 값을 기준으로 새 배열을 정렬한다. 비교 가능 타입은 `string | number | DateTime | DateOnly | Time | undefined`; 날짜/시간 값 타입은 tick 으로 비교한다. null/undefined 는 오름차순에서 앞, 내림차순에서 뒤다. 비교 불가 타입 조합이면 `ArgumentError`.
- `ComparableType` — 정렬 비교 입력 타입이다. `string | number | boolean | DateTime | DateOnly | Time | undefined`.

## Array diff·merge

- `diffs(target, options?): ArrayDiffsResult<T, P>[]` — source 배열(this)과 target 배열을 비교해 삭제/추가/업데이트 후보를 반환한다.
- `target: P[]` — 비교 대상 배열이다.
- `options.keys?: string[]` — 지정하면 해당 key 값 배열을 JSON 문자열화해 같은 key 후보를 찾는다.
- `options.excludes?: string[]` — `obj.equal` 비교에서 제외할 최상위 속성이다.
- `ArrayDiffsResult<TOriginal, TOther>` — `{ source: undefined; target }` 는 target 에만 있는 항목, `{ source; target: undefined }` 는 source 에만 있는 항목, `{ source; target }` 는 key 는 같지만 전체가 다른 항목이다.
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?): ArrayOneWayDiffResult<T>[]` — 현재 배열을 새 상태로 보고 원본 orgItems 와 비교해 생성/수정/동일 여부를 반환한다.
- `orgItems: T[] | Map<T[K], T>` — 원본 목록 또는 원본 key Map 이다.
- `keyPropNameOrGetValFn: K | ((item) => string | number | undefined)` — 항목 key 속성명 또는 key 추출 함수다. 결과가 null/undefined 면 create 로 처리한다.
- `options.includeSame?: boolean` — true 면 변경 없는 항목도 `{ type: "same" }` 으로 포함한다. false/미지정이면 생략한다.
- `options.excludes?: string[]` — `obj.equal` 비교에서 제외할 최상위 속성이다.
- `options.includes?: string[]` — `obj.equal` 비교에서 포함할 최상위 속성이다.
- `ArrayOneWayDiffResult<T>` — `"create"` 는 원본 없음, `"update"` 는 원본과 다름, `"same"` 은 원본과 같음을 뜻한다.
- `merge(target, options?): (T | P | (T & P))[]` — `diffs` 결과 중 양쪽에 있는 항목은 `obj.merge(source, target)` 로 병합하고, target 에만 있는 항목은 뒤에 추가한다.
- `merge options.keys/excludes` — `diffs` 의 같은 이름 옵션과 동일하게 비교 key 와 제외 속성을 지정한다.

## Array 원본 변경 메서드

- `distinctThis(options?): T[]` — `distinct` 와 같은 규칙으로 원본에서 중복 항목을 제거하고 원본 배열을 반환한다.
- `orderByThis(selector?)` / `orderByDescThis(selector?)` — 원본 배열을 오름/내림차순으로 정렬한다.
- `insert(index: number, ...items: T[]): this` — `index` 위치에 `items` 를 삽입한다.
- `remove(item: T): this` — `===` 로 같은 항목을 모두 제거한다.
- `remove(selector: (item, index) => boolean): this` — selector 가 true 인 항목을 모두 제거한다. 뒤에서 앞으로 순회해 index 변동을 피한다.
- `toggle(item: T): this` — 이미 있으면 제거하고 없으면 push 한다.
- `clear(): this` — 모든 항목을 제거한다.

## Set 확장

- `adds(...values: T[]): this` — 여러 값을 순서대로 `add` 하고 Set 자신을 반환한다.
- `toggle(value: T, addOrDel?: "add" | "del"): this` — `"add"` 는 강제 추가, `"del"` 은 강제 삭제, 생략은 존재하면 삭제·없으면 추가다.

## Map 확장

- `getOrCreate(key: K, newValue: V): V` — key 가 없으면 `newValue` 를 저장하고 값을 반환한다.
- `getOrCreate(key: K, newValueFn: () => V): V` — key 가 없으면 함수를 호출해 반환값을 저장한다. V 자체가 함수 타입이면 직접 전달 시 팩토리로 호출되므로 함수 값을 저장하려면 함수 반환 함수로 감싼다.
- `update(key: K, updateFn: (v: V | undefined) => V): void` — 현재 값 또는 undefined 를 `updateFn` 에 넘기고 반환값을 set 한다. key 가 없어도 호출된다.

## 타입

- `TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] }` — `toTree` 결과 노드 타입이다.
- `ArrayDiffsResult<TOriginal, TOther>` — `diffs` 결과 union 타입이다.
- `ArrayOneWayDiffResult<TItem>` — `oneWayDiffs` 결과 union 타입이다.
- `ComparableType` — 정렬 비교 헬퍼에서 받는 값 타입이다.
