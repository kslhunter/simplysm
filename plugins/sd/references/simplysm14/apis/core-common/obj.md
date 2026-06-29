# @simplysm/core-common — obj

`import { obj } from "@simplysm/core-common"` 네임스페이스. 객체 깊은 복사·동등 비교·병합·체인 경로 접근·타입 안전 Object 헬퍼를 한 컨텍스트에서 다룰 때 본다.

## clone

```ts
clone<TObj>(source: TObj): TObj
```

- `source` — 복사할 값이다. 원시값은 그대로 반환하고 객체는 타입별로 복사한다.
- 지원 타입 — `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Array`, `Map`, `Set`, 일반 객체를 처리한다.
- 순환 참조 — `WeakMap` 으로 이미 복사한 객체를 재사용한다.
- Error 복사 — prototype 을 유지하고 `message`, `name`, `stack`, `cause`, 커스텀 enumerable 속성을 복사한다.
- 일반 객체 복사 — prototype 을 유지하고 `Object.keys` 대상 속성을 재귀 복사한다.
- 함수·Symbol — 객체가 아니므로 참조를 그대로 유지한다.

## equal

```ts
equal(source: unknown, target: unknown, options?: EqualOptions): boolean
```

- `source` / `target` — 비교 대상이다. 타입이 다르거나 한쪽만 null 이면 false 다.
- `Date` — `getTime()` 으로 비교한다.
- `DateTime`·`DateOnly`·`Time` — 같은 값 타입끼리 `tick` 으로 비교한다.
- `Uuid` — 문자열로 비교한다.
- `RegExp` — `source` 와 `flags` 를 비교한다.
- `Array` — 길이를 먼저 비교하고, `ignoreArrayIndex` 에 따라 index 순서 또는 순열을 비교한다.
- `Map` — null/undefined 값 key 는 제외하고 key/value 를 비교한다. 문자열 key 는 직접 조회, 비문자열 key 는 깊은 비교로 찾는다.
- `Set` — 크기를 먼저 비교하고, shallow 면 `has`, 아니면 깊은 비교로 매칭한다.
- 일반 객체 — null/undefined 값 속성은 제외하고 `Object.keys` 를 비교한다.

`EqualOptions`:

- `topLevelIncludes?: string[]` — 지정된 최상위 key 만 비교한다. 객체 속성 비교에만 적용된다.
- `topLevelExcludes?: string[]` — 지정된 최상위 key 를 비교에서 뺀다. 객체 속성 비교에만 적용된다.
- `ignoreArrayIndex?: boolean` — true 면 배열 순서를 무시하고 순열로 비교한다. 깊은 비교 시 O(n²) 이다.
- `shallow?: boolean` — true 면 1단계 값은 `===` 로 비교한다. Map/Set 에서 참조 비교가 필요할 때.

## merge

```ts
merge<TSource, TMergeTarget>(source: TSource, target: TMergeTarget, opt?: MergeOptions): TSource & TMergeTarget
```

- `source` — 기본 값이다. null/undefined 이면 target clone 을 반환한다.
- `target` — 병합 값이다. undefined 이면 source clone 을 반환한다. null 이고 `useDelTargetNull` 이 true 면 undefined 를 반환해 상위 key 삭제 흐름을 만든다.
- 타입이 다름 — source/target 생성자가 다르면 target clone 으로 교체한다.
- 교체 타입 — `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Uint8Array`, `arrayProcess === "replace"` 인 Array 는 target clone 으로 교체한다.
- Map — source clone 을 만든 뒤 target key 를 재귀 병합하거나 추가한다.
- 객체 — source clone 에 target 의 각 key 를 재귀 병합하고 결과가 null/undefined 인 key 는 삭제한다.

`MergeOptions`:

- `arrayProcess?: "replace" | "concat"` — `"replace"` 는 target 배열로 교체한다. `"concat"` 은 source+target 을 Set 으로 합쳐 중복 제거한다.
- `useDelTargetNull?: boolean` — true 면 target null 이 key 삭제로 이어진다. false/미지정이면 target null 에서 source clone 을 유지한다.

## merge3

```ts
merge3<S extends Record<string, unknown>, O extends Record<string, unknown>, T extends Record<string, unknown>>(
  source: S,
  origin: O,
  target: T,
  optionsObj?: Record<string, Merge3KeyOptions>,
): { conflict: boolean; result: O & S & T }
```

