# Extensions (Prototype)

`@simplysm/core-common`을 import하면 `Array`, `Map`, `Set` 프로토타입 확장이 자동 등록된다.

```typescript
import "@simplysm/core-common"; // side-effect import — 확장 등록
```

## Array Extensions (Immutable)

새 배열을 반환하며 원본 배열을 변경하지 않는다.

| Method | Signature | Description |
|--------|-----------|-------------|
| `single` | `(predicate?) => T \| undefined` | 조건에 맞는 단일 요소 반환. 2개 이상이면 `ArgumentError` 발생 |
| `first` | `(predicate?) => T \| undefined` | 첫 번째 요소 반환 |
| `last` | `(predicate?) => T \| undefined` | 마지막 요소 반환 |
| `filterExists` | `() => NonNullable<T>[]` | null/undefined 제거 |
| `ofType` | `(type) => TNarrow[]` | 특정 타입의 요소만 필터 (`PrimitiveTypeStr` 또는 생성자) |
| `mapAsync` | `(selector) => Promise<TResult[]>` | 비동기 매핑 (순차 실행) |
| `filterAsync` | `(predicate) => Promise<T[]>` | 비동기 필터 (순차 실행) |
| `mapMany` | `(selector?) => TResult[]` | 매핑 후 평탄화 (또는 중첩 배열 평탄화) |
| `mapManyAsync` | `(selector?) => Promise<TResult[]>` | 비동기 매핑 후 평탄화 (순차 실행) |
| `parallelAsync` | `(fn) => Promise<TResult[]>` | 비동기 병렬 처리 (`Promise.all` 사용) |
| `groupBy` | `(keySelector, valueSelector?) => { key, values }[]` | key 기준 그룹화. 객체 key는 O(n²), 원시 key는 O(n) |
| `toMap` | `(keySelector, valueSelector?) => Map<TKey, TValue>` | Map으로 변환. 중복 key이면 `ArgumentError` 발생 |
| `toMapAsync` | `(keySelector, valueSelector?) => Promise<Map<TKey, TValue>>` | 비동기 Map으로 변환 |
| `toArrayMap` | `(keySelector, valueSelector?) => Map<TKey, TValue[]>` | 그룹 Map으로 변환. O(n) 성능 |
| `toSetMap` | `(keySelector, valueSelector?) => Map<TKey, Set<TValue>>` | 그룹 Set Map으로 변환 |
| `toMapValues` | `(keySelector, valueSelector) => Map<TKey, TValue>` | 그룹화 후 그룹별로 값 변환 |
| `toObject` | `(keySelector, valueSelector?) => Record<string, TValue>` | 일반 객체로 변환. 중복 key이면 `ArgumentError` 발생 |
| `toTree` | `(keyProp, parentKey) => TreeArray<T>[]` | 평면 배열을 트리 구조로 변환. O(n) 복잡도 |
| `distinct` | `(options?) => T[]` | 중복 제거. 객체 배열에서 `keyFn` 없이 사용하면 O(n²) |
| `orderBy` | `(selector?) => T[]` | 오름차순 정렬 |
| `orderByDesc` | `(selector?) => T[]` | 내림차순 정렬 |
| `diffs` | `(target, options?) => ArrayDiffsResult<T, P>[]` | 두 배열 비교 (INSERT/DELETE/UPDATE) |
| `oneWayDiffs` | `(orgItems, keyPropNameOrGetValFn, options?) => ArrayOneWayDiffResult<T>[]` | 단방향 차이 계산 (create/update/same) |
| `merge` | `(target, options?) => (T \| P \| T&P)[]` | 두 배열 병합 |
| `sum` | `(selector?) => number` | 합계. 빈 배열이면 0 |
| `min` | `(selector?) => T \| undefined` | 최솟값 |
| `max` | `(selector?) => T \| undefined` | 최댓값 |
| `shuffle` | `() => T[]` | 무작위 섞기 |

### `toTree` 상세

