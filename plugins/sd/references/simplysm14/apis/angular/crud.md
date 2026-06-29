# @simplysm/angular — CRUD 골격·권한표·상태 프리셋

목록/단건 화면 shell, 권한 table, 상태 preset 저장 UI 군이다. `sd-crud-list`/`sd-crud-detail` 사용법: [client-crud.md](../../manuals/client-crud.md), 권한 구조 사용법: [client-app-structure.md](../../manuals/client-app-structure.md), 설정 저장 사용법: [client-system-config.md](../../manuals/client-system-config.md)

## base/detail/list container

### `SdBaseContainer` — `<sd-base-container>`

```ts
class SdBaseContainer {
  ready: ModelSignal<boolean>;
  initialized: InputSignal<boolean>;
  busyCount: ModelSignal<number>;
  restricted: InputSignal<boolean>;
  viewType: InputSignal<SdViewType>;
}
```

- `ready` — restricted 처리 또는 shared-data wait 완료 후 true로 set되는 model.
- `initialized` — false면 content를 렌더하지 않고 busy container만 유지한다.
- `busyCount` — 0보다 크면 내부 busy container를 busy로 표시한다.
- `restricted` — true면 권한 없음 안내를 표시하고 ready를 true로 set한다.
- `viewType` — `"page"` 는 topbar shell을 만들고, `"modal"`/`"control"` 은 content만 렌더한다.
- `topbarTpl` — page topbar 우측 content template.
- `commandTpl` — content 상단 command bar template.
- `contentTpl` — main content template.
- `bottomCommandTpl` — content 하단 command bar template.
- shared-data 동작 — optional `SdSharedDataProvider` 가 있으면 `wait()` 를 `SdToastProvider.try` 로 감싸고 busyCount를 증감한다.

### `SdCrudDetail` — `<sd-crud-detail>`

사용법: [client-crud.md](../../manuals/client-crud.md)

```ts
class SdCrudDetail {
  ready: ModelSignal<boolean>;
  initialized: InputSignal<boolean>;
  busyCount: ModelSignal<number>;
  restricted: InputSignal<boolean>;
  readonly: InputSignal<boolean>;
  viewType: InputSignal<SdViewType>;
  submit: OutputEmitterRef<void>;
}
```

- `ready`/`initialized`/`busyCount`/`restricted`/`viewType` — 그대로 `SdBaseContainer` 에 전달한다.
- `readonly` — true면 저장 버튼과 `SdForm` wrapper를 생략하고 content를 그대로 렌더한다.
- `submit` — 내부 `SdForm.formSubmit` 에서 emit한다.
- `commandTpl` — 저장 버튼 옆/상단 command 영역에 추가할 template.
- `contentTpl` — form body template. readonly가 아니면 `SdForm` 으로 감싼다.
- `bottomCommandTpl` — modal 하단 좌측 template. modal이면 우측 “확인” 버튼을 함께 렌더한다.
- command key — host `SdCommandDirective.sdSaveCommand` 에서 form submit을 요청한다.

### `SdCrudList<TItem, TKey>` — `<sd-crud-list>`

사용법: [client-crud.md](../../manuals/client-crud.md)

```ts
class SdCrudList<TItem, TKey> {
  ready: ModelSignal<boolean>;
  initialized: InputSignal<boolean>;
  busyCount: ModelSignal<number>;
  restricted: InputSignal<boolean>;
  canCreate: InputSignal<boolean>;
  canEdit: InputSignal<boolean>;
  canDelete: InputSignal<boolean>;
  inlineEdit: InputSignal<boolean>;
  viewType: InputSignal<SdViewType>;
  selectMode: InputSignal<"single" | "multi" | undefined>;
  key: InputSignal<string>;
  filterSubmit: OutputEmitterRef<void>;
  submit: OutputEmitterRef<void>;
  create: OutputEmitterRef<void>;
  delete: OutputEmitterRef<TItem[]>;
  restore: OutputEmitterRef<TItem[]>;
  items: InputSignal<TItem[]>;
  selectedKeys: ModelSignal<NonNullable<TKey>[]>;
  currDeletedItems: InputSignal<TItem[]>;
  currentPage: ModelSignal<number>;
  totalPageCount: InputSignal<number>;
  itemsPerPage: InputSignal<number>;
  visiblePageCount: InputSignal<number>;
  sorts: ModelSignal<SortingDef[]>;
  trackByFn: InputSignal<(item: TItem) => TKey>;
  getItemSelectableFn: InputSignal<((item: TItem) => boolean | string) | undefined>;
}
```

