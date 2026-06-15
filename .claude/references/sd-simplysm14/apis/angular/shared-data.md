# @simplysm/angular — 공유 마스터 데이터·선택 매니저

고객사·품목 등 자주 참조하는 마스터 데이터를 한 번 등록해 어느 화면에서든 공유 시그널로 쓰고, 그 데이터를 선택하는 드롭다운/버튼/리스트 컨트롤과, 시트·리스트의 선택/정렬/펼침 상태를 관리하는 composable 매니저를 제공하는 군. 등록·항목 추가·선택 모달·좌측목록+우측상세 절차는 [client-shared-data.md](../manuals/client-shared-data.md) 참조.

## `SdSharedDataProvider<T>`

`@Injectable()` **abstract**. 앱이 상속해 `initialize()` 에서 데이터를 `register` (root 별칭 등록 필요). `T extends Record<string, SharedDataBase<string|number>>`.

- `loadingCount: WritableSignal<number>` (초기 0) — 로드 중 카운트.
- `abstract initialize(): void` — 하위에서 `register` 호출.
- `register<K>(name: K, info: SharedDataInfo<T[K]>): void` — 데이터 항목 등록(lazy; 즉시 로드 안 함). 재등록 시 기존 리스너 제거·generation 증가로 stale 이벤트 무시.
- `getHandle<K>(name: K): SharedDataHandle<T[K]>` — 핸들 반환(첫 접근 시 lazy 로드·리스너 등록). 미등록 시 throw.
- `emitAsync<K>(name: K, changeKeys?: (string|number)[]): Promise<void>` — 변경 통지. `changeKeys` 생략 = 전체 재로드, 지정 = 그 키들만 부분 갱신. 저장·삭제 후 호출해 공유데이터를 최신화.
- `wait(): Promise<void>` — `loadingCount <= 0` 까지 대기.

타입:
- `SharedDataBase<TKey extends string|number>` — 항목 매직 필드: `__valueKey: TKey`(키) / `__searchText: string`(검색용) / `__isHidden: boolean`(숨김) / `__parentKey?: TKey`(트리 부모). getter select 결과에 포함 필수.
- `SharedDataInfo<T>` — `{ serviceKey: string; getter: (changeKeys?) => Promise<T[]>; filter?: unknown; orderBy?: (item) => string|number|DateOnly|DateTime|Time|undefined }`. `getter(changeKeys)` 는 changeKeys 주어지면 그 키만 재조회(incremental).
- `SharedDataHandle<T>` — `{ items: Signal<T[]>; get(key): T | undefined }`. 화면이 `useSharedSignal(name)` 으로 받아 `items()`·`get(id)` 사용.
- `SdSharedDataChangeEvent` — `defineEvent<{ name; filter }, (string|number)[] | undefined>("SdSharedDataChange")`. provider 내부 통지 이벤트.

## `SdSharedDataSelect<TItem, TMode, TModal>` — `<sd-shared-data-select>`

검색·트리(`__parentKey`) 가능한 공유데이터 드롭다운(`sd-select` 래핑). 폼 입력의 공유 데이터 선택지에 사용.

- `items: input.required<TItem[]>` — 소스 목록(`sharedX.items()`).
- `value: model<...>` — single 이면 `키|undefined`, multi 면 `키[]`.
- `selectMode: TMode` (기본 `"single"`) — `"single"`/`"multi"`.
- `required: boolean` — true(single)면 "미지정" 옵션 숨김.
- `useUndefined: boolean` — multi 에서 "미지정" 항목 표시.
- `disabled`/`inset`/`inline`/`size: "sm"|"lg"`/`selectClass`/`multiSelectionDisplayDirection: "vertical"`.
- `filterFn: (item, index, ...params) => boolean` + `filterFnParams: any[]` — 표시 전 필터.
- `getIsHiddenFn` (기본 `(item) => item.__isHidden`) / `getSearchTextFn` (기본 `(item) => item.__searchText`) / `displayOrderByFn` — 숨김/검색텍스트/정렬 커스터마이즈.
- `modal: SdSelectModalInfo<TModal>` — 설정 시 검색 모달 버튼(선택 갱신). `editModal: SdModalInfo<SdModalContentDef<boolean>>` — 관리 전용 모달 버튼(선택 안 바꿈). (선택/관리 모달 규약은 [client-shared-data.md](../manuals/client-shared-data.md))
- 콘텐츠: `[itemOf]` 항목 템플릿, `#undefinedTpl`("미지정" 라벨).

```html
<sd-shared-data-select [items]="sharedCustomers.items()" [(value)]="data().customerId" (valueChange)="mark(data)">
  <ng-template [itemOf]="sharedCustomers.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select>
```