```typescript
interface Item {
  id: number;
  parentId?: number;
  name: string;
}

const items: Item[] = [
  { id: 1, name: "root" },
  { id: 2, parentId: 1, name: "child1" },
  { id: 3, parentId: 2, name: "grandchild" },
];

const tree = items.toTree("id", "parentId");
// [{ id: 1, name: "root", children: [
//   { id: 2, name: "child1", children: [
//     { id: 3, name: "grandchild", children: [] }
//   ]}
// ]}]
```

### `diffs` 상세

```typescript
const diffs = newItems.diffs(oldItems, { keys: ["id"], excludes: ["updatedAt"] });
// ArrayDiffsResult: { source: undefined, target: item } (INSERT)
//                  { source: item, target: undefined } (DELETE)
//                  { source: item, target: item }       (UPDATE)
```

### `oneWayDiffs` 상세

```typescript
const diffs = newItems.oneWayDiffs(orgItems, "id", { includeSame: false });
// ArrayOneWayDiffResult: { type: "create", item, orgItem: undefined }
//                        { type: "update", item, orgItem }
//                        { type: "same", item, orgItem }
```

## Array Extensions (Mutable)

원본 배열을 직접 변경한다.

| Method | Signature | Description |
|--------|-----------|-------------|
| `insert` | `(index, ...items) => this` | 지정 위치에 항목 삽입 |
| `remove` | `(item \| selector) => this` | 항목 또는 조건에 맞는 항목 제거 |
| `toggle` | `(item) => this` | 항목 토글 (있으면 제거, 없으면 추가) |
| `clear` | `() => this` | 배열 비우기 |
| `distinctThis` | `(options?) => T[]` | 원본 배열에서 중복 제거 |
| `orderByThis` | `(selector?) => T[]` | 원본 배열을 오름차순 정렬 |
| `orderByDescThis` | `(selector?) => T[]` | 원본 배열을 내림차순 정렬 |

## Map Extensions

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrCreate` | `(key, newValue \| newValueFn) => V` | key가 없으면 새 값을 설정하고 반환. V 타입이 함수이면 팩토리로 감싸야 함 |
| `update` | `(key, updateFn) => void` | 기존 값을 기반으로 업데이트. key가 없어도 `updateFn`이 호출됨 |

```typescript
const map = new Map<string, number[]>();
const arr = map.getOrCreate("key", []); // 없으면 [] 설정 후 반환

const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1); // 카운터 증가
```

## Set Extensions

| Method | Signature | Description |
|--------|-----------|-------------|
| `adds` | `(...values: T[]) => this` | 여러 값을 한 번에 추가 |
| `toggle` | `(value, addOrDel?) => this` | 값 토글. `addOrDel`로 강제 추가/제거 가능 |

```typescript
const set = new Set<number>([1, 2, 3]);
set.adds(4, 5, 6); // 여러 항목 추가
set.toggle(2); // 2가 있으므로 제거 → {1, 3, 4, 5, 6}
set.toggle(99, "add"); // 강제 추가
set.toggle(99, "del"); // 강제 제거
```

## Exported Types

### `ArrayDiffsResult<TOriginal, TOther>`

`diffs()` 메서드의 반환 타입. discriminated union으로 `source`와 `target` 중 하나가 `undefined`이면 INSERT/DELETE, 둘 다 있으면 UPDATE.

```typescript
export type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther }    // INSERT
  | { source: TOriginal; target: undefined } // DELETE
  | { source: TOriginal; target: TOther };   // UPDATE
```

### `ArrayOneWayDiffResult<TItem>`

`oneWayDiffs()` 메서드의 반환 타입. `type` 필드로 분기.

```typescript
export type ArrayOneWayDiffResult<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same";   item: TItem; orgItem: TItem };
```

### `TreeArray<TNode>`

`toTree()` 메서드의 반환 타입. 원본 타입에 `children` 속성이 추가된다.

```typescript
export type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };
```

### `ComparableType`

`orderBy`, `orderByDesc`, `orderByThis`, `orderByDescThis`의 selector 반환 타입.

```typescript
export type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;
```
