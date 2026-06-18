# @simplysm/core-common — collection-ext

`@simplysm/core-common` 진입점을 import 하면 `Array`/`ReadonlyArray`/`Set`/`Map` 프로토타입에 확장 메서드가 전역 설치됨(별도 import 불필요 — 패키지를 한 번이라도 import 한 코드 전체에 적용). LINQ 류 조회·그룹화·집합 연산·diff/merge·트리 변환에 사용. 결과/유틸 타입 `ArrayDiffsResult`/`ArrayOneWayDiffResult`/`TreeArray`/`ComparableType` 도 진입점에서 export 됨.

`@mutates` 표시된 메서드는 원본 배열/Set/Map 을 직접 수정한다. 그 외 배열 메서드는 새 배열·Map 등을 반환한다.

## Array — 조회

- `single(predicate?): TItem | undefined` — 조건에 맞는 단일 요소. 2개 이상이면 `ArgumentError`, 없으면 undefined.
- `first(predicate?): TItem | undefined` — 첫 요소(predicate 있으면 `find`).
- `last(predicate?): TItem | undefined` — 마지막 요소(predicate 있으면 뒤에서부터 탐색).
- `filterExists(): NonNullable<TItem>[]` — null/undefined 제거(타입도 `NonNullable` 로 좁힘).
- `ofType(type): ...` — 특정 타입 요소만 필터. `type` 이 `PrimitiveTypeStr`(`"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`)면 해당 원시/값 타입으로, `Type<N>`(생성자)이면 `instanceof`/`constructor` 일치로 필터하며 반환 타입을 좁힘.
- `filterAsync(predicate): Promise<TItem[]>` — 비동기 필터(**순차** 실행).
- `mapAsync(selector): Promise<TResult[]>` — 비동기 매핑(**순차** 실행).
- `mapMany(selector?): ...` — 인자 없으면 1단계 평탄화 후 `filterExists`, selector 있으면 매핑 후 평탄화·`filterExists`.
- `mapManyAsync(selector?): Promise<...>` — 비동기(순차) 매핑 후 평탄화.
- `parallelAsync(fn): Promise<TResult[]>` — `Promise.all` 병렬 실행. 하나라도 reject 되면 전체 즉시 reject.
- `sum(selector?): number` — 합계(빈 배열은 0). 숫자가 아니면 `ArgumentError`.
- `min(selector?) / max(selector?)` — 최소/최대(문자열·숫자만, 빈 배열은 undefined). 다른 타입이면 `ArgumentError`.
- `shuffle(): TItem[]` — Fisher-Yates 셔플한 새 배열.

```ts
[1, 2, 3, 4].filterExists();      // [1, 2, 3, 4]
users.single((u) => u.id === 1);  // id=1 인 유일 항목 또는 undefined
```

## Array — 그룹화·맵 변환

- `groupBy(keySelector, valueSelector?): { key; values }[]` — key 기준 그룹화. 원시 key 는 O(n)(Map), 객체 key 는 깊은 비교 O(n²).
- `toMap(keySelector, valueSelector?): Map<K, V>` — 1:1 Map. 중복 key 면 `ArgumentError`.
- `toMapAsync(keySelector, valueSelector?): Promise<Map<K, V>>` — 비동기 selector 지원(순차). 중복 key 면 `ArgumentError`.
- `toArrayMap(keySelector, valueSelector?): Map<K, V[]>` — 같은 key 끼리 배열로 모음(O(n), `Map.getOrCreate` 사용).
- `toSetMap(keySelector, valueSelector?): Map<K, Set<V>>` — 같은 key 끼리 Set 으로 모음.
- `toMapValues(keySelector, valueSelector): Map<K, V>` — key 별 그룹을 만든 뒤 `valueSelector(items: T[])` 로 집계값 생성.
- `toObject(keySelector, valueSelector?): Record<string, V>` — 문자열 key 객체. 같은 key 에 non-null 값이 이미 있으면 `ArgumentError`(undefined 값은 덮어쓰기 허용).
- `toTree(keyProp, parentKey): TreeArray<TItem>[]` — 평면 배열을 트리로. `parentKey` 가 null/undefined 인 항목이 루트, 각 항목은 복제되고 `children` 추가(O(n)).

```ts
items.toArrayMap((x) => x.category);             // Map<category, items[]>
items.toTree("id", "parentId");                  // 루트 노드 배열(children 포함)
```

## Array — 정렬·중복제거

