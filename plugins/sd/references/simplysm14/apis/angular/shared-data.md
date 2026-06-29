# @simplysm/angular — 공유 마스터 데이터·선택 매니저

공유 마스터 데이터 등록/갱신/선택 UI와 시트·리스트에서 쓰는 selection/sorting/expanding manager 군이다. 공유데이터 사용법: [client-shared-data.md](../../manuals/client-shared-data.md), 실시간 이벤트 사용법: [event.md](../../manuals/event.md)

## shared-data provider

### `SharedDataBase`, `SharedDataInfo`, `SharedDataHandle`, `SdSharedDataChangeEvent`

```ts
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
  get(key: T["__valueKey"] | undefined): T | undefined;
}
const SdSharedDataChangeEvent: EventDef<{ name: string; filter: unknown }, (string | number)[] | undefined>;
```

- `__valueKey` — 항목 식별 key. select value와 incremental refresh key로 쓴다.
- `__searchText` — 검색어 매칭 대상 문자열.
- `__isHidden` — 기본 hidden/비활성 여부.
- `__parentKey` — tree형 선택 UI에서 부모 key. 있으면 root/children 구조로 표시한다.
- `serviceKey` — `SdServiceClientFactoryProvider.get(serviceKey)` 에 넘길 연결 key.
- `getter` — 전체 또는 `changeKeys` 일부 항목을 조회하는 함수.
- `changeKeys` — 변경된 key 배열. undefined면 전체 reload로 취급한다.
- `filter` — 같은 name의 shared data event 구독을 구분할 selector metadata.
- `orderBy` — partial update merge 뒤 정렬할 key selector.
- `SharedDataHandle.items` — 현재 공유 데이터 배열 signal.
- `SharedDataHandle.get` — key가 nullish면 undefined, 아니면 `__valueKey` map에서 item 반환.
- `SdSharedDataChangeEvent` — `{ name, filter }` info로 구독하고 변경 key 배열 또는 undefined를 data로 전달한다.

### `SdSharedDataProvider<T>`

```ts
abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string | number>>> {
  loadingCount: WritableSignal<number>;
  abstract initialize(): void;
  register<K extends string & keyof T>(name: K, info: SharedDataInfo<T[K]>): void;
  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]>;
  emitAsync<K extends string & keyof T>(name: K, changeKeys?: (string | number)[]): Promise<void>;
  wait(): Promise<void>;
}
```

- `loadingCount` — 로딩/이벤트 갱신 중인 항목 수 signal.
- `initialize` — 앱 provider가 항목들을 `register` 해야 하는 abstract method.
- `register.name` — 공유 데이터 이름. 기존 이름을 다시 등록하면 이전 listener를 제거하고 generation을 증가시켜 이전 async 결과를 무시한다.
- `register.info` — 조회/서비스/filter/orderBy 설정.
- `getHandle.name` — 등록된 이름. 미등록이면 throw한다.
- `getHandle` 동작 — 최초 접근 또는 re-register 후 `needsReload` 상태면 비동기 load와 event listener 등록을 시작하고 handle을 반환한다.
- `emitAsync.name` — 등록된 이름. 미등록이면 throw한다.
- `emitAsync.changeKeys` — event data로 보낼 변경 key 배열. 생략하면 수신측이 전체 reload한다.
- `wait` — `loadingCount() <= 0` 이 될 때까지 기다린다.

## shared-data 선택 UI

### `matchesSearchText`

```ts
function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean
```

- `itemText` — 검색 대상 문자열. lower-case로 비교한다.
- `searchQuery` — 공백으로 나뉜 검색어. 비어 있거나 undefined면 true.
- 동작 — 모든 term이 `itemText.toLowerCase()` 안에 포함되어야 true다.

### `SdSharedDataSelect<TItem, TMode, TModal>` — `<sd-shared-data-select>`

```ts
class SdSharedDataSelect<TItem extends SharedDataBase<string | number>, TMode extends keyof SelectModeValue<TItem>, TModal extends SdSelectModal<any>> {
  value: ModelSignal<SelectModeValue<TItem["__valueKey"] | undefined>[TMode] | undefined>;
  items: InputSignal<TItem[]>;
  disabled: InputSignal<boolean>;
  required: InputSignal<boolean>;
  useUndefined: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  inline: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  selectMode: InputSignal<TMode>;
  filterFn: InputSignal<((item: TItem, index: number, ...params: any[]) => boolean) | undefined>;
  filterFnParams: InputSignal<any[] | undefined>;
  modal: InputSignal<SdSelectModalInfo<TModal> | undefined>;
  editModal: InputSignal<SdModalInfo<SdModalContentDef<boolean>> | undefined>;
  selectClass: InputSignal<string | undefined>;
  multiSelectionDisplayDirection: InputSignal<"vertical" | undefined>;
  getIsHiddenFn: InputSignal<(item: TItem, index: number) => boolean>;
  getSearchTextFn: InputSignal<(item: TItem, index: number) => string>;
  displayOrderByFn: InputSignal<((item: TItem) => string | number | DateOnly | DateTime | Time | undefined) | undefined>;
}
```

