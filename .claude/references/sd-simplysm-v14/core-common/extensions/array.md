# Array Extensions

`@simplysm/core-common`을 import하면 `Array.prototype`에 확장 메서드가 자동 등록된다. `ReadonlyArray<T>`와 `Array<T>` 모두에 적용된다.

side-effect import로 활성화:

```typescript
import "@simplysm/core-common";
```

## 불변(Immutable) 메서드

원본 배열을 변경하지 않고 새 배열 또는 값을 반환한다.

| Method | Signature | Description |
|--------|-----------|-------------|
| `single` | `(predicate?) => T \| undefined` | 조건에 맞는 단일 요소 반환. 2개 이상이면 `ArgumentError` 발생 |
| `first` | `(predicate?) => T \| undefined` | 첫 번째 요소 반환 |
| `last` | `(predicate?) => T \| undefined` | 마지막 요소 반환 |
| `filterExists` | `() => NonNullable<T>[]` | null/undefined 제거 |
| `ofType` | `(type: PrimitiveTypeStr \| Type<N>) => N[]` | 특정 타입의 요소만 필터 |
| `filterAsync` | `(predicate) => Promise<T[]>` | 비동기 필터 (순차 실행) |
| `mapAsync` | `(selector) => Promise<R[]>` | 비동기 매핑 (순차 실행) |
| `mapMany` | `(selector?) => R[]` | 매핑 후 평탄화 (또는 중첩 배열 평탄화) |
| `mapManyAsync` | `(selector?) => Promise<R[]>` | 비동기 매핑 후 평탄화 (순차 실행) |
| `parallelAsync` | `(fn) => Promise<R[]>` | 비동기 병렬 처리 (`Promise.all` 사용). 하나라도 reject되면 전체 reject |
| `groupBy` | `(keySelector, valueSelector?) => { key, values }[]` | key 기준 그룹화. 객체 key 지원을 위해 O(n²) 복잡도. 원시 key는 O(n) |
| `toMap` | `(keySelector, valueSelector?) => Map<K, V>` | Map으로 변환. 중복 key이면 `ArgumentError` 발생 |
| `toMapAsync` | `(keySelector, valueSelector?) => Promise<Map<K, V>>` | 비동기 Map 변환 |
| `toArrayMap` | `(keySelector, valueSelector?) => Map<K, V[]>` | 배열 값 Map으로 변환 (O(n)) |
| `toSetMap` | `(keySelector, valueSelector?) => Map<K, Set<V>>` | Set 값 Map으로 변환 |
| `toMapValues` | `(keySelector, valueSelector) => Map<K, V>` | 그룹별 집계 Map으로 변환 |
| `toObject` | `(keySelector, valueSelector?) => Record<string, V>` | 객체로 변환. 중복 key이면 `ArgumentError` 발생 |
| `toTree` | `(keyProp, parentKey) => TreeArray<T>[]` | 평면 배열을 트리 구조로 변환 (O(n)). `parentKey`가 null/undefined인 항목이 루트 |
| `distinct` | `(options?) => T[]` | 중복 제거. 객체 배열에서 keyFn 없이 사용하면 O(n²) |
| `orderBy` | `(selector?) => T[]` | 오름차순 정렬 (새 배열 반환) |
| `orderByDesc` | `(selector?) => T[]` | 내림차순 정렬 (새 배열 반환) |
| `diffs` | `(target, options?) => ArrayDiffsResult<T, P>[]` | 두 배열 비교 (INSERT/DELETE/UPDATE) |
| `oneWayDiffs` | `(orgItems, keyPropNameOrGetValFn, options?) => ArrayOneWayDiffResult<T>[]` | 단방향 비교 (create/update/same) |
| `merge` | `(target, options?) => (T \| P \| T & P)[]` | 두 배열 병합 (`diffs` 기반) |
| `sum` | `(selector?) => number` | 합계. 빈 배열이면 0 반환 |
| `min` | `(selector?) => T \| undefined` | 최솟값 |
| `max` | `(selector?) => T \| undefined` | 최댓값 |
| `shuffle` | `() => T[]` | 무작위 순서로 섞은 새 배열 반환 |

## 가변(Mutable) 메서드

원본 배열을 직접 수정하고 `this`를 반환한다.

| Method | Signature | Description |
|--------|-----------|-------------|
| `remove` | `(item: T) => this` | 항목 제거 |
| `remove` | `(selector: (item, index) => boolean) => this` | 조건에 맞는 항목 제거 |
| `insert` | `(index: number, ...items: T[]) => this` | 특정 위치에 항목 삽입 |
| `toggle` | `(item: T) => this` | 항목 토글 (있으면 제거, 없으면 추가) |
| `clear` | `() => this` | 배열 비우기 |
| `distinctThis` | `(options?) => T[]` | 원본 배열에서 중복 제거 |
| `orderByThis` | `(selector?) => T[]` | 원본 배열 오름차순 정렬 |
| `orderByDescThis` | `(selector?) => T[]` | 원본 배열 내림차순 정렬 |

## Related Types

### `ArrayDiffsResult<TOriginal, TOther>`

`diffs()` 결과 타입. Discriminated union:

```typescript
export type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther }         // INSERT (target에만 있음)
  | { source: TOriginal; target: undefined }       // DELETE (source에만 있음)
  | { source: TOriginal; target: TOther };         // UPDATE (양쪽에 있고 다름)
```

### `ArrayOneWayDiffResult<TItem>`

`oneWayDiffs()` 결과 타입. Discriminated union (`type` 필드로 분기):

```typescript
export type ArrayOneWayDiffResult<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same";   item: TItem; orgItem: TItem };
```

### `TreeArray<TNode>`

`toTree()` 결과 타입. 원본 타입에 `children` 속성이 추가된다:

```typescript
export type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };
```

### `ComparableType`

`orderBy`/`orderByDesc` selector의 반환 타입:

```typescript
export type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;
```

## Usage

```typescript
import "@simplysm/core-common";

const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];

// 불변 메서드
const alice = users.single((u) => u.id === 1);
const sorted = users.orderBy((u) => u.name);
const grouped = users.groupBy((u) => u.name[0]);
const diffs = newUsers.diffs(oldUsers, { keys: ["id"] });

// toTree
const items = [
  { id: 1, parentId: undefined, name: "root" },
  { id: 2, parentId: 1, name: "child" },
];
const tree = items.toTree("id", "parentId");

// 가변 메서드
const list = [1, 2, 3, 4, 5];
list.remove((x) => x % 2 === 0); // [1, 3, 5]
list.insert(1, 10); // [1, 10, 3, 5]
```
