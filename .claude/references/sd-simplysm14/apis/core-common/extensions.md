# @simplysm/core-common — extensions

`index.ts` 가 import 되면 자동으로 `Array.prototype`, `Set.prototype`, `Map.prototype` 에 메서드를 정의 (`enumerable: false`).

## Array (Readonly — 새 배열/값 반환)

### 조회

```typescript
arr.single(pred?)              // 0 or 1개. 2개 이상이면 ArgumentError. 없으면 undefined.
arr.first(pred?)               // pred 면 find, 없으면 [0]
arr.last(pred?)                // pred 면 역방향 find, 없으면 [length-1]
arr.filterExists()             // null/undefined 제거 → NonNullable<T>[]
arr.ofType("string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes")
arr.ofType(SomeClass)          // instanceof 또는 constructor 일치
```

### 비동기

```typescript
await arr.filterAsync(asyncPred)        // 순차
await arr.mapAsync(asyncSelector)       // 순차
await arr.mapManyAsync(asyncSelector)   // 순차 + 평탄화
await arr.parallelAsync(fn)             // Promise.all (하나 reject 시 전체 reject)
```

### 매핑·평탄화

```typescript
arr.mapMany()                  // 중첩 배열 1단계 flatten + filterExists
arr.mapMany(selector)          // 매핑 후 flatten
```

### 변환

```typescript
arr.groupBy(keyFn)                              // [{ key, values }, ...] (객체 key 시 O(n²), 원시 key 는 O(n))
arr.groupBy(keyFn, valueFn)
arr.toMap(keyFn) / toMap(keyFn, valFn)          // 중복 key 시 ArgumentError
await arr.toMapAsync(...)
arr.toArrayMap(keyFn[, valFn])                  // Map<K, V[]>  (원시 key 권장 — O(n))
arr.toSetMap(keyFn[, valFn])                    // Map<K, Set<V>>
arr.toMapValues(keyFn, (items) => aggregated)
arr.toObject(strKeyFn[, valFn])                 // 중복 key 시 ArgumentError
arr.toTree("id", "parentId")                    // 평면 → 트리 ({...item, children: []}), O(n).
                                                //   parentKey 가 null/undefined 면 루트.
```

### 중복·정렬

```typescript
arr.distinct()                                  // 깊은 equal 비교 (객체 array 는 O(n²))
arr.distinct(true)                              // matchAddress: 참조 비교 (Set 기반, O(n))
arr.distinct({ matchAddress?, keyFn? })         // keyFn 권장 — O(n)
arr.orderBy(selector?)                          // 오름차순. string/number/DateTime/DateOnly/Time/undefined 지원
arr.orderByDesc(selector?)
arr.shuffle()                                   // Fisher-Yates
```

### 비교·병합

```typescript
arr.diffs(target)                               // INSERT/DELETE/UPDATE 결과
arr.diffs(target, { keys: ["id"], excludes? })  // key 기반 매칭 (Map 인덱싱 O(n+m))
arr.diffs(target, { excludes: [...] })
   // 결과 타입:
   //   { source: undefined, target: T }  // INSERT
   //   { source: T, target: undefined }  // DELETE
   //   { source: T, target: T }          // UPDATE

arr.oneWayDiffs(orgItems | Map, keyPropOrFn, {
  includeSame?, excludes?, includes?,
})
   // 결과: { type: "create"|"update"|"same", item, orgItem }

arr.merge(target[, { keys?, excludes? }])       // diffs 후 source 기반에 target 병합·신규 push
```

### 집계

```typescript
arr.sum(selector?)             // 숫자 아니면 ArgumentError. 빈 배열 → 0.
arr.min(selector?) / max(selector?)   // string|number. 빈 배열 → undefined
```

### TreeArray 타입

```typescript
type TreeArray<T> = T & { children: TreeArray<T>[] };
```

## Array (Mutable — 원본 변경, `@mutates`)

```typescript
arr.distinctThis(options?)             // 원본에서 중복 제거 (역순 splice, O(n))
arr.orderByThis(selector?) / orderByDescThis(selector?)
arr.insert(index, ...items)
arr.remove(itemOrSelector)             // 일치 항목 모두 제거. 역순 순회.
arr.toggle(item)                       // 있으면 remove, 없으면 push
arr.clear()
```

모두 `this` 반환 (체이닝 가능, `clear/distinctThis/orderBy*This` 는 변경된 자기 자신).

## Set

```typescript
set.adds(...values)                            // 다중 add, this 반환
set.toggle(value)                              // 자동 토글
set.toggle(value, "add" | "del")               // 강제 추가/제거
```

## Map

```typescript
map.getOrCreate(key, defaultValue)             // 없으면 set 후 반환
map.getOrCreate(key, () => expensiveCompute()) // 팩토리 (값이 함수이면 항상 호출됨 — 함수 값을 저장하려면 `() => fn` 으로 한 번 더 감쌀 것)
map.update(key, (v|undefined) => newV)         // 없는 key 도 호출됨 (카운터·배열 push 패턴)
```

## ComparableType

`orderBy*` 의 selector 반환 타입: `string | number | boolean | DateTime | DateOnly | Time | undefined`.
