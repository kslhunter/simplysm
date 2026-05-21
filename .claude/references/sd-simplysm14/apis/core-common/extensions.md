# @simplysm/core-common — extensions

`@simplysm/core-common` import 시 자동 적용. 글로벌 `Array`/`ReadonlyArray`/`Map`/`Set` 인터페이스에 ambient declare.

## ReadonlyArray<T> (비파괴)

```ts
single(predicate?): T | undefined            // 0~1개만 통과. 2개+ → ArgumentError
first(predicate?): T | undefined             // 첫 요소 (predicate 시 find와 동일)
last(predicate?): T | undefined              // 마지막 요소
filterAsync(predicate: async): Promise<T[]>  // 비동기 필터 (순차)
filterExists(): NonNullable<T>[]             // null/undefined 제거 + 타입 좁힘
ofType(type: PrimitiveTypeStr | Type<N>): N[]   // 원시 타입명 또는 생성자로 필터
mapAsync(selector: async): Promise<R[]>      // 비동기 매핑 (순차)
mapMany(selector?): R[]                      // flat + filterExists
mapManyAsync(selector?: async): Promise<R[]>
parallelAsync(fn: async): Promise<R[]>       // Promise.all (하나 reject 시 전체 reject)

groupBy(keySelector, valueSelector?): { key, values }[]
  // 원시 key: O(n) Map 최적화. 객체 key: equal() 비교로 O(n²)
toMap(keySelector, valueSelector?): Map<K, V>          // 중복 key → ArgumentError
toMapAsync(keySelector: async, valueSelector?: async): Promise<Map>
toArrayMap(keySelector, valueSelector?): Map<K, V[]>   // 중복 허용, array로 누적 (O(n))
toSetMap(keySelector, valueSelector?): Map<K, Set<V>>
toMapValues(keySelector, valueSelector(items)): Map<K, V>   // value는 그룹 전체로 계산
toObject(keySelector: → string, valueSelector?): Record<string, V>
toTree(keyProp, parentKey): TreeArray<T>[]   // 평면 → 트리 (parentKey null이면 root)

distinct(options?: bool | { matchAddress?, keyFn? }): T[]
  // matchAddress=true: Set 참조 비교. keyFn: 커스텀 키 O(n). 둘 다 없이 객체: O(n²) equal
orderBy(selector?): T[]                      // 오름차순 (불변, 새 array)
orderByDesc(selector?): T[]

diffs(target, options?: { keys?, excludes? }): ArrayDiffsResult<T, P>[]
  // 전체 일치 우선, 없으면 keys 일치(update 후보). 결과: INSERT|DELETE|UPDATE
oneWayDiffs(orgItems: T[] | Map<TKey, T>, keyPropNameOrGetValFn, options?):
  ArrayOneWayDiffResult<T>[]                 // type: 'create'|'update'|'same'
merge(target, options?): (T | P | T&P)[]     // diffs 후 update는 obj.merge, insert는 append

sum(selector?): number                       // 숫자 아니면 ArgumentError
min(selector?): number | string | undefined  // 숫자/문자열만
max(selector?): number | string | undefined
shuffle(): T[]                               // Fisher-Yates, 새 array
```

## Array<T> (파괴, @mutates)

```ts
distinctThis(options?)                       // distinct를 in-place로
orderByThis(selector?)                       // Array.prototype.sort 위임 (in-place)
orderByDescThis(selector?)
insert(index, ...items)                      // splice 삽입, this 반환
remove(item | selector)                      // 역순 순회 splice 제거
toggle(item)                                 // 있으면 remove, 없으면 push
clear()                                      // 전체 비우기
```

## 익스포트 타입

```ts
type ArrayDiffsResult<TOrig, TOther> =
  | { source: undefined; target: TOther }     // INSERT
  | { source: TOrig; target: undefined }      // DELETE
  | { source: TOrig; target: TOther }         // UPDATE
type ArrayOneWayDiffResult<T> =
  | { type: 'create'; item: T; orgItem: undefined }
  | { type: 'update'; item: T; orgItem: T }
  | { type: 'same'; item: T; orgItem: T }
type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] }
type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined
```

## Map<K, V>

```ts
getOrCreate(key, newValue: V): V
getOrCreate(key, newValueFn: () => V): V     // 함수면 팩토리로 호출하여 lazy 생성
update(key, updateFn: (v: V | undefined) => V): void   // key 없어도 fn 호출
```
- **주의**: `Map<K, () => void>` 같이 V가 함수 타입이면 두 번째 인자가 팩토리로 인식됨. 함수 값을 저장하려면 `getOrCreate(k, () => myFn)`.

## Set<T>

```ts
adds(...values: T[]): this                   // 다중 add
toggle(value, addOrDel?: "add" | "del"): this
  // 인자 없으면 자동 토글, "add"=강제 추가, "del"=강제 삭제
```
