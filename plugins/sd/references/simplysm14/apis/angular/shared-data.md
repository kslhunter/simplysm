# @simplysm/angular — 공유 마스터 데이터·선택 매니저

공유 마스터 데이터 등록/갱신/선택 UI와 시트·리스트에서 쓰는 selection/sorting/expanding manager 군이다. 공유데이터 사용법: [client-shared-data.md](../../manuals/client-shared-data.md), 실시간 이벤트 사용법: [event.md](../../manuals/event.md)

## 공유 데이터 provider

### `SdSharedDataProvider<T>`

```ts
@Injectable()
abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string | number>>> {
  loadingCount: WritableSignal<number>;
  abstract initialize(): void;
  register<K extends string & keyof T>(name: K, info: SharedDataInfo<T[K]>): void;
  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]>;
  emitAsync<K extends string & keyof T>(name: K, changeKeys?: (string | number)[]): Promise<void>;
  wait(): Promise<void>;
}
interface SharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}
interface SharedDataInfo<T extends SharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (item: T) => string | number | DateOnly | DateTime | Time | undefined;
}
interface SharedDataHandle<T extends SharedDataBase<string | number>> {
  items: Signal<T[]>;
  get: (key: T["__valueKey"] | undefined) => T | undefined;
}
const SdSharedDataChangeEvent = defineEvent<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>("SdSharedDataChange");
```

데이터 세트를 등록하고 이벤트 기반으로 캐시를 무효화하는 abstract provider. 앱은 subclass에서 `initialize()` 로 `register` 함.

- `SharedDataBase` — 모든 항목이 만족해야 하는 베이스. `__valueKey`(고유 key), `__searchText`(검색 매칭용 텍스트), `__isHidden`(논리 숨김), `__parentKey?`(트리 부모 key). `id`/`name` 필드 없음.
- `register(name, info)` — 데이터 세트 등록. 재등록 시 기존 listener 제거 + generation 증가로 in-flight 결과 무시.
- `getHandle(name)` — 핸들 반환(미등록 시 throw). 최초 접근 시 lazy 로드. 핸들 `items` 는 읽기 전용 signal, `get(key)` 는 내부 Map 조회.
- `SharedDataInfo` — `serviceKey`(서비스 클라이언트 key), `getter`(전체/부분 로드, `changeKeys` 인자 시 변경분만), `filter`(이벤트 매칭·listener 등록용), `orderBy`(부분 갱신 병합 시 정렬).
- `emitAsync(name, changeKeys)` — 변경 이벤트를 listener에 emit해 캐시 갱신 트리거(`changeKeys` 없으면 전체 reload).
- `wait()` — `loadingCount <= 0` 까지 대기.
- `SdSharedDataChangeEvent` — `"SdSharedDataChange"` defineEvent. listener info `{ name, filter }`, payload는 `changeKeys`.

## 선택 매니저 (composable)

signal 기반 순수 헬퍼 함수들. 주입 컨텍스트에서 호출하며 `sd-sheet` 등이 내부에서 사용함.

### `useExpandingManager<T>`

```ts
function useExpandingManager<T>(binding: {
  items: Signal<T[]>;
  expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): {
  displayItems: Signal<T[]>;
  hasExpandable: Signal<boolean>;
  isAllExpanded: Signal<boolean>;
  toggle(item: T): void;
  toggleAll(): void;
  isVisible(item: T): boolean;
  def(item: T): ExpandItemDef<T>;
};
interface ExpandItemDef<T> {
  item: T;
  parentDef: ExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
```

트리 펼침 관리. `getChildrenFn` 으로 재귀 평탄화(레벨마다 `sort` 적용).

- `displayItems` — 펼침/정렬된 pre-order 평탄 목록.
- `hasExpandable`/`isAllExpanded` — 펼칠 수 있는 항목 존재/전부 펼침 여부.
- `toggle`/`toggleAll` — 항목/전체 펼침 토글.
- `isVisible(item)` — 모든 조상이 펼쳐졌을 때만 true.
- `def(item)` — 항목의 `ExpandItemDef`(없으면 throw). `parentDef`(조상 체인), `hasChildren`, `depth`(root=0).

### `useSelectionManager<TItem, TKey>`

```ts
function useSelectionManager<TItem, TKey>(options: {
  displayItems: Signal<TItem[]>;
  selectedKeys: WritableSignal<TKey[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: TItem) => boolean | string) | undefined>;
  trackByFn: Signal<(item: TItem, index: number) => TKey>;
}): {
  hasSelectable: Signal<boolean>;
  isAllSelected: Signal<boolean>;
  getSelectable(item: TItem): true | string | undefined;
  getCanChangeFn(item: TItem): () => boolean;
  select(item): void;
  deselect(item): void;
  toggle(item): void;
  toggleAll(): void;
  isSelected(item): boolean;
};
```

선택 관리(key 기준, deep equal `obj.equal` 비교).

- `hasSelectable` — `selectMode != null`.
- `getSelectable(item)` — `true` 선택 가능, `undefined` 불가, `string` 비활성 사유.
- `select` — single이면 `[key]` 로 교체, multi면 추가. `deselect`/`toggle`/`toggleAll`/`isSelected` 보조.

### `useSortingManager`

