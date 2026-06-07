# @simplysm/core-common — obj 네임스페이스

`import { obj } from "@simplysm/core-common"`. 깊은 복사·비교·병합과 체인 경로 접근, 타입 안전 Object 헬퍼. 값 타입(`DateTime`/`DateOnly`/`Time`/`Uuid`/`Uint8Array`)·`Date`·`RegExp`·`Map`/`Set`·`Error` 를 인지해 올바르게 다룸. 상태 비교·patch·불변 업데이트가 필요할 때 함께 참조.

## clone / equal

- `clone<T>(source: T): T` — 깊은 복사. 순환 참조 지원, 값 타입/Date/RegExp/Error(cause 포함)/Map/Set/Array/일반객체 처리(프로토타입 유지). 함수·Symbol 은 참조 유지, WeakMap/WeakSet 미지원, getter 는 현재 값으로 평가됨.
- `equal(source, target, options?: EqualOptions): boolean` — 깊은 동등 비교. `EqualOptions` 필드:
  - `topLevelIncludes?: string[]` — 지정 시 최상위에서 이 key 들만 비교.
  - `topLevelExcludes?: string[]` — 최상위에서 이 key 들 제외하고 비교.
  - `ignoreArrayIndex?: boolean` — 배열 순서 무시(순열로 비교, O(n²)).
  - `shallow?: boolean` — 1단계 참조 비교만(대용량 시 성능용).
  - 비교 시 객체는 null/undefined key 를 무시(존재하지 않는 것과 동일 취급). include/exclude 는 객체 속성 key 에만 적용(Map key 는 항상 포함).

```ts
obj.equal(a, b, { topLevelExcludes: ["updatedAt"] }); // updatedAt 제외 비교
```

## merge / merge3

- `merge<S, T>(source, target, opt?: MergeOptions): S & T` — 깊은 병합(새 객체, 원본 불변). `MergeOptions`:
  - `arrayProcess?: "replace" | "concat"` — 배열 처리. `"replace"`(기본)=target 배열로 교체, `"concat"`=두 배열 합치고 Set 으로 중복 제거.
  - `useDelTargetNull?: boolean` — target 값이 null 이면 결과에서 해당 key 삭제(true). false/미지정이면 source 값 유지.
  - 타입이 다르면 target 으로 덮어쓰고, 값 타입/Date/Uint8Array 는 통째로 교체.
- `merge3<S, O, T>(source, origin, target, optionsObj?): { conflict: boolean; result }` — 3-way 병합(공통 조상 origin 기준). 한쪽만 바뀌면 그 값 채택, 양쪽 같으면 그 값, 셋 다 다르면 `conflict: true`(origin 값 유지). `optionsObj` 는 key 별 `Merge3KeyOptions`(`keys`=비교할 하위 key, `excludes`=제외 하위 key, `ignoreArrayIndex`)로 key 마다 `equal` 비교 옵션 지정.

```ts
const { conflict, result } = obj.merge3(
  { a: 1, b: 2 }, { a: 1, b: 1 }, { a: 2, b: 1 },
); // conflict: false, result: { a: 2, b: 2 }
```

## pick / omit

- `pick(item, pickKeys): Pick<T, K>` — 지정 key 만 남긴 새 객체.
- `omit(item, omitKeys): Omit<T, K>` — 지정 key 제외한 새 객체.

## 체인 경로 접근

문자열 경로(`"a.b[0].c"`)로 중첩 값에 접근. 경로는 `.`/`[` `]` 로 분해하고 숫자 세그먼트는 배열 인덱스로 처리.

- `getChainValue(obj, chain): unknown` / `getChainValue(obj, chain, optional: true): unknown | undefined` — 경로 값 조회. `optional` 이면 중간 null/undefined 를 만나도 에러 없이 undefined.
- `getChainValueByDepth(obj, key, depth, optional?)` — 같은 key 로 `depth` 단계 하강(예: `parent` 를 2번). `depth < 1` 이면 `ArgumentError`.
- `setChainValue(obj, chain, value): void` — 경로에 값 설정(중간 객체 자동 생성). 빈 chain 이면 `ArgumentError`.
- `deleteChainValue(obj, chain): void` — 경로 값 삭제(중간 경로 없으면 조용히 반환). 빈 chain 이면 `ArgumentError`.

## 정리/변환 헬퍼

- `clearUndefined(obj): T` — null/undefined 값 key 삭제(@mutates 원본 수정).
- `clear(obj): {}` — 모든 key 삭제(@mutates).
- `nullToUndefined(obj): T | undefined` — null 을 undefined 로 재귀 변환(@mutates, 값 타입·순환 참조 보존). null-free 규칙 적용 시.
- `unflatten(flatObj): Record` — `{ "a.b": 1 }` → `{ a: { b: 1 } }` 중첩화.

## 타입 안전 Object 헬퍼

- `keys(obj): (keyof T)[]` — 타입 보존 `Object.keys`.
- `entries(obj): Entries<T>` — 타입 보존 `Object.entries`(`[K, T[K]]` 튜플 배열).
- `fromEntries(entryPairs): { [K in T[0]]: T[1] }` — 타입 보존 `Object.fromEntries`.
- `map(obj, fn: (key, value) => [newKey | null, newValue]): Record` — 엔트리 변환. fn 이 key 자리에 null 반환하면 기존 key 유지. key·값 동시 변환에.

```ts
obj.map({ primary: "255,0,0" }, (k, rgb) => [null, `rgb(${rgb})`]);
// { primary: "rgb(255,0,0)" }
```

## 타입 유틸리티 (export type)

- `EqualOptions` / `MergeOptions` / `Merge3KeyOptions` — 위 함수들의 옵션 타입.
- `UndefToOptional<TObject>` — `undefined` 를 포함한 속성을 optional(`?`)로 변환.
- `OptionalToUndef<TObject>` — optional 속성을 필수 + `| undefined` 유니온으로 변환.
