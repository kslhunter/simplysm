# @simplysm/core-common — obj 네임스페이스

`import { obj } from "@simplysm/core-common"`. 객체/컬렉션의 깊은 복사·동등성 비교·병합·체인 경로 접근·키 변환을 다룰 때 함께 읽힌다. `clone`/`equal`/`merge` 는 커스텀 타입(`DateTime`/`DateOnly`/`Time`/`Uuid`/`Date`/`RegExp`/`Uint8Array`)과 `Map`/`Set`/`Array`/`Error` 를 인지한다. 타입 유틸리티(`Type`/`DeepPartial`)는 entry 직노출, 나머지는 `obj.*` 로 접근.

## clone

```typescript
obj.clone<T>(source: T): T; // 깊은 복사 (순환 참조 지원)
```

- 순환 참조를 WeakMap 으로 추적해 안전 복사. `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`RegExp`/`Uint8Array`/`Array`/`Map`/`Set`/`Error` 를 각 타입으로 재구성하고 프로토타입 체인 유지.
- 함수·Symbol 은 복사되지 않고 참조 유지. WeakMap/WeakSet 미지원(빈 객체화). getter/setter 는 현재 값으로 평가되어 복사.

## equal

```typescript
interface EqualOptions {
  topLevelIncludes?: string[];  // 비교할 key (최상위만)
  topLevelExcludes?: string[];  // 제외할 key (최상위만)
  ignoreArrayIndex?: boolean;   // 배열 순서 무시 (true면 O(n²))
  shallow?: boolean;            // 1단계 참조 비교
}
obj.equal(source: unknown, target: unknown, options?: EqualOptions): boolean;
```

- `topLevelIncludes`/`topLevelExcludes` — 최상위 객체 속성 key 에만 적용(중첩·Map key 에는 미적용). 특정 필드만/제외하고 비교할 때(`{ topLevelExcludes: ["updatedAt"] }`).
- `ignoreArrayIndex: true` — 순서 무시 집합 비교(`[1,2,3]≈[3,2,1]`). O(n²) 비용.
- `shallow: true` — 한 단계만 `===` 참조 비교. 대용량 비교 시 비용 절감용.
- null/undefined 속성은 비교에서 동등하게 다뤄짐(둘 다 결측이면 키 수에서 제외).

## merge / merge3

```typescript
interface MergeOptions {
  arrayProcess?: "replace" | "concat"; // 기본 "replace"
  useDelTargetNull?: boolean;          // target=null 인 key 삭제
}
obj.merge<S, T>(source: S, target: T, opt?: MergeOptions): S & T; // 불변, 새 객체 반환