```ts
function useSortingManager(options: { sorts: WritableSignal<SortingDef[]> }): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
};
interface SortingDef {
  key: string;
  desc: boolean;
}
```

정렬 관리.

- `defMap` — 컬럼별 `{ indexText?, desc }`(다중 정렬 시 1-based 순번 badge).
- `toggle(key, multiple)` — 3단계 순환. multiple=true는 다중 정렬 누적(none→asc→desc→제거), false는 단일 정렬 교체(none→asc→desc→전체 비움).
- `sort(items)` — null-aware, string `localeCompare`/number 차감, `desc` 시 반전, 다중 키 tie-break.

## 공유 데이터 선택 UI

세 컨트롤 모두 `items: TItem[]`(보통 `getHandle(...).items()`)를 직접 받고, `SharedDataBase` 형태(`__valueKey`/`__searchText`/`__isHidden`/`__parentKey`)로 동작함.

### `SdSharedDataSelect<TItem, TMode, TModal>` (`sd-shared-data-select`)

```ts
class SdSharedDataSelect<TItem extends SharedDataBase<...>, TMode extends keyof SelectModeValue<TItem>, TModal extends SdSelectModal<any>> {
  value: ModelSignal<SelectModeValue<TItem["__valueKey"] | undefined>[TMode]>;
  items: InputSignal<TItem[]>;                       // required
  disabled, required, useUndefined, inset, inline: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  selectMode: InputSignal<TMode>;                    // default "single"
  filterFn: InputSignal<(item: TItem, index: number, ...params: any[]) => boolean>;
  filterFnParams: InputSignal<any[] | undefined>;
  modal: InputSignal<SdSelectModalInfo<TModal> | undefined>;
  editModal: InputSignal<SdModalInfo<SdModalContentDef<boolean>> | undefined>;
  selectClass: InputSignal<string | undefined>;
  multiSelectionDisplayDirection: InputSignal<"vertical" | undefined>;
  getIsHiddenFn: InputSignal<(item: TItem, index: number) => boolean>;    // default (i) => i.__isHidden
  getSearchTextFn: InputSignal<(item: TItem, index: number) => string>;   // default (i) => i.__searchText
  displayOrderByFn: InputSignal<(item: TItem) => ... | undefined>;
}
```

검색 가능한 공유데이터 드롭다운(`sd-select` 래핑).

- `value` — 선택 key(single/multi). `items` — **required** 공유데이터 배열.
- `selectMode` — `"single"`(기본)/`"multi"`.
- `filterFn`/`filterFnParams` — 표시 항목 필터.
- `modal`/`editModal` — 선택/편집 모달 정의. `modal` 결과의 `selectedKeys` 를 `value` 에 반영.
- `useUndefined` — multi에서 "미지정" 옵션 표시(single은 `!required` 시 표시).
- `getIsHiddenFn`/`getSearchTextFn` — 숨김 판정/검색 텍스트(기본 `__isHidden`/`__searchText`).
- `displayOrderByFn` — 표시 정렬 키.
- 트리 — 항목에 `__parentKey` 있으면 자동 트리 모드(`getChildren` 연결, 부모는 직접 선택 불가).

### `SdSharedDataSelectButton<TItem, TMode, TModal>` (`sd-shared-data-select-button`)

```ts
class SdSharedDataSelectButton<...> {
  value: ModelSignal<SelectModeValue<TItem["__valueKey"] | undefined>[TMode]>;
  items: InputSignal<TItem[]>;                       // default []
  modal: InputSignal<SdSelectModalInfo<TModal>>;     // required
  selectMode: InputSignal<TMode>;                    // default "single"
  disabled, required, inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  itemTplRef: ...;                                   // SdItemOfTemplate, required contentChild
}
```

`sd-modal-select-button` 래퍼. 선택 항목을 `itemTplRef` 템플릿(필수)으로 `,&nbsp;` 구분 렌더하고 검색 버튼으로 `modal`(필수)을 연다.

### `SdSharedDataSelectList<TItem, TModal>` (`sd-shared-data-select-list`)

```ts
class SdSharedDataSelectList<TItem extends SharedDataBase<...>, TModal extends SdSelectModal<any>> {
  selectedItem: ModelSignal<TItem | undefined>;
  canChangeFn: InputSignal<(item: TItem | undefined) => boolean | Promise<boolean>>;  // default () => true
  items: InputSignal<TItem[]>;                       // required
  selectedIcon: InputSignal<string | undefined>;
  useUndefined: InputSignal<boolean>;
  filterFn: InputSignal<(item: TItem, index: number) => boolean>;
  modal: InputSignal<SdSelectModalInfo<TModal> | undefined>;
  header: InputSignal<string | undefined>;
  pageItemCount: InputSignal<number | undefined>;
}
```

단일 선택 검색 리스트(`sd-list` + 검색 + 페이지네이션). `selectedItem`(객체 ref) 양방향, `canChangeFn` 으로 변경 게이트(`setupModelHook`). `items` 변경 시 `__valueKey` 매칭으로 selectedItem ref 재동기화. 항목 재클릭 시 해제(toggle).

### `matchesSearchText`

```ts
function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean;
```

공백으로 나눈 검색어 토큰을 모두(AND, 대소문자 무시, substring) 포함하면 true. 빈 검색어는 항상 true.