- `distinct(options?): TItem[]` — 중복 제거(새 배열). `options` 가 boolean 이거나 `{ matchAddress?, keyFn? }`. `matchAddress:true` 면 참조(주소) 비교 O(n), `keyFn` 이면 커스텀 key O(n), 둘 다 없으면 원시값은 O(n)·객체는 깊은 비교 O(n²).
- `orderBy(selector?) / orderByDesc(selector?)` — 오름/내림 정렬(새 배열). selector 는 `string|number|DateTime|DateOnly|Time|undefined` 반환(날짜형은 tick 으로 비교). null/undefined 는 오름차순에서 앞·내림차순에서 뒤. 비교 불가 타입이면 `ArgumentError`.
- `distinctThis(options?)` `@mutates` — 원본에서 중복 제거. 옵션은 `distinct` 와 동일.
- `orderByThis(selector?) / orderByDescThis(selector?)` `@mutates` — 원본 정렬.

## Array — diff·merge

- `diffs(target, options?): ArrayDiffsResult<T, P>[]` — 두 배열 비교. 결과 항목은 INSERT(`source:undefined`)·DELETE(`target:undefined`)·UPDATE(둘 다 존재) 셋 중 하나. `options.keys` 지정 시 그 key 들로 매칭(전체 깊은 일치 우선, 없으면 key 일치). `options.excludes` 는 비교 제외 속성. target 에 같은 key 가 여럿이면 첫 매칭만.
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?): ArrayOneWayDiffResult<T>[]` — 원본(`orgItems`: 배열 또는 `Map`) 대비 변경 분류. key 값이 없거나 원본에 없으면 `"create"`, 일치하면(옵션 `includeSame:true` 일 때만) `"same"`, 다르면 `"update"`. `excludes`/`includes` 로 비교 범위 조정.
- `merge(target, options?): (T | P | (T & P))[]` — `diffs` 결과로 병합한 새 배열. UPDATE 는 `obj.merge` 로 합치고, INSERT 는 뒤에 추가(DELETE 는 유지). source 항목을 못 찾으면 `SdError`.

```ts
const result = orgRows.diffs(newRows, { keys: ["id"] });
// [{ source, target }, ...] — INSERT/DELETE/UPDATE
const changes = newRows.oneWayDiffs(orgRows, "id");
// [{ type: "create"|"update"|"same", item, orgItem }]
```

## Array — 변형 (@mutates)

- `insert(index, ...items): this` — 지정 위치에 삽입.
- `remove(item): this` / `remove(selector): this` — 값(참조) 또는 조건에 맞는 항목 모두 제거(역순 순회).
- `toggle(item): this` — 있으면 제거, 없으면 추가.
- `clear(): this` — 전부 제거.

## Set 확장

- `adds(...values: T[]): this` — 여러 값을 한 번에 추가(`@mutates`).
- `toggle(value: T, addOrDel?: "add" | "del"): this` — 값 토글(`@mutates`). `addOrDel` 생략 시 자동 토글(있으면 제거·없으면 추가), `"add"` 면 강제 추가, `"del"` 면 강제 제거. 조건부 추가/제거를 한 줄로.

```ts
const set = new Set<number>([1, 2, 3]);
set.toggle(2);                       // {1, 3}
set.toggle(5, isAdmin ? "add" : "del");
```

## Map 확장

- `getOrCreate(key, newValue): V` / `getOrCreate(key, newValueFn: () => V): V` — key 가 있으면 그 값, 없으면 값을 설정 후 반환. 두 번째 인자가 함수면 **팩토리로 호출**됨(비용 큰 연산 지연 생성). 따라서 `V` 자체가 함수 타입이면 값을 저장하려면 `() => myFn` 처럼 팩토리로 감싸야 함.
- `update(key, updateFn: (v: V | undefined) => V): void` — 현재 값(없으면 undefined)을 받아 새 값 계산 후 set. 카운터 증가·배열 누적 등 기존 값 기반 갱신에.

```ts
const arr = map.getOrCreate("k", []);           // 없으면 [] 설정 후 반환
arr.push(item);
countMap.update("k", (v) => (v ?? 0) + 1);      // 카운터 증가
```

## 결과/유틸 타입

```ts
type ArrayDiffsResult<TOriginal, TOther> =
  | { source: undefined; target: TOther }   // INSERT
  | { source: TOriginal; target: undefined } // DELETE
  | { source: TOriginal; target: TOther };   // UPDATE

type ArrayOneWayDiffResult<TItem> =
  | { type: "create"; item: TItem; orgItem: undefined }
  | { type: "update"; item: TItem; orgItem: TItem }
  | { type: "same"; item: TItem; orgItem: TItem };

type TreeArray<TNode> = TNode & { children: TreeArray<TNode>[] };
type ComparableType = string | number | boolean | DateTime | DateOnly | Time | undefined;
```
