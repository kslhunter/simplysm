# @simplysm/core-common — obj

`import { obj } from "@simplysm/core-common"` 네임스페이스. 객체 깊은 복사·동등 비교·병합·3-way 병합·체인 경로 접근·타입 안전 Object 헬퍼를 한 컨텍스트에서 다룰 때 봄. `@simplysm/*` 의 커스텀 값 타입(DateTime/DateOnly/Time/Uuid/Uint8Array)을 인지해 처리함.

## clone

```ts
clone<TObj>(source: TObj): TObj
```

깊은 복사. 원시값은 그대로 반환하고 객체는 타입별로 복사함.

- 지원 타입 — `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Array`, `Map`, `Set`, 일반 객체.
- 순환 참조 — `WeakMap` 으로 이미 복사한 객체를 재사용함.
- Error — 생성자 대신 prototype 기반 복사로 커스텀 Error 호환. `message`, `name`, `stack`, `cause`(재귀), 그 외 enumerable 속성을 복사함.
- 일반 객체 — prototype 을 유지(`Object.setPrototypeOf`)하고 `Object.keys` 속성을 재귀 복사함. getter/setter 는 현재 값으로 평가되어 복사됨.
- 함수·Symbol — 객체가 아니므로 참조를 그대로 유지함. WeakMap/WeakSet 은 미지원(빈 객체가 됨).

## equal

```ts
equal(source: unknown, target: unknown, options?: EqualOptions): boolean
```

깊은 동등 비교. 타입이 다르거나 한쪽만 null 이면 false.

- `Date` — `getTime()` 비교. `DateTime`·`DateOnly`·`Time` — 같은 타입끼리 `tick` 비교. `Uuid` — 문자열 비교. `RegExp` — `source`+`flags` 비교.
- `Array` — 길이 먼저 비교 후, `ignoreArrayIndex` 에 따라 index 순서 또는 순열 비교.
- `Map` — null/undefined 값 key 는 제외. 문자열 key 는 직접 조회, 비문자열 key 는 깊은 비교로 매칭(O(n²)). `topLevelIncludes/Excludes` 는 Map 에 적용되지 않음(모든 key 비교).
- `Set` — 크기 먼저 비교 후, shallow 면 `has`, 아니면 깊은 비교 매칭(O(n²)).
- 일반 객체 — null/undefined 값 속성은 제외하고 `Object.keys` 비교.

`EqualOptions`:

- `topLevelIncludes?: string[]` — 지정한 최상위 key 만 비교(객체 속성에만 적용).
- `topLevelExcludes?: string[]` — 지정한 최상위 key 를 비교에서 제외(객체 속성에만 적용).
- `ignoreArrayIndex?: boolean` — true 면 배열 순서를 무시하고 순열로 비교(O(n²)). 예: `[1,2,3]`==`[3,2,1]`.
- `shallow?: boolean` — true 면 1단계 값을 `===` 로 비교(참조 비교). Map/Set 대량 데이터 성능용.

## merge

```ts
merge<TSource, TMergeTarget>(source: TSource, target: TMergeTarget, opt?: MergeOptions): TSource & TMergeTarget
```

깊은 병합. 원본을 수정하지 않고 새 객체를 반환함.

- `source` null/undefined — target clone 을 반환.
- `target` undefined — source clone 을 반환. `target` 이 null 이고 `useDelTargetNull` 이 true 면 undefined 반환(상위 key 삭제 흐름).
- 교체 — `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Uint8Array`, `arrayProcess==="replace"` 인 Array, source/target 생성자가 다른 경우 target clone 으로 교체.
- Map — source clone 에 target key 를 재귀 병합하거나 추가.
- 객체 — source clone 에 target 의 각 key 를 재귀 병합하고 결과가 null/undefined 인 key 는 삭제.

`MergeOptions`:

- `arrayProcess?: "replace" | "concat"` — `"replace"`(기본): target 배열로 교체. `"concat"`: source+target 을 `Set` 으로 합쳐 중복 제거(객체는 참조 비교).
- `useDelTargetNull?: boolean` — true 면 target 의 null 이 해당 key 삭제로 이어진다. false/미지정이면 source 값 유지.

## merge3

```ts
merge3<S, O, T extends Record<string, unknown>>(
  source: S, origin: O, target: T,
  optionsObj?: Record<string, Merge3KeyOptions>,
): { conflict: boolean; result: O & S & T }
```

3-way 병합(source, 공통 조상 origin, target). 결과 초기값은 origin clone.

