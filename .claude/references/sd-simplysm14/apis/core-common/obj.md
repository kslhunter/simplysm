# @simplysm/core-common — obj 네임스페이스

`import { obj } from "@simplysm/core-common"`. 객체/컬렉션의 깊은 복사·비교·병합·경로 접근·키 변환을 다룰 때 함께 읽힌다. clone/equal/merge 는 `DateTime`/`DateOnly`/`Time`/`Uuid`/`Uint8Array`/`Date`/`RegExp` 커스텀 타입과 `Map`/`Set`/`Array`/`Error` 를 인지한다.

## clone / equal / merge / merge3

- `obj.clone(source): T` — 깊은 복사. 순환 참조 지원, 프로토타입 체인 유지, 위 커스텀 타입 보존, `Error`(cause·커스텀 속성 포함) 복사. 단 함수·Symbol 은 참조 유지, WeakMap/WeakSet 은 빈 객체화, getter/setter 는 현재 값으로 평가됨.
- `obj.equal(source, target, options?): boolean` — 깊은 동등 비교. `options`:
  - `topLevelIncludes?: string[]` — 비교할 key 만 한정(최상위 객체 속성에만). 예: id·name 만 비교.
  - `topLevelExcludes?: string[]` — 비교 제외 key(최상위). 예: updatedAt 무시.
  - `ignoreArrayIndex?: boolean` — 배열 순서 무시(집합 동치 비교). true 면 O(n²).
  - `shallow?: boolean` — 1단계 참조 비교. 대용량에서 성능용.
  - null/undefined 인 속성은 비교에서 제외됨(키 개수 계산에서도 빠짐). Map key 에는 include/exclude 미적용.
- `obj.merge(source, target, opt?): TSource & TMergeTarget` — source 기반으로 target 을 깊은 병합한 새 객체(원본 불변). `opt`:
  - `arrayProcess?: "replace"|"concat"` — 배열을 target 으로 교체(기본) 또는 Set 으로 합집합(중복 제거, 객체는 참조 비교).
  - `useDelTargetNull?: boolean` — target 값이 `null` 이면 결과에서 해당 key 삭제(undefined 는 항상 source 유지). 타입이 다르면 target 으로 덮어씀.
- `obj.merge3(source, origin, target, optionsObj?): { conflict, result }` — 공통 조상 `origin` 기준 3-way 병합. 한쪽만 바뀌면 그 값, 양쪽 동일하면 그 값, 셋 다 다르면 `conflict:true`(origin 값 유지). `optionsObj: Record<key, { keys?, excludes?, ignoreArrayIndex? }>` 로 key 별 `equal` 옵션 지정.
- 옵션 타입: `obj.EqualOptions`, `obj.MergeOptions`, `obj.Merge3KeyOptions`.

## 부분 선택 / 키 변환

- `obj.omit(item, omitKeys)` — 지정 key 제외한 새 객체. 반환 `Omit<T,K>`.
- `obj.omitByFilter(item, omitKeyFn)` — `omitKeyFn(key)===true` 인 key 제외(예: `_` 접두 내부 속성 숨김).
- `obj.pick(item, pickKeys)` — 지정 key 만 선택. 반환 `Pick<T,K>`.
- `obj.keys(obj)` — 타입 안전 `Object.keys`. 반환 `(keyof T)[]`.
- `obj.entries(obj)` — 타입 안전 `Object.entries`. 반환 `[K, T[K]][]`.
- `obj.fromEntries(entryPairs)` — 타입 안전 `Object.fromEntries`.
- `obj.map(obj, fn)` — 각 엔트리를 `fn(key, value) => [newKey|null, newValue]` 로 변환한 새 객체. `newKey` 가 `null` 이면 원래 key 유지(값만 변환).

## 체인 경로 접근

- `obj.getChainValue(target, chain, optional?)` — `"a.b[0].c"` 경로로 값 조회. `optional:true` 면 중간 null/undefined 에서 에러 없이 `undefined`.
- `obj.getChainValueByDepth(target, key, depth, optional?)` — 같은 key 로 `depth` 단계 하강(예: `parent` 로 2단계). `depth<1` 이면 `ArgumentError`.
- `obj.setChainValue(target, chain, value)` — 경로로 값 설정(중간 객체 자동 생성). 빈 chain 이면 `ArgumentError`.
- `obj.deleteChainValue(target, chain)` — 경로로 값 삭제. 중간 경로가 없으면 조용히 반환.

## 정리 변환 (@mutates 표기는 원본 수정)

- `obj.clearUndefined(target)` — undefined/null 값 key 삭제(원본 수정).
- `obj.clear(target)` — 모든 key 삭제(원본 수정).
- `obj.nullToUndefined(target)` — `null` → `undefined` 재귀 변환(원본 수정, 순환 참조 안전). 커스텀 날짜/Uuid 타입은 그대로 둠. simplysm 의 null-free 규칙용.
- `obj.unflatten(flatObj)` — `{ "a.b.c": 1 }` → `{ a: { b: { c: 1 } } }`.

## 타입 유틸리티

- `obj.UndefToOptional<T>` — `undefined` 를 포함한 속성을 optional(`?`)로. 예: `{ b: string | undefined }` → `{ b?: string | undefined }`.
- `obj.OptionalToUndef<T>` — optional 속성을 `필수 + undefined` 유니온으로(역변환).

```typescript
const next = obj.merge(prev, patch, { arrayProcess: "concat", useDelTargetNull: true });
if (!obj.equal(a, b, { topLevelExcludes: ["updatedAt"] })) save();
const city = obj.getChainValue(user, "profile.address.city", true);
```
