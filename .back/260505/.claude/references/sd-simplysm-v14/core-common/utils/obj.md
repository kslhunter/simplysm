# `obj`

> **읽어야 하는 상황**: 객체 깊은 복사/비교/병합, 3-way 병합, key 조작(omit/pick), 체인 경로 접근이 필요할 때.

객체 유틸리티 네임스페이스. 깊은 복사, 비교, 병합, key 조작 등을 제공한다.

```typescript
import { obj } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `clone` | `<T>(source: T) => T` | 깊은 복사. 순환 참조, 커스텀 타입(`DateTime`, `DateOnly`, `Time`, `Uuid`, `Uint8Array`) 지원 |
| `equal` | `(source, target, options?) => boolean` | 깊은 동등성 비교 |
| `merge` | `<S, T>(source: S, target: T, opt?) => S & T` | 깊은 병합. source를 기반으로 target을 병합하여 새 객체 반환 |
| `merge3` | `(source, origin, target, optionsObj?) => { conflict, result }` | 3-way 병합 |
| `omit` | `<T, K>(item: T, omitKeys: K[]) => Omit<T, K>` | 특정 key 제외 |
| `omitByFilter` | `<T>(item: T, omitKeyFn) => T` | 조건에 맞는 key 제외 |
| `pick` | `<T, K>(item: T, pickKeys: K[]) => Pick<T, K>` | 특정 key만 선택 |
| `getChainValue` | `(obj, chain, optional?) => unknown` | 체인 경로로 값 조회 (예: `"a.b[0].c"`) |
| `getChainValueByDepth` | `(obj, key, depth, optional?) => TObject[TKey]` | 같은 key로 지정된 깊이만큼 하강 |
| `setChainValue` | `(obj, chain, value) => void` | 체인 경로로 값 설정 |
| `deleteChainValue` | `(obj, chain) => void` | 체인 경로로 값 삭제 |
| `clearUndefined` | `<T>(obj: T) => T` | 객체에서 undefined/null 값을 가진 key 삭제 (원본 수정) |
| `clear` | `<T>(obj: T) => Record<string, never>` | 객체의 모든 key 삭제 (원본 수정) |
| `nullToUndefined` | `<T>(obj: T) => T \| undefined` | null을 undefined로 변환 (재귀, 원본 수정) |
| `unflatten` | `(flatObj) => Record<string, unknown>` | 평탄화된 객체를 중첩 객체로 변환 (`"a.b.c": 1` → `{ a: { b: { c: 1 } } }`) |
| `keys` | `<T>(obj: T) => (keyof T)[]` | 타입 안전한 `Object.keys` |
| `entries` | `<T>(obj: T) => Entries<T>` | 타입 안전한 `Object.entries` |
| `fromEntries` | `<T>(entryPairs: T[]) => { [K in T[0]]: T[1] }` | 타입 안전한 `Object.fromEntries` |
| `map` | `(obj, fn) => Record<string, TNewValue>` | 각 엔트리를 변환하여 새 객체 반환 |

## Related Types

### `EqualOptions`

`equal()` 옵션:

| Field | Type | Description |
|-------|------|-------------|
| `topLevelIncludes` | `string[]` | 비교할 key 목록 (최상위 레벨에만 적용) |
| `topLevelExcludes` | `string[]` | 비교에서 제외할 key 목록 (최상위 레벨에만 적용) |
| `ignoreArrayIndex` | `boolean` | 배열 순서를 무시할지 여부. `true`면 O(n²) 복잡도 |
| `shallow` | `boolean` | 얕은 비교 여부. `true`면 1단계만 비교 (참조 비교) |

### `MergeOptions`

`merge()` 옵션:

| Field | Type | Description |
|-------|------|-------------|
| `arrayProcess` | `"replace" \| "concat"` | 배열 처리 방식. `"replace"`: target으로 교체 (기본값), `"concat"`: 병합 (중복 제거) |
| `useDelTargetNull` | `boolean` | target이 null일 때 해당 key를 삭제할지 여부 |

### `Merge3KeyOptions`

`merge3()` key별 옵션:

| Field | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | 비교할 하위 key 목록 |
| `excludes` | `string[]` | 비교에서 제외할 하위 key 목록 |
| `ignoreArrayIndex` | `boolean` | 배열 순서를 무시할지 여부 |

### `UndefToOptional<T>`

`undefined` 타입을 가진 속성을 optional로 변환:

```typescript
// { a: string; b: string | undefined } → { a: string; b?: string | undefined }
export type UndefToOptional<TObject> = ...
```

### `OptionalToUndef<T>`

optional 속성을 필수 + `undefined` 유니온으로 변환:

```typescript
// { a: string; b?: string } → { a: string; b: string | undefined }
export type OptionalToUndef<TObject> = ...
```

## Usage

```typescript
import { obj } from "@simplysm/core-common";

// 깊은 복사
const copied = obj.clone({ nested: { data: [1, 2, 3] } });

// 깊은 비교
const isEqual = obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });

// 깊은 병합
const merged = obj.merge(defaults, overrides);

// omit / pick
const noId = obj.omit(user, ["id"]);
const onlyName = obj.pick(user, ["name", "email"]);

// 체인 경로
const val = obj.getChainValue(data, "user.address[0].city");
obj.setChainValue(data, "user.name", "Alice");

// 객체 변환
const mapped = obj.map(colors, (key, rgb) => [null, `rgb(${rgb})`]);
```
