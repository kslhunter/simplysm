# @simplysm/core-common — obj

`import { obj } from "@simplysm/core-common"`. 깊은 복사·비교·병합과 체인 경로 접근, 타입 안전 Object 헬퍼. 값 타입(`DateTime`/`DateOnly`/`Time`/`Uuid`/`Uint8Array`)·`Date`·`RegExp`·`Map`/`Set`·`Error` 를 인지해 올바르게 다룸. 상태 비교·patch·불변 업데이트가 필요할 때 사용.

## clone

- `clone<T>(source: T): T` — 깊은 복사. 순환 참조 지원(`WeakMap` 추적). `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`RegExp`/`Uint8Array`/`Array`/`Map`/`Set`/`Error`(cause·커스텀 속성 포함) 를 타입별로 복제하고 프로토타입 체인 유지. 단 **함수·Symbol 은 복사 안 되고 참조 유지**, `WeakMap`/`WeakSet` 미지원(빈 객체로 복사됨), getter/setter 는 현재 값으로 평가되어 복사됨.

```ts
const copy = obj.clone({ at: new DateTime(), tags: new Set([1, 2]) });
```

## equal

- `equal(source, target, options?: EqualOptions): boolean` — 깊은 동등성 비교. `Date`/값 타입(tick 비교)/`Uuid`(문자열)/`RegExp`(source+flags)/`Array`/`Map`/`Set`/객체를 재귀 비교. 객체·Map 비교에서 null 값 key 는 무시됨.

`EqualOptions`:

- `topLevelIncludes?: string[]` — 지정 시 그 key 들만 비교(최상위 레벨에만 적용, Map key 에는 미적용).
- `topLevelExcludes?: string[]` — 비교에서 제외할 key(최상위 레벨에만).
- `ignoreArrayIndex?: boolean` — true 면 배열 순서 무시(같은 집합의 순열인지). O(n²).
- `shallow?: boolean` — true 면 1단계 참조 비교(`===`).

```ts
obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });
```

## merge / merge3

- `merge<S, T>(source, target, opt?: MergeOptions): S & T` — 깊은 병합(원본 불변, 새 객체 반환). 타입이 다르거나 값 타입/`Uint8Array` 면 target 으로 교체. `Map` 은 key 별 재귀 병합.

`MergeOptions`:

- `arrayProcess?: "replace" | "concat"` — 배열 처리. `"replace"`(기본): target 배열로 교체, `"concat"`: source+target 합쳐 `Set` 으로 중복 제거(객체는 참조 비교).
- `useDelTargetNull?: boolean` — true 면 target 값이 null 인 key 를 결과에서 삭제. false/미지정이면 source 값 유지.

- `merge3<S, O, T>(source, origin, target, optionsObj?): { conflict: boolean; result }` — 3-way 병합. origin 을 공통 조상으로 source/target 변경을 합침. 한쪽만 변경됐으면 변경값 사용, 둘 다 같으면 그 값, 셋 다 다르면 충돌(`conflict:true`, origin 값 유지). `optionsObj` 는 key 별 `Merge3KeyOptions`(`keys`/`excludes`/`ignoreArrayIndex` — 각 key 의 `equal` 비교 옵션).

```ts
const { conflict, result } = obj.merge3(
  { a: 1, b: 2 }, { a: 1, b: 1 }, { a: 2, b: 1 },
); // conflict:false, result:{ a:2, b:2 }
```

## omit / pick

- `omit(item, omitKeys: K[]): Omit<T, K>` — 지정 key 제외한 새 객체.
- `pick(item, pickKeys: K[]): Pick<T, K>` — 지정 key 만 담은 새 객체.
- `omitByFilter(item, omitKeyFn: (key) => boolean): T` — 함수가 true 를 반환하는 key 제외. (`@internal`)

## 체인 경로 접근

문자열 경로는 `.` 과 `[]` 로 분해되고 `?!'"` 문자는 제거되며 숫자 세그먼트는 인덱스로 변환됨.

- `getChainValue(obj, chain): unknown` / `getChainValue(obj, chain, true): unknown | undefined` — `"a.b[0].c"` 경로로 값 조회. 셋째 인자 `true` 면 중간 null/undefined 를 만나도 throw 없이 undefined 반환.
- `getChainValueByDepth(obj, key, depth, optional?): ...` — 같은 key 로 `depth` 회 하강(예: `parent` 를 2단계). `depth < 1` 이면 `ArgumentError`. `optional:true` 면 중간 null 허용. (`@internal`)
- `setChainValue(obj, chain, value): void` — 경로로 값 설정. 중간 경로 없으면 빈 객체로 생성. 빈 chain 이면 `ArgumentError`.
- `deleteChainValue(obj, chain): void` — 경로로 값 삭제. 중간 경로가 없으면 조용히 반환. 빈 chain 이면 `ArgumentError`.

```ts
obj.getChainValue(data, "user.address[0].city", true);
obj.setChainValue(data, "user.name", "Alice");
```

## 정리·변환

- `clearUndefined(obj): T` `@mutates @internal` — null/undefined 값 key 삭제(원본 수정).
- `clear(obj): Record<string, never>` `@mutates @internal` — 모든 key 삭제(원본 수정).
- `nullToUndefined(obj): T | undefined` `@mutates @internal` — null 을 undefined 로 재귀 변환(원본 수정, 순환 참조 추적). 값 타입은 변환하지 않음. `json.parse` 가 내부적으로 사용.
- `unflatten(flatObj): Record<string, unknown>` `@internal` — `{ "a.b.c": 1 }` 를 `{ a: { b: { c: 1 } } }` 로.

## 타입 안전 Object 헬퍼

- `keys(obj): (keyof T)[]` — 타입 안전 `Object.keys`.
- `entries(obj): Entries<T>` — 타입 안전 `Object.entries`(`[key, value]` 튜플 배열).
- `fromEntries(entryPairs): { [K in T[0]]: T[1] }` — 타입 안전 `Object.fromEntries`.
- `map(obj, fn): Record<...>` — 각 엔트리를 `fn(key, value) => [newKey | null, newValue]` 로 변환한 새 객체. `newKey` 가 null 이면 원래 key 유지(값만 변환).

```ts
obj.keys({ a: 1, b: 2 });                          // ("a" | "b")[]
obj.map(colors, (k, rgb) => [null, `rgb(${rgb})`]); // 값만 변환
```

## 유틸 타입

- `UndefToOptional<TObject>` — `undefined` 를 포함한 속성을 optional 로 변환. `{ a: string; b: string | undefined }` → `{ a: string; b?: string | undefined }`.
- `OptionalToUndef<TObject>` — optional 속성을 필수 + `undefined` 유니온으로. `{ a: string; b?: string }` → `{ a: string; b: string | undefined }`.
- `EqualOptions` / `MergeOptions` / `Merge3KeyOptions` — 위 함수들의 옵션 타입.