- `ready`/`initialized`/`busyCount`/`restricted`/`viewType` — `SdBaseContainer` 에 전달한다.
- `canCreate` — true면 “등록” button을 렌더하고 click에서 `create` emit. 기본 true.
- `canEdit` — true이고 `inlineEdit` true면 save button/form wrapper를 렌더한다. 기본 true.
- `canDelete` — true면 sheet selectMode 기본값이 `"multi"` 이고 삭제/복구 UI를 렌더한다. 기본 true.
- `inlineEdit` — true면 sheet를 `SdForm` 으로 감싸고 delete column을 추가할 수 있다. false면 조회/선택 전용 sheet로 렌더한다. 기본 true.
- `selectMode` — modal 선택 모드. `"single"` 은 선택 즉시 modal close, `"multi"` 는 하단 확인 button으로 close한다.
- `key` — 내부 sheet key를 `${key}-sheet` 로 만든다.
- `filterSubmit` — filter form submit에서 emit한다.
- `submit` — inline edit form submit에서 emit한다.
- `create` — 등록 button click에서 emit한다.
- `delete` — 선택 삭제 또는 row delete column click에서 대상 item 배열을 emit한다.
- `restore` — 선택 복구 또는 row 복구 click에서 대상 item 배열을 emit한다.
- `items` — sheet rows.
- `selectedKeys` — sheet selected key model.
- `currDeletedItems` — 삭제 상태 item 배열. 포함 item은 취소선 style, 삭제/복구 button 상태 계산에 쓰인다.
- `currentPage`/`totalPageCount`/`itemsPerPage`/`visiblePageCount` — 내부 sheet pagination inputs/models.
- `sorts` — 내부 sheet sort model.
- `trackByFn` — item에서 key를 계산하는 required input.
- `getItemSelectableFn` — 내부 sheet 선택 가능 함수.
- `commandTpl`/`filterTpl`/`toolTpl`/`bottomCommandTpl` — 상단 command, filter form, tool bar, 하단 command template.
- `sd-sheet-column` content children — 내부 sheet `columnControlsInput` 으로 전달된다.

## 권한 table

### `SdPermissionTable<TModule>` — `<sd-permission-table>`

사용법: [client-app-structure.md](../../manuals/client-app-structure.md)

```ts
class SdPermissionTable<TModule> {
  value: ModelSignal<Record<string, boolean>>;
  items: InputSignal<SdPermission<TModule>[]>;
  disabled: InputSignal<boolean>;
  collapsedItems: WritableSignal<Set<string>>;
}
```

- `value` — `{ "code.chain.use": boolean, "code.chain.edit": boolean }` 형태 권한 체크 model.
- `items` — `SdAppStructureProvider.getPermissionsByStructure()` 결과 permission tree.
- `disabled` — true면 checkbox를 disabled하고 edit disabled 계산도 true가 된다.
- `collapsedItems` — 접힌 permission code set.
- 권한 표시 — `perms` 또는 하위에 해당 type 권한이 있을 때만 “사용”/“편집” checkbox를 표시한다.
- edit 규칙 — use 권한이 존재하고 체크되어 있지 않으면 edit checkbox를 disabled한다.
- cascade 규칙 — group checkbox 변경은 하위 권한까지 재귀 적용한다. use를 false로 바꾸면 edit도 false로 만든다.

## 상태 프리셋

### `SdStatePresetDef<TState>` / `SdStatePreset<TState>` — `<sd-state-preset>`

사용법: [client-system-config.md](../../manuals/client-system-config.md)

```ts
interface SdStatePresetDef<TState> {
  name: string;
  state: TState;
}
class SdStatePreset<TState> {
  key: InputSignal<string>;
  state: ModelSignal<TState>;
  size: InputSignal<"sm" | "lg" | undefined>;
}
```

- `SdStatePresetDef.name` — 프리셋 표시명과 track key.
- `SdStatePresetDef.state` — 저장된 state snapshot.
- `key` — system config resource key. host tag와 합쳐 저장 key가 된다.
- `state` — 저장/복원할 현재 상태 model. 저장 시 `obj.clone(state())`, 적용 시 clone을 다시 set한다.
- `size` — `"sm"`/`"lg"` padding 크기.
- add 동작 — `SdPromptModal` 로 이름을 받고 중복 이름이면 warning toast, 아니면 현재 state를 presets에 append한다.
- preset click — 현재 state와 다르면 preset state clone을 set한다.
- save click — 해당 preset의 state를 현재 state clone으로 교체한다.
- delete click — `SdConfirmModal` 확인 뒤 preset을 제거한다.
