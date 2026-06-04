# @simplysm/core-common — obj 네임스페이스

`import { obj } from "@simplysm/core-common"` 로 접근하는 객체 조작 유틸. 깊은 복사/비교/병합, 체인 경로 접근, key 변환을 할 때 함께 읽힘. 깊은 연산은 커스텀 값 타입(DateTime·DateOnly·Time·Uuid·Uint8Array)·Date·RegExp·Map·Set·Error 를 인지하고 순환 참조를 처리함.

## clone

- `obj.clone(source)`: → 동일 타입 — 깊은 복사. 순환 참조 지원. Date/DateTime/DateOnly/Time/Uuid/Uint8Array/RegExp/Array/Map/Set/Error(cause·커스텀 속성 포함) 및 일반 객체(프로토타입 체인 유지)를 복제.
  - 주의: 함수·Symbol 은 복사 안 되고 참조 유지. WeakMap/WeakSet 미지원(빈 객체화). getter/setter 는 현재 값으로 평가되어 복사(접근자 자체는 복사 안 됨).

## equal

- `obj.equal(source, target, options?)`: → boolean — 깊은 동등성 비교. Date/날짜타입(tick)/Uuid(문자열)/RegExp/Array/Map/Set/일반 객체를 인지. null/undefined 인 속성은 비교에서 제외(없는 것으로 취급).

옵션(`EqualOptions`):
- topLevelIncludes?: string[] — 비교할 key 화이트리스트(최상위 객체 속성에만 적용). 일부 필드만 같으면 OK 로 볼 때.
- topLevelExcludes?: string[] — 비교에서 뺄 key(최상위만). `updatedAt` 같은 변동 필드 무시할 때.
- ignoreArrayIndex?: boolean — true 면 배열 순서 무시(같은 다중집합인지). O(n²). `[1,2,3]==[3,2,1]`.
- shallow?: boolean — true 면 1단계만 참조 비교. 대용량에서 성능 우선일 때.
- 주의: include/exclude 는 객체 속성 key 에만 적용. Map 의 key 는 항상 전부 비교됨.

## merge / merge3

- `obj.merge(source, target, opt?)`: → `Source & Target` — 깊은 병합(원본 불변, 새 객체 반환). target 값으로 source 를 덮어쓰되 객체/Map 은 재귀 병합. 날짜타입·Uuid·Uint8Array 는 통째로 교체.
  - opt.arrayProcess?: `"replace" | "concat"` — 배열 처리. `"replace"`(기본)=target 배열로 교체, `"concat"`=합치고 Set 으로 중복 제거(객체는 참조 비교).
  - opt.useDelTargetNull?: boolean — true 면 target 값이 null 일 때 해당 key 를 결과에서 삭제. 패치에서 "필드 제거"를 표현할 때.
- `obj.merge3(source, origin, target, optionsObj?)`: → `{ conflict, result }` — 3-way 병합(공통 조상 origin 기준). source 만 바뀌면 source, target 만 바뀌면 target, 둘 다 같으면 그 값, 셋 다 다르면 conflict=true(origin 유지). optionsObj 는 key 별 비교 옵션(`Merge3KeyOptions`: keys/excludes/ignoreArrayIndex). 동시 편집 충돌 감지에 사용.

```ts
import { obj } from "@simplysm/core-common";
const merged = obj.merge(base, patch, { arrayProcess: "concat", useDelTargetNull: true });
const { conflict, result } = obj.merge3(mine, origin, theirs);
```

## omit / pick

- `obj.omit(item, omitKeys)`: → `Omit<T,K>` — 지정 key 제외한 새 객체.
- `obj.omitByFilter(item, omitKeyFn)`: → T — `omitKeyFn(key)` 가 true 인 key 제외(예: `_` 로 시작하는 내부 속성).
- `obj.pick(item, pickKeys)`: → `Pick<T,K>` — 지정 key 만 남긴 새 객체.

## 체인 경로 접근

문자열 경로(`"a.b[0].c"`)로 중첩 값 접근. `?`·`!`·따옴표는 무시됨.

- `obj.getChainValue(o, chain)` / `getChainValue(o, chain, true)`: → unknown — 경로 값 조회. 세 번째 `true` 면 중간 null/undefined 를 만나도 에러 없이 undefined.
- `obj.getChainValueByDepth(o, key, depth, optional?)`: → 값 — 같은 key 로 depth 단계 하강(예: `parent` 를 2번). depth<1 이면 ArgumentError. optional 처리는 위와 동일.
- `obj.setChainValue(o, chain, value)`: → void — 경로에 값 설정(중간 객체 자동 생성). 빈 chain 이면 ArgumentError.
- `obj.deleteChainValue(o, chain)`: → void — 경로 값 삭제(중간 경로 없으면 조용히 반환).

## 정리 유틸 (@mutates)

- `obj.clearUndefined(o)`: → T — null/undefined 값 key 를 원본에서 삭제.
- `obj.clear(o)`: → 빈 객체 — 모든 key 삭제.
- `obj.nullToUndefined(o)`: → `T | undefined` — null 을 undefined 로 재귀 변환(순환 안전). 날짜타입·Uuid 는 통과. simplysm 의 null-free 규칙 적용에 사용.
- `obj.unflatten(flatObj)`: → 중첩 객체 — `{ "a.b.c": 1 }` → `{ a: { b: { c: 1 } } }`.

## 타입 안전 Object.* 와 변환

- `obj.keys(o)`: → `(keyof T)[]` — 타입 안전 `Object.keys`.
- `obj.entries(o)`: → `Entries<T>` — 타입 안전 `Object.entries`(튜플 타입 보존).
- `obj.fromEntries(entryPairs)`: → 객체 — 타입 안전 `Object.fromEntries`.
- `obj.map(o, fn)`: → 새 객체 — 각 엔트리를 `fn(key, value) => [newKey | null, newValue]` 로 변환. newKey 가 null 이면 기존 key 유지(값만 변환). key+값 동시 변환 가능.

```ts
obj.map(colors, (key, rgb) => [`${key}Light`, `rgb(${rgb})`]);
```

## 함께 export 되는 타입 유틸

- `UndefToOptional<T>` — `undefined` 를 포함한 속성을 optional(`?`)로 변환.
- `OptionalToUndef<T>` — optional 속성을 `필수 + undefined` union 으로 변환.
- 옵션 타입: `EqualOptions`·`MergeOptions`·`Merge3KeyOptions`.