- 병합 규칙 — source==origin 이면 target 값, target==origin 이면 source 값, source==target 이면 source 값을 씀. 셋 다 다르면 `conflict = true` 로 두고 origin 값을 유지함.
- 반환 — `{ conflict: boolean; result }`.
- `optionsObj?: Record<string, Merge3KeyOptions>` — key 별 비교 옵션. 구현은 이를 `equal(source[key], result[key], optionsObj[key])` 에 직접 전달함.
- `Merge3KeyOptions.ignoreArrayIndex?: boolean` — `equal` 과 필드명이 같아 배열 순서 무시 비교에 적용됨.
- `Merge3KeyOptions.keys?: string[]` / `excludes?: string[]` — 선언된 필드이나 `equal` 의 인식 필드명은 `topLevelIncludes`/`topLevelExcludes` 이므로 현재 구현에서는 직접 효과가 없음.

## omit / pick

- `omit<T, K extends keyof T>(item: T, omitKeys: K[]): Omit<T, K>` — `omitKeys` 에 없는 key 만 새 객체에 복사.
- `pick<T, K extends keyof T>(item: T, pickKeys: K[]): Pick<T, K>` — `pickKeys` 의 key 만 새 객체에 복사.
- `omitByFilter<T>(item: T, omitKeyFn: (key: keyof T) => boolean): T` (@internal) — `omitKeyFn(key)` 가 true 인 key 를 제외함.

## 체인 경로 접근

- `getChainValue(obj, chain: string, optional: true): unknown | undefined` — 체인 경로로 값을 읽되 중간 값이 null/undefined 면 undefined 로 진행.
- `getChainValue(obj, chain: string): unknown` — `optional` 없으면 중간 값에 바로 인덱스 접근(null 이면 throw 가능).
- `chain` 파싱 — `.`·`[`·`]` 로 분리하고 `?`·`!`·`'`·`"` 를 제거함. 숫자로만 된 조각은 number index 로 변환.
- `getChainValueByDepth<TObject, TKey extends keyof TObject>(obj, key, depth, optional?)` (@internal) — 같은 `key` 로 `depth` 만큼 내려감. `depth < 1` 이면 `ArgumentError`. `optional` true 면 중간 null/undefined 에서 undefined 반환.
- `setChainValue(obj, chain: string, value: unknown): void` — 중간 경로가 없으면 `{}` 를 만들어 마지막 segment 에 value 설정. 빈 chain 이면 `ArgumentError`.
- `deleteChainValue(obj, chain: string): void` — 마지막 segment 삭제. 중간 경로가 없거나 객체가 아니면 조용히 반환. 빈 chain 이면 `ArgumentError`.

## 정리·평탄화 유틸 (@internal)

- `clearUndefined<T extends object>(obj: T): T` (@mutates) — 값이 `== null`(null/undefined)인 key 를 원본에서 삭제.
- `clear<T extends Record<string, unknown>>(obj: T): Record<string, never>` (@mutates) — 원본의 모든 own enumerable key 삭제.
- `nullToUndefined<T>(obj: T): T | undefined` (@mutates) — null/undefined 를 undefined 로 바꾸고 배열/객체 내부도 재귀 변환. 값 타입(Date 등)은 그대로 두고 순환 참조는 `WeakSet` 으로 방지. `json.parse` 가 null-free 규칙을 위해 사용.
- `unflatten(flatObj: Record<string, unknown>): Record<string, unknown>` — `"a.b"` 같은 dot key 를 중첩 객체로 펼침.

## Object 헬퍼 (타입 안전)

- `keys<T extends object>(obj: T): (keyof T)[]` — `Object.keys` 를 `keyof T` 배열로 반환.
- `entries<T extends object>(obj: T): Entries<T>` — `Object.entries` 를 key/value 튜플 union 배열로 반환.
- `fromEntries<T extends [string, unknown]>(entryPairs: T[]): { [K in T[0]]: T[1] }` — 문자열 key 엔트리 배열을 객체로.
- `map<TSource, TNewKey extends string, TNewValue>(obj, fn): Record<TNewKey | Extract<keyof TSource, string>, TNewValue>` — 각 엔트리를 `fn(key, value) => [newKey | null, newValue]` 로 변환해 새 객체를 만듦. `newKey` 가 null 이면 원래 key 유지.

## 타입 유틸

- `UndefToOptional<TObject>` — undefined 를 포함하는 속성을 optional 속성으로 변환.
- `OptionalToUndef<TObject>` — optional 속성을 필수 속성 + `undefined` union 으로 변환.