- `value` — selected key model. single이면 key/undefined, multi면 key 배열.
- `items` — 후보 shared-data item 배열.
- `disabled` — 내부 `SdSelect` disabled.
- `required` — 내부 `SdSelect` required. single 미지정 항목 표시 조건에도 쓰인다.
- `useUndefined` — multi mode에서 undefined 선택 항목을 표시할지 결정한다.
- `inset`/`inline`/`size` — 내부 `SdSelect` input으로 전달한다.
- `selectMode` — `"single"` 또는 `"multi"`; 내부 select와 modal 주입에 쓴다. 기본 `"single"`.
- `filterFn` — rootDisplayItems 계산 시 항목 필터 함수.
- `filterFnParams` — `filterFn(item, index, ...params)` 에 펼쳐 전달할 값 배열.
- `modal` — 검색 button으로 열 선택 modal. 현재 `selectMode`/`selectedKeys` 를 주입하고 결과로 value를 갱신한다.
- `editModal` — 편집 button으로 열 관리 modal. 결과로 value를 바꾸지 않는다.
- `selectClass` — 내부 select content class.
- `multiSelectionDisplayDirection` — 내부 select의 같은 input으로 전달한다.
- `getIsHiddenFn` — 숨김 여부 계산. 기본은 `item.__isHidden`.
- `getSearchTextFn` — 검색 문자열 계산. 기본은 `item.__searchText`.
- `displayOrderByFn` — root/children 표시 정렬 함수.
- `undefinedTpl` — content child template이 있으면 미지정 항목 표시로 사용한다.
- `ng-template[itemOf]` — item 표시 template으로 사용한다.
- tree 동작 — 어떤 item이라도 `__parentKey` 가 있으면 parent map을 만들고 root는 `__parentKey == null`, children은 parent key 매칭으로 렌더한다.

### `SdSharedDataSelectButton<TItem, TMode, TModal>` — `<sd-shared-data-select-button>`

```ts
class SdSharedDataSelectButton<TItem extends SharedDataBase<string | number>, TMode extends keyof SelectModeValue<TItem>, TModal extends SdSelectModal<any>> {
  value: ModelSignal<SelectModeValue<TItem["__valueKey"] | undefined>[TMode] | undefined>;
  items: InputSignal<TItem[]>;
  modal: InputSignal<SdSelectModalInfo<TModal>>;
  selectMode: InputSignal<TMode>;
  disabled: InputSignal<boolean>;
  required: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
}
```

- `value` — selected key model. 내부 `SdModalSelectButton` 에 양방향 전달한다.
- `items` — 선택된 key를 표시 item으로 변환할 후보 배열.
- `modal` — required 선택 modal 정보.
- `selectMode` — `"single"` 또는 `"multi"`; 기본 `"single"`.
- `disabled`/`required`/`inset`/`size` — 내부 `SdModalSelectButton` input으로 전달한다.
- display — content child `ng-template[itemOf]` 로 선택된 item들을 렌더하고, 다중 선택은 comma separator를 넣는다.

### `SdSharedDataSelectList<TItem, TModal>` — `<sd-shared-data-select-list>`

```ts
class SdSharedDataSelectList<TItem extends SharedDataBase<string | number>, TModal extends SdSelectModal<any>> {
  selectedItem: ModelSignal<TItem | undefined>;
  canChangeFn: InputSignal<(item: TItem | undefined) => boolean | Promise<boolean>>;
  items: InputSignal<TItem[]>;
  selectedIcon: InputSignal<string | undefined>;
  useUndefined: InputSignal<boolean>;
  filterFn: InputSignal<((item: TItem, index: number) => boolean) | undefined>;
  modal: InputSignal<SdSelectModalInfo<TModal> | undefined>;
  header: InputSignal<string | undefined>;
  pageItemCount: InputSignal<number | undefined>;
}
```