- `source` — 변경 버전 1 이다.
- `origin` — 공통 조상이다. 결과의 초기값은 origin clone 이다.
- `target` — 변경 버전 2 이다.
- 병합 규칙 — source 가 origin 과 같으면 target 값을 사용하고, target 이 origin 과 같으면 source 값을 사용하고, source 와 target 이 같으면 source 값을 사용한다. 셋 다 다르면 `conflict = true` 로 두고 origin 값을 유지한다.
- `optionsObj?: Record<string, Merge3KeyOptions>` — key 별 비교 옵션 객체다. 구현은 이 객체를 `equal(source[key], result[key], optionsObj[key])` 에 직접 전달한다.
- `Merge3KeyOptions.keys?: string[]` — 선언된 필드지만 `equal` 의 인식 필드명은 `topLevelIncludes` 이므로 현재 구현에서는 직접 효과가 없다.
- `Merge3KeyOptions.excludes?: string[]` — 선언된 필드지만 `equal` 의 인식 필드명은 `topLevelExcludes` 이므로 현재 구현에서는 직접 효과가 없다.
- `Merge3KeyOptions.ignoreArrayIndex?: boolean` — `equal` 과 필드명이 같아 배열 순서 무시 비교에 적용된다.

## omit / pick

- `omit<T, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K>` — `omitKeys` 에 포함되지 않은 key 만 새 객체에 복사한다.
- `pick<T, K extends keyof T>(item: T, pickKeys: K[]): Pick<T, K>` — `pickKeys` 의 key 만 새 객체에 복사한다.
- `omitByFilter<T>(item: T, omitKeyFn: (key: keyof T) => boolean): T` — `omitKeyFn(key)` 가 true 인 key 를 제외한다. 소스에는 `@internal` 로 표시되어 있다.

## 체인 경로 접근

- `getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined` — 체인 경로로 값을 읽는다. 중간 값이 null/undefined 이고 `optional` 이 true 면 undefined 로 진행한다.
- `getChainValue(obj: unknown, chain: string): unknown` — `optional` 이 없으면 중간 값에 바로 인덱스 접근한다.
- `chain: string` — `.`, `[`, `]` 로 분리하고 `?`, `!`, `'`, `"` 문자를 제거한다. 숫자로만 된 조각은 number index 로 바꾼다.
- `getChainValueByDepth(obj, key, depth, optional?): value` — 같은 `key` 로 `depth` 만큼 내려간다. `depth < 1` 이면 `ArgumentError`.
- `key: keyof TObject` — 반복 접근할 key 다.
- `depth: number` — 하강 횟수이며 1 이상이어야 한다.
- `optional?: true` — true 면 중간 null/undefined 에서 undefined 를 반환한다.
- `setChainValue(obj: unknown, chain: string, value: unknown): void` — 중간 경로가 없으면 `{}` 를 만들어 마지막 segment 에 value 를 설정한다. 빈 chain 은 `ArgumentError`.
- `deleteChainValue(obj: unknown, chain: string): void` — 마지막 segment 를 삭제한다. 중간 경로가 없거나 객체가 아니면 그대로 반환한다. 빈 chain 은 `ArgumentError`.

## 정리·평탄화 유틸

- `clearUndefined<T extends object>(obj: T): T` — 원본 객체에서 값이 null 또는 undefined 인 key 를 삭제한다. 함수명은 undefined 지만 구현은 `== null` 을 사용한다.
- `clear<T extends Record<string, unknown>>(obj: T): Record<string, never>` — 원본 객체의 모든 own enumerable key 를 삭제한다.
- `nullToUndefined<T>(obj: T): T | undefined` — null/undefined 는 undefined 로 바꾸고, 배열/객체 내부도 재귀 변환한다. 원본 배열/객체를 변경하며 순환 참조는 `WeakSet` 으로 방지한다.
- `unflatten(flatObj: Record<string, unknown>): Record<string, unknown>` — `"a.b"` 같은 dot key 를 중첩 객체로 펼친다.

## 타입 유틸

- `UndefToOptional<TObject>` — undefined 를 포함하는 속성을 optional 속성으로 바꾼다.
- `OptionalToUndef<TObject>` — optional 속성을 필수 속성 + `undefined` union 으로 바꾼다.

## Object 헬퍼

- `keys<T extends object>(obj: T): (keyof T)[]` — `Object.keys` 결과를 `keyof T` 배열로 반환한다.
- `entries<T extends object>(obj: T): Entries<T>` — `Object.entries` 결과를 key/value 튜플 union 배열로 반환한다.
- `fromEntries<T extends [string, unknown]>(entryPairs: T[]): { [K in T[0]]: T[1] }` — 문자열 key 엔트리 배열을 객체로 만든다.
- `map<TSource, TNewKey extends string, TNewValue>(obj, fn): Record<TNewKey | Extract<keyof TSource, string>, TNewValue>` — 각 key/value 를 `[newKey, newValue]` 로 변환해 새 객체를 만든다.
- `fn: (key, value) => [TNewKey | null, TNewValue]` — `newKey` 가 null 이면 원래 key 를 유지하고, 문자열이면 그 key 로 저장한다.