interface Merge3KeyOptions { keys?: string[]; excludes?: string[]; ignoreArrayIndex?: boolean; }
obj.merge3<S, O, T>(source: S, origin: O, target: T, optionsObj?: Record<string, Merge3KeyOptions>): { conflict: boolean; result: O & S & T };
```

- `merge(source, target, opt)` — source 위에 target 을 깊은 병합한 새 객체. `arrayProcess: "replace"`(기본) 면 배열을 target 으로 교체, `"concat"` 이면 Set 으로 중복 제거 병합. `useDelTargetNull: true` 면 target 의 null 값 key 를 결과에서 삭제. 타입이 다르면 target 우선.
- `merge3(source, origin, target, optionsObj)` — 공통 조상 `origin` 기준 3-way 병합. 한쪽만 바뀌면 그 값 채택, 양쪽이 같으면 그 값, 셋 다 다르면 `conflict: true`(origin 유지). `optionsObj` 는 key 별 `equal` 비교 옵션.

```typescript
obj.merge({ a: 1, list: [1] }, { list: [2] }, { arrayProcess: "concat" }); // { a: 1, list: [1, 2] }
const { conflict, result } = obj.merge3({ a: 1, b: 2 }, { a: 1, b: 1 }, { a: 2, b: 1 }); // false, { a: 2, b: 2 }
```

## omit / pick

```typescript
obj.omit<T, K>(item: T, omitKeys: K[]): Omit<T, K>;
obj.omitByFilter<T>(item: T, omitKeyFn: (key: keyof T) => boolean): T; // @internal
obj.pick<T, K>(item: T, pickKeys: K[]): Pick<T, K>;
```

- `omit`/`pick` — 지정 key 를 제외/선택한 새 객체. `omitByFilter` 는 key 판정 함수로 제외(예: `_` 접두사 내부 필드 제거).

## 체인 경로 접근

```typescript
obj.getChainValue(obj: unknown, chain: string): unknown;
obj.getChainValue(obj: unknown, chain: string, optional: true): unknown | undefined;
obj.getChainValueByDepth<T, K>(obj: T, key: K, depth: number, optional?: true): T[K] | undefined;
obj.setChainValue(obj: unknown, chain: string, value: unknown): void;
obj.deleteChainValue(obj: unknown, chain: string): void;
```

- `getChainValue(obj, "a.b[0].c")` — 점/대괄호 경로로 중첩 값 조회. 3번째 `optional: true` 면 중간 null/undefined 를 만나도 throw 없이 `undefined`.
- `getChainValueByDepth(obj, key, depth)` — 같은 key 로 depth 회 하강(예: `parent` 를 2번). `depth < 1` 이면 `ArgumentError`. `optional: true` 로 안전 하강.
- `setChainValue` — 경로 따라 내려가며 없는 중간 객체는 `{}` 로 생성 후 설정. `deleteChainValue` — 마지막 key 삭제(중간 경로 없으면 조용히 반환). chain 이 비면 `ArgumentError`.

## 결측 정리 / 평탄화 (@internal·@mutates)

```typescript
obj.clearUndefined<T>(obj: T): T;            // null/undefined key 삭제 @mutates
obj.clear<T>(obj: T): Record<string, never>; // 모든 key 삭제 @mutates
obj.nullToUndefined<T>(obj: T): T | undefined; // null → undefined 재귀 @mutates
obj.unflatten(flatObj: Record<string, unknown>): Record<string, unknown>; // "a.b.c" key → 중첩
```

- `clearUndefined`/`clear`/`nullToUndefined` 는 원본을 직접 수정. `nullToUndefined` 는 커스텀 값 타입(Date/DateTime 등)은 보존하고 순환 참조를 WeakSet 으로 방어. simplysm 의 null-free 규칙(JSON 역직렬화 등)에서 사용.
- `unflatten({ "a.b.c": 1 })` → `{ a: { b: { c: 1 } } }`.

## 타입 안전 키 순회

```typescript
obj.keys<T>(obj: T): (keyof T)[];
obj.entries<T>(obj: T): [keyof T, T[keyof T]][];
obj.fromEntries<T extends [string, unknown]>(entryPairs: T[]): { [K in T[0]]: T[1] };
obj.map<S, NK extends string, NV>(obj: S, fn: (key, value) => [NK | null, NV]): Record<...>;
```

- `keys`/`entries`/`fromEntries` — `Object.*` 의 타입 보존 래퍼.
- `obj.map(obj, fn)` — 각 엔트리를 `[newKey|null, newValue]` 로 변환한 새 객체. newKey 가 `null` 이면 기존 key 유지(값만 변환). 키·값 동시 변환에 사용.

```typescript
obj.map({ r: "255,0,0" }, (k, v) => [null, `rgb(${v})`]); // { r: "rgb(255,0,0)" }
```

## 타입 유틸리티

entry 에서 직접 노출되는 타입(`obj.*` 아님).

```typescript
type Type<TInstance> = { new (...args: unknown[]): TInstance } & Function; // 생성자 타입 (common.types)
type DeepPartial<TObject>;                                                 // 모든 속성 재귀 optional (common.types)
type UndefToOptional<TObject>;  // undefined 포함 속성을 optional 로 (obj.ts)
type OptionalToUndef<TObject>;  // optional 속성을 필수 + undefined 유니온으로 (obj.ts)
```

- `Type<T>` — 클래스 생성자를 값으로 받을 때(DI·팩토리·`Array.ofType`). `new ctor()` 가능.
- `DeepPartial<T>` — 원시/값 타입은 유지하고 객체·배열만 재귀 optional. 부분 패치 입력 타입에 사용.
- `UndefToOptional`/`OptionalToUndef` — `b: string | undefined` ↔ `b?: string` 양방향 변환. API 경계에서 optional 표기 정합 맞출 때.