## `SdSharedDataSelectButton<TItem, TMode, TModal>` — `<sd-shared-data-select-button>`

모달로 선택하는 버튼(`sd-modal-select-button` 래핑).

- `items: TItem[]` (기본 `[]`) — 선택 항목 표시 해석용.
- `modal: input.required<SdSelectModalInfo<TModal>>` — 선택 모달(필수).
- `value: model<SelectModeValue<string|number>[TMode]>` / `selectMode: TMode`(기본 `"single"`).
- `disabled`/`required`/`inset`/`size: "sm"|"lg"`.
- 콘텐츠: `[itemOf]` 항목 템플릿(필수).

## `SdSharedDataSelectList<TItem, TModal>` — `<sd-shared-data-select-list>`

검색·페이지 가능한 단일 선택 리스트. 좌측목록+우측상세 레이아웃의 마스터로 사용.

- `selectedItem: model<TItem>` — 현재 선택(항목 객체). `canChangeFn` 가드(`setupModelHook`). `items` 변경 시 `__valueKey` 로 재해석 자동 동기.
- `items: input.required<TItem[]>`.
- `canChangeFn: (item: TItem | undefined) => boolean | Promise<boolean>` (기본 `() => true`) — 선택 변경 가드(다른 마스터로 전환 전 미저장 변경 확인 등).
- `selectedIcon: string` — 선택 항목 아이콘. `useUndefined: boolean` — "미지정" 항목. `header: string` — 헤더 텍스트. `pageItemCount: number` — `>0` 이면 그 크기로 페이지네이션.
- `filterFn: (item, index) => boolean`.
- `modal: SdSelectModalInfo<TModal>` — 설정 시 외부 링크 모달 버튼(목록 관리·선택).
- 콘텐츠: `#headerTpl` / `#filterTpl`(기본 검색 필드 대체) / `[itemOf]` / `#undefinedTpl`.
- 메서드: `select(item)` / `toggle(item)` / `onModalButtonClick()`.

```html
<sd-shared-data-select-list class="flex-min" [items]="sharedRoles.items()" [(selectedItem)]="selectedRole" [header]="'역할'" [modal]="{ type: RoleList, title: '역할', inputs: {} }">
  <ng-template [itemOf]="sharedRoles.items()" let-item="item">{{ item.name }}</ng-template>
</sd-shared-data-select-list>
```

## `matchesSearchText`

```ts
function matchesSearchText(itemText: string, searchQuery: string | undefined): boolean
```

- `searchQuery` 를 공백으로 분리한 모든 단어가 `itemText` 에 (대소문자 무시) 부분 포함되면 `true`(AND 매칭). 단어 없으면 `true`. 공유데이터 select 의 검색 매칭에 사용.

## 선택/정렬/펼침 매니저 (composable)

시트·리스트가 내부적으로 쓰는 상태 매니저. 직접 사용은 커스텀 그리드를 만들 때.

### `useSelectionManager<TItem, TKey>`

```ts
useSelectionManager(options: {
  displayItems: Signal<TItem[]>; selectedKeys: WritableSignal<TKey[]>;
  selectMode: Signal<"single"|"multi"|undefined>;
  getItemSelectableFn: Signal<((item) => boolean|string) | undefined>;
  trackByFn: Signal<(item, index) => TKey>;
})
```

반환: `hasSelectable`/`isAllSelected: Signal<boolean>`, `getSelectable(item): true | string | undefined`(불가=undefined, 가능=true, 사유=string), `getCanChangeFn(item)`, `select`/`deselect`/`toggle`/`toggleAll`/`isSelected`. single 은 교체, multi 는 추가(`obj.equal` 중복 제거).

### `useSortingManager`

```ts
useSortingManager(options: { sorts: WritableSignal<SortingDef[]> })
```

반환: `defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>`(다중 정렬 시 `indexText` "1"…"n"), `toggle(key, multiple)`(none→asc→desc→제거; `multiple=false` 면 전체 교체), `sort<T>(items): T[]`(안정 다중 키 정렬; null < non-null). `SortingDef` = `{ key: string; desc: boolean }`.

### `useExpandingManager<T>`

```ts
useExpandingManager(binding: {
  items: Signal<T[]>; expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item, index) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
})
```

반환: `displayItems: Signal<T[]>`(평탄화·부모→자식 순), `hasExpandable`/`isAllExpanded: Signal<boolean>`, `toggle(item)`/`toggleAll()`/`isVisible(item)`(모든 조상 펼침 시 true)/`def(item): ExpandItemDef<T>`. `ExpandItemDef<T>` = `{ item: T; parentDef: ExpandItemDef<T> | undefined; hasChildren: boolean; depth: number }`.
