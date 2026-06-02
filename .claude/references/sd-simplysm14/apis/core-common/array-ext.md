# @simplysm/core-common — Array 확장 메서드

패키지를 import 하면 부수효과로 `Array.prototype` 에 메서드가 주입된다(`enumerable: false`, `for...in` 비노출). 함수 호출이 아니라 배열 인스턴스 메서드로 직접 사용. 조회/그룹/정렬/diff 등 읽기 메서드(`ReadonlyArrayExt`)는 새 배열을 반환하고, 변형 메서드(`MutableArrayExt`, 이름에 `This` 가 붙거나 insert/remove/toggle/clear)는 원본을 직접 수정한다.

## 조회·필터

```typescript
single(predicate?): TItem | undefined;       // 조건 일치 1건. 2건 이상이면 ArgumentError
first(predicate?): TItem | undefined;         // 첫 일치(없으면 undefined)
last(predicate?): TItem | undefined;          // 마지막 일치
filterExists(): NonNullable<TItem>[];          // null/undefined 제거
ofType(type: PrimitiveTypeStr | Type<T>): T[]; // 타입별 필터
filterAsync(predicate: (item, i) => Promise<boolean>): Promise<TItem[]>; // 순차 비동기 필터
```

- `single(predicate)` — "정확히 1건" 보장이 필요할 때. 조건 일치가 2건 이상이면 `ArgumentError` throw, 0건이면 `undefined`. predicate 생략 시 배열 전체 대상.
- `first`/`last` — predicate 생략 시 각각 `[0]`/마지막 요소.
- `ofType(type)` — `"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"` 문자열이면 해당 원시 타입으로, 생성자(`Type<N>`)면 `instanceof`/constructor 일치로 필터. 혼합 배열에서 특정 타입만 뽑을 때.
- `filterAsync` — predicate 가 Promise 인 경우. 병렬이 아니라 **순차** 실행(부수효과 순서 보장).

## 매핑·평탄화

```typescript
mapAsync(selector: (item, i) => Promise<R>): Promise<R[]>;       // 순차
parallelAsync(fn: (item, i) => Promise<R>): Promise<R[]>;         // Promise.all 병렬
mapMany(): U[];                                                   // 중첩 배열 1단 평탄화
mapMany(selector: (item, i) => R[]): R[];                          // 매핑 후 평탄화
mapManyAsync(selector: (item, i) => Promise<R[]>): Promise<R[]>;   // 순차 매핑 후 평탄화
```

- `mapAsync` vs `parallelAsync` — 둘 다 비동기 매핑이나 `mapAsync` 는 한 건씩 순차, `parallelAsync` 는 `Promise.all` 동시 실행. `parallelAsync` 는 하나라도 reject 되면 전체 즉시 reject.
- `mapMany` — 평탄화 시 내부적으로 `filterExists` 가 적용되어 null/undefined 도 제거됨. selector 없으면 자신을 1단 flat.

## 그룹화·Map/객체 변환

```typescript
groupBy(keySelector, valueSelector?): { key; values }[];
toMap(keySelector, valueSelector?): Map<K, V>;
toMapAsync(keySelector, valueSelector?): Promise<Map<K, V>>;
toArrayMap(keySelector, valueSelector?): Map<K, V[]>;
toSetMap(keySelector, valueSelector?): Map<K, Set<V>>;
toMapValues(keySelector, valueSelector: (items) => V): Map<K, V>;
toObject(keySelector: (item, i) => string, valueSelector?): Record<string, V>;
```

- `groupBy(keySelector)` — `{ key, values }` 배열. 원시 key 는 Map 으로 O(n), 객체 key 는 깊은 비교로 O(n²). 원시 key 만 필요하면 `toArrayMap` 이 항상 O(n).
- `toMap` — key→단일 값. key 중복 시 뒤 값이 덮어씀. `toArrayMap`/`toSetMap` — key→배열/Set(다대일 집계).
- `toMapValues(keySelector, valueSelector)` — 같은 key 의 항목 배열을 받아 단일 값으로 집계(`(items) => items.sum(...)` 등).
- `toObject` — key 가 반드시 string. `valueSelector` 생략 시 값은 원소 자체.

## 트리·중복·정렬

