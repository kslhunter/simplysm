# @simplysm/core-common — 컬렉션 프로토타입 확장

`import "@simplysm/core-common"`(또는 패키지의 다른 심볼 import) 시 부수효과로 `Array`/`Set`/`Map` 프로토타입에 메서드가 주입된다. 별도 함수 호출이 아니라 인스턴스 메서드로 바로 쓴다. 메서드들은 `enumerable: false` 로 정의되어 `for...in` 에 노출되지 않음. 컬렉션을 그룹화·중복제거·정렬·diff 할 때 함께 읽힌다.

## Array — 조회 (ReadonlyArrayExt)

- `single(predicate?)` — 조건에 맞는 단일 요소. 없으면 `undefined`, 2개 이상이면 `ArgumentError` throw. "있다면 하나뿐" 을 단언할 때.
- `first(predicate?)` / `last(predicate?)` — 첫/마지막 요소(predicate 생략 시 인덱스 끝). 없으면 `undefined`.
- `filterExists()` — `null`/`undefined` 제거. 반환 타입 `NonNullable<T>[]`.
- `ofType(type)` — 특정 타입 요소만. `type` 은 `PrimitiveTypeStr`("string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes") 또는 생성자(`Type<N>`). 문자열은 typeof/instanceof, 생성자는 `instanceof` + `constructor` 일치로 판정.
- `sum(selector?)` — 합계. 비어 있으면 0. 숫자가 아니면 `ArgumentError`.
- `min(selector?)` / `max(selector?)` — 최소/최대(문자열·숫자). 비어 있으면 `undefined`. 그 외 타입은 `ArgumentError`.
- `shuffle()` — Fisher-Yates 셔플한 새 배열.

비동기:
- `filterAsync(predicate)` / `mapAsync(selector)` — 순차 실행(await 보장). 호출 순서가 중요할 때.
- `parallelAsync(fn)` — `Promise.all` 병렬. 하나라도 reject 면 전체 즉시 reject.
- `mapMany(selector?)` — 매핑 후 1단계 평탄화 + `filterExists`. selector 생략 시 자기 자신 평탄화.
- `mapManyAsync(selector?)` — `mapMany` 의 비동기(순차) 버전.

## Array — 그룹화·변환

- `groupBy(keySelector, valueSelector?)` — key 별 `{ key, values }[]`. 원시 key 는 O(n)(Map), 객체 key 는 O(n²)(깊은 비교). 객체 key 가 필요 없으면 `toArrayMap` 권장.
- `toMap(keySelector, valueSelector?)` — `Map<K,V>`. key 중복 시 `ArgumentError`.
- `toMapAsync(...)` — `toMap` 의 비동기(순차) 버전. selector 가 Promise 반환 가능.
- `toArrayMap(keySelector, valueSelector?)` — `Map<K, V[]>`. 같은 key 값들을 배열로 누적.
- `toSetMap(keySelector, valueSelector?)` — `Map<K, Set<V>>`. 값 중복 자동 제거.
- `toMapValues(keySelector, valueSelector)` — key 별로 모은 `items[]` 를 `valueSelector(items)` 로 집계해 `Map<K,V>`.
- `toObject(keySelector, valueSelector?)` — `Record<string,V>`. key(문자열) 중복 시 `ArgumentError`(단 기존 값이 null 이면 덮어쓰기 허용).
- `toTree(keyProp, parentKey)` — 평면 배열 → 트리. `parentKey` 가 null/undefined 인 항목이 루트, 각 노드에 `children` 추가(원본은 clone). 반환 `TreeArray<T>[]`.

## Array — 중복제거·정렬·diff

- `distinct(options?)` — 중복 제거(새 배열). `options`: `boolean`(=`{matchAddress}`) 또는 `{ matchAddress?, keyFn? }`. `matchAddress:true` 면 참조 비교(O(n)), `keyFn` 이면 key 비교(O(n)), 둘 다 없으면 객체는 깊은 비교(O(n²)).
- `orderBy(selector?)` / `orderByDesc(selector?)` — 오름/내림차순 새 배열. selector 는 string|number|DateTime|DateOnly|Time|undefined 반환. null/undefined 는 오름차순에서 앞.
- `diffs(target, options?)` — 두 배열 비교 결과 `ArrayDiffsResult<T,P>[]`. `options.keys`(key 비교 속성)·`options.excludes`(비교 제외 속성). 전체 일치 우선, 없으면 key 일치를 UPDATE 로. target 잔여는 INSERT, source 잔여는 DELETE.
- `oneWayDiffs(orgItems, keyPropNameOrGetValFn, options?)` — source(this) 를 기준으로 원본 대비 변경 분류. `keyPropNameOrGetValFn`: 키 속성명 또는 `(item) => 키값`. key 값이 없거나 원본에 없으면 `create`, 다르면 `update`, 같으면 `same`(옵션 `includeSame:true` 일 때만 포함). `options.excludes`/`options.includes` 로 비교 범위 조정. 반환 `ArrayOneWayDiffResult<T>[]`.
- `merge(target, options?)` — `diffs` 결과를 적용해 병합한 새 배열. UPDATE 는 `obj.merge` 로 깊은 병합, INSERT 는 추가. `options` 는 `diffs` 와 동일.

## Array — 원본 변경 (MutableArrayExt, @mutates)

원본 배열을 직접 수정하고 보통 `this` 를 반환(체이닝).
- `distinctThis(options?)` — 원본에서 중복 제거(역순 splice).
- `orderByThis(selector?)` / `orderByDescThis(selector?)` — 원본 in-place 정렬.
- `insert(index, ...items)` — 지정 위치 삽입.
- `remove(itemOrSelector)` — 값 일치 또는 조건 함수에 맞는 항목 전부 제거(역순 순회).
- `toggle(item)` — 있으면 제거, 없으면 push.
- `clear()` — 전부 비움.

## Set 확장

- `adds(...values)` — 여러 값 일괄 추가, `this` 반환.
- `toggle(value, addOrDel?)` — `addOrDel` 생략 시 자동 토글(있으면 제거/없으면 추가), `"add"`=강제 추가, `"del"`=강제 제거. 조건부 추가/제거를 한 줄로. `this` 반환.

## Map 확장

- `getOrCreate(key, newValueOrFactory)` — key 가 없으면 값을 설정 후 반환, 있으면 기존 값. 두 번째 인자가 함수면 팩토리로 인식해 호출됨 — 함수 자체를 값으로 저장하려면 `() => fn` 처럼 팩토리로 감쌀 것.
- `update(key, updateFn)` — 현재 값(`v | undefined`)을 받아 새 값을 설정. key 가 없어도 `updateFn(undefined)` 호출됨. 카운터 증가·배열 누적 등에.

## 내보낸 타입

- `ArrayDiffsResult<TOriginal, TOther>` — `{ source: undefined, target }`(INSERT) | `{ source, target: undefined }`(DELETE) | `{ source, target }`(UPDATE).
- `ArrayOneWayDiffResult<TItem>` — `{ type: "create"|"update"|"same", item, orgItem }` (create 는 `orgItem: undefined`).
- `TreeArray<TNode>` — `TNode & { children: TreeArray<TNode>[] }`.
- `ComparableType` — `string | number | boolean | DateTime | DateOnly | Time | undefined`. 정렬/비교 가능 타입.

```typescript
const orders = items.toArrayMap((it) => it.customerId);          // Map<id, item[]>
const sorted = items.orderBy((it) => it.createdAt).distinct({ keyFn: (it) => it.id });
const tree = rows.toTree("id", "parentId");
const changes = current.oneWayDiffs(original, "id");             // create/update 분류
```