- `selectedItem` — 선택된 item model.
- `canChangeFn` — `selectedItem` 변경 전 가드. false/Promise false면 변경하지 않는다.
- `items` — 후보 item 배열. hidden item은 기본 필터에서 제외한다.
- `selectedIcon` — `SdListItem.selectedIcon` 으로 전달할 icon.
- `useUndefined` — true면 “미지정” list item을 렌더하고 선택 시 undefined로 set한다.
- `filterFn` — hidden/search 필터 뒤 추가 필터 함수.
- `modal` — 우측 header action으로 열 선택 modal. 결과 첫 key에 맞는 item을 selectedItem으로 set한다.
- `header` — 상단 header 텍스트.
- `pageItemCount` — 있으면 `SdPagination` 으로 page 단위 slice를 사용한다.
- `headerTpl`/`filterTpl`/`undefinedTpl` — content child template이 있으면 header/filter/undefined 영역에 렌더한다.
- `ng-template[itemOf]` — item row template.
- sync 동작 — `items` 가 바뀌면 현재 selectedItem과 같은 `__valueKey` 의 새 item instance로 갱신한다.

## selection/sorting/expanding manager

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
  select(item: TItem): void;
  deselect(item: TItem): void;
  toggle(item: TItem): void;
  toggleAll(): void;
  isSelected(item: TItem): boolean;
}
```

- `displayItems` — 선택 대상 row 배열 signal.
- `selectedKeys` — 선택 key 배열 signal.
- `selectMode` — undefined면 선택 기능 없음, `"single"` 은 하나만, `"multi"` 는 누적 선택.
- `getItemSelectableFn` — item별 선택 가능 여부. true면 가능, string이면 불가 사유, false면 불가.
- `trackByFn` — item과 index에서 key를 계산한다.
- `hasSelectable` — selectMode가 nullish가 아니면 true.
- `isAllSelected` — 선택 가능한 item이 있고 모두 selected면 true.
- `getSelectable` — selection 가능이면 true, 사유 문자열이면 string, 선택 모드 없거나 key nullish면 undefined.
- `getCanChangeFn` — checkbox guard용 `() => getSelectable(item) === true` 함수.
- `select` — single은 `[key]` 로 set, multi는 중복이 없으면 append.
- `deselect` — key deep equal(`obj.equal`) 기준으로 제거.
- `toggle` — selected면 deselect, 아니면 select.
- `toggleAll` — 모두 선택 상태면 selectable key들을 제거, 아니면 누락 key를 append.
- `isSelected` — selectedKeys 중 key deep equal인 항목이 있으면 true.

### `SortingDef` / `useSortingManager`

```ts
interface SortingDef { key: string; desc: boolean }
function useSortingManager(options: { sorts: WritableSignal<SortingDef[]> }): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
}
```

- `SortingDef.key` — 정렬 대상 property key.
- `SortingDef.desc` — false면 ascending, true면 descending.
- `options.sorts` — 정렬 정의 배열 signal.
- `defMap` — key별 desc와 다중정렬 순번 text. sort가 2개 이상이면 indexText는 1-base 문자열.
- `toggle.key` — 토글할 sort key.
- `toggle.multiple` — true면 기존 sort 배열에 추가/수정/제거, false면 해당 key만 단일 정렬로 토글한다.
- `sort` — sort 정의 순서대로 item property를 비교한다. nullish는 앞, string은 localeCompare, number는 차, 그 외는 String 비교.

### `ExpandItemDef<T>` / `useExpandingManager<T>`

```ts
interface ExpandItemDef<T> {
  item: T;
  parentDef: ExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
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
}
```

- `ExpandItemDef.item` — 해당 row item.
- `parentDef` — 부모 item 정의. root면 undefined.
- `hasChildren` — children 배열이 있고 길이가 0보다 큰지 여부.
- `depth` — root 0부터의 깊이.
- `binding.items` — root item 배열.
- `expandedItems` — 펼쳐진 item 배열 signal.
- `getChildrenFn` — item과 sorted sibling index로 children을 반환한다.
- `sort` — 각 level item 배열을 순회 전 정렬하는 함수.
- `displayItems` — tree 전체를 pre-order flatten한 item 배열.
- `hasExpandable` — children이 있는 item이 하나라도 있으면 true.
- `isAllExpanded` — 펼칠 수 있는 item이 있고 모두 expanded면 true.
- `toggle` — expandedItems 배열에서 item을 toggle한다.
- `toggleAll` — 모두 펼침이면 비우고, 아니면 expandable item 전부로 set한다.
- `isVisible` — 모든 parent가 expanded 상태면 true.
- `def` — item 정의를 반환하고 없으면 throw한다.