```typescript
toTree(keyProp: K, parentKey: P): TreeArray<TItem>[]; // TreeArray<T> = T & { children: TreeArray<T>[] }
distinct(options?: boolean | { matchAddress?: boolean; keyFn?: (item) => string | number }): TItem[];
orderBy(selector?): TItem[];
orderByDesc(selector?): TItem[];
```

- `toTree(keyProp, parentKey)` — 평면 배열을 `children` 트리로. `parentKey` 값이 null/undefined 인 항목이 루트. 내부 `toArrayMap` 사용 O(n), 원본은 복사되고 `children` 추가.
- `distinct(options)` — 중복 제거. `true`/`{matchAddress:true}` 면 참조(Set) 비교, `keyFn` 지정 시 key 기준 O(n). 객체 배열을 옵션 없이 쓰면 깊은 비교 O(n²)(대량 데이터엔 `keyFn` 권장).
- `orderBy`/`orderByDesc(selector)` — selector 반환 타입은 `string|number|DateOnly|DateTime|Time|undefined`. 새 배열 반환. 결측은 비교에서 그대로 처리.

```typescript
const tree = items.toTree("id", "parentId");
const uniq = users.distinct({ keyFn: (u) => u.id });
```

## diff·merge

```typescript
type ArrayDiffsResult<O, T> =
  | { source: undefined; target: T }  // INSERT
  | { source: O; target: undefined }  // DELETE
  | { source: O; target: T };          // UPDATE
type ArrayOneWayDiffResult<T> =
  | { type: "create"; item: T; orgItem: undefined }
  | { type: "update"; item: T; orgItem: T }
  | { type: "same";   item: T; orgItem: T };

diffs(target, options?): ArrayDiffsResult<TItem, TOther>[];
oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?): ArrayOneWayDiffResult<TItem>[];
merge(target, options?): (TItem | TOther | (TItem & TOther))[];
```

- `diffs(target, options)` — 두 배열을 비교해 INSERT/DELETE/UPDATE 분류. `options.keys` 매칭 key 목록, `options.excludes` 비교 제외 속성. target 에 중복 key 가 있으면 첫 매칭만 사용. 서버 동기화 대상 산출에 사용.
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options)` — 현재(this) 배열을 원본(`orgItems`, 배열 또는 `Map`) 대비 create/update/same 으로 분류. `keyPropNameOrGetValFn` 은 key 속성명 또는 key 추출 함수. `options.includeSame` 동일건 포함 여부, `excludes`/`includes` 비교 속성 제한.
- `merge(target, options)` — 두 배열을 key 기준 병합(없으면 추가, 있으면 속성 합침). `options.keys`/`excludes` 는 `diffs` 와 동일 의미.

## 집계

```typescript
sum(selector?: (item, i) => number): number;        // 빈 배열이면 0
min(selector?): TProp | undefined;
max(selector?): TProp | undefined;
shuffle(): TItem[];
```

- `sum` — selector 생략 시 원소를 숫자로 더함. 빈 배열은 0.
- `min`/`max` — selector 없으면 원소가 `number|string` 일 때만. 비면 `undefined`.
- `shuffle` — 무작위 순서의 새 배열.

## 변형 메서드 (@mutates 원본 직접 수정)

```typescript
distinctThis(options?): TItem[];      // distinct 의 in-place 판
orderByThis(selector?): TItem[];      // 오름차순 in-place
orderByDescThis(selector?): TItem[];  // 내림차순 in-place
insert(index: number, ...items: TItem[]): this;
remove(item: TItem): this;
remove(selector: (item, i) => boolean): this;
toggle(item: TItem): this;            // 있으면 제거, 없으면 추가
clear(): this;                         // 비우기
```

- `*This` 계열·`insert`/`remove`/`toggle`/`clear` 는 원본 배열을 직접 바꾸고 `this`(또는 배열)를 반환해 체이닝 가능. 새 배열이 필요하면 `This` 없는 `orderBy`/`distinct` 사용.
- `remove` — 값 또는 조건 함수 오버로드. `toggle` — 멤버십 토글로 선택 상태 관리에 사용.

```typescript
list.remove((x) => x.deleted).orderByThis((x) => x.seq);
```
