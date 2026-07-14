# @simplysm/angular — CRUD 골격·권한표·상태 프리셋

목록/단건 화면 shell, 권한 table, 상태 preset 저장 UI 군임. 모두 standalone · OnPush · `ViewEncapsulation.None`. `sd-crud-list`/`sd-crud-detail` 사용법: [client-crud.md](../../manuals/client-crud.md), 권한 구조 사용법: [client-app-structure.md](../../manuals/client-app-structure.md), 설정 저장 사용법: [client-system-config.md](../../manuals/client-system-config.md)

`viewType: SdViewType`(`"page" | "modal" | "control"`)은 보통 `injectViewTypeSignal()` 값을 넣어 화면 종류별 레이아웃(topbar 유무, 저장 버튼 위치 등)을 분기함. 자세히: [routing-appstructure.md](./routing-appstructure.md).

## `SdBaseContainer` (`sd-base-container`)

```ts
class SdBaseContainer {
  ready: ModelSignal<boolean>; // default false
  initialized: InputSignal<boolean>; // default false
  busyCount: ModelSignal<number>; // default 0
  restricted: InputSignal<boolean>; // default false
  viewType: InputSignal<SdViewType>; // required
}
```

화면 공통 골격(busy·권한·topbar·content·command 바). 컨텐츠 슬롯은 ng-template 참조 변수로 투영.

- `initialized` — false면 아무것도 안 그림. true가 되어야 렌더.
- `busyCount` — `initialized && busyCount>0` 이면 busy overlay.
- `restricted` — true면 content 대신 `'{viewTitle}'에 대한 사용권한이 없습니다...` 경고 화면.
- `viewType` — **required**. `"page"` 면 `sd-topbar-container`/`sd-topbar`(타이틀+`#topbarTpl`)로 감싸고, `"modal"`/`"control"` 이면 content만.
- `ready`(model) — `SdSharedDataProvider` 주입 시 공유데이터 로드 완료 후, 없으면 즉시 true(restricted면 즉시 true).
- 슬롯 — `#topbarTpl`(page에서 타이틀 옆 버튼), `#commandTpl`(상단 command 바), `#contentTpl`(본문), `#bottomCommandTpl`(하단 우측 command 바).

## `SdCrudList<TItem, TKey>` (`sd-crud-list`)

```ts
class SdCrudList<TItem, TKey> {
  ready: ModelSignal<boolean>; initialized: InputSignal<boolean>; busyCount: ModelSignal<number>;
  restricted: InputSignal<boolean>;
  canCreate, canEdit, canDelete, inlineEdit: InputSignal<boolean>;   // default true
  viewType: InputSignal<SdViewType>;                                 // required
  selectMode: InputSignal<"single" | "multi" | undefined>;
  key: InputSignal<string>;                                          // required
  items: InputSignal<TItem[]>;                                       // default []
  selectedKeys: ModelSignal<NonNullable<TKey>[]>;                    // default []
  currDeletedItems: InputSignal<TItem[]>;                            // default []
  currentPage: ModelSignal<number>; totalPageCount: InputSignal<number>;
  itemsPerPage: InputSignal<number>; visiblePageCount: InputSignal<number>;  // default 10
  sorts: ModelSignal<SortingDef[]>;
  trackByFn: InputSignal<(item: TItem) => TKey>;                     // required
  getItemSelectableFn: InputSignal<((item: TItem) => boolean | string) | undefined>;
  // outputs
  filterSubmit: OutputEmitterRef<void>;
  submit: OutputEmitterRef<void>;
  create: OutputEmitterRef<void>;
  delete: OutputEmitterRef<TItem[]>;
  restore: OutputEmitterRef<TItem[]>;
}
```

`sd-sheet` 기반 목록 화면 shell(`SdBaseContainer` 감쌈). hostDirective `SdCommandDirective` 로 `Ctrl+S` → 인라인 편집 폼 submit.

- `key`/`trackByFn` — **required**. key는 시트 설정 영속화(`<key>-sheet`), trackByFn은 행/선택 key.
- `canCreate`/`canEdit`/`canDelete`/`inlineEdit` — 기본 true. `canCreate` "등록" 버튼, `canEdit&&inlineEdit` 면 저장 버튼+편집 폼, `canDelete` "선택 삭제"/"선택 복구" + 행 삭제 컬럼.
- `selectMode` — `"single"`(클릭 선택, 모달에서 1개 선택 시 자동 닫힘), `"multi"`(모달에 확인 버튼), `undefined`(canDelete면 multi fallback). single이면 bulk 삭제 그룹 숨김.
- `items`/`currDeletedItems` — 행 데이터/삭제 표시 항목(취소선 셀 스타일).
- `selectedKeys`(model)/`currentPage`/`sorts` — 선택 key/페이지/정렬(시트와 양방향).
- `totalPageCount`/`itemsPerPage`/`visiblePageCount` — 페이징(`useAutoSort` 는 `totalPageCount===0` 일 때).
- `filterSubmit` — 조회 폼 submit. `submit` — 인라인 편집 저장. `create` — 등록 버튼. `delete(items)`/`restore(items)` — 선택 삭제/복구.
- 슬롯 — `#commandTpl`, `#filterTpl`(조회 폼 필드), `#toolTpl`(툴바 버튼), `#bottomCommandTpl`, 투영 `<sd-sheet-column>`(시트로 전달).

## `SdCrudDetail` (`sd-crud-detail`)

```ts
class SdCrudDetail {
  ready: ModelSignal<boolean>;
  initialized: InputSignal<boolean>;
  busyCount: ModelSignal<number>;
  restricted: InputSignal<boolean>;
  readonly: InputSignal<boolean>; // default false
  viewType: InputSignal<SdViewType>; // required
  submit: OutputEmitterRef<void>;
}
```

단건 상세 화면 shell(`SdBaseContainer` 감쌈). hostDirective `SdCommandDirective` 로 `Ctrl+S` → 폼 submit.

- `readonly` — false(기본)면 content를 `sd-form` 으로 감싸고 저장 버튼 표시, true면 폼/저장 버튼 없이 plain 렌더.
- `viewType` — 저장 버튼 위치 분기: `"page"` topbar, `"control"` command 바, `"modal"` 하단 "확인" 버튼.
- `submit` — 저장(폼 submit / Ctrl+S / 확인 버튼)에서 emit. (delete/prev/next 전용 output 없음 — 투영 command 템플릿으로 제공.)
- 슬롯 — `#commandTpl`, `#contentTpl`(상세 필드), `#bottomCommandTpl`.

## `SdPermissionTable<TModule>` (`sd-permission-table`)

```ts
class SdPermissionTable<TModule> {
  value: ModelSignal<Record<string, boolean>>; // default {} (key "<codeChain>.<use|edit>")
  items: InputSignal<SdPermission<TModule>[]>; // default []
  disabled: InputSignal<boolean>; // default false
}
```

권한 트리(`SdPermission`)를 표로 렌더해 "사용"/"편집" 체크박스를 토글하는 컴포넌트.

- `value`(model) — 권한 맵. key는 `"<codeChain.join('.')>.<use|edit>"`, 값은 checked boolean. 토글 시 `obj.clone` 후 갱신.
- `items` — 권한 트리(`SdPermission<TModule>[]`, [routing-appstructure.md](./routing-appstructure.md) 참조). leaf는 `perms`, 그룹은 children.
- `disabled` — true면 모든 체크박스 비활성.
- 규칙 — `edit` 는 `use` 가 체크돼야 활성. `use` 해제 시 `edit` 자동 false. 그룹 토글은 모든 하위로 전파. 깊이별 색·접기(collapse) 지원.

## `SdStatePreset<TState>` (`sd-state-preset`)

```ts
class SdStatePreset<TState> {
  key: InputSignal<string>; // required
  state: ModelSignal<TState>; // required (model.required)
  size: InputSignal<"sm" | "lg" | undefined>;
}
interface SdStatePresetDef<TState> {
  name: string;
  state: TState;
}
```

현재 화면 상태(`state`)를 이름 붙여 저장/적용하는 프리셋 UI. system config(`sd-state-preset.<key>`)에 `SdStatePresetDef[]` 영속화(`injectSdSystemConfigResource`).

- `key` — **required**. 프리셋 저장 key.
- `state`(model.required) — 저장/적용 대상 상태. 프리셋 클릭 시 `state.set(clone(preset.state))` 로 적용(output 없음, model로 반영).
- `size` — `"sm"`/`"lg"`/미지정 padding(외형만).
- 동작 — 별표 추가 버튼(`SdPromptModal` 로 이름 입력, 중복 시 toast 경고), 행별 저장(현재 state 덮어쓰기)·삭제(`SdConfirmModal`).
