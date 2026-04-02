# Features

High-level feature components: address search, base container, data sheet/detail views, and shared-data-backed controls.

## `SdAddressSearchModal`

Modal component that embeds the Daum Postcode widget for Korean address lookup. Implements `ISdModal<IAddress>`.

```typescript
@Component({ selector: "sd-address-search-modal" })
class SdAddressSearchModal implements ISdModal<IAddress>, OnInit {
  close = output<IAddress>();
  initialized = signal(false);
}
```

## `IAddress`

```typescript
interface IAddress {
  postNumber: string | undefined;
  address: string | undefined;
  buildingName: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postNumber` | `string \| undefined` | Postal (zone) code |
| `address` | `string \| undefined` | Full road/lot address |
| `buildingName` | `string \| undefined` | Building name |

## `SdPermissionTableControl`

Matrix table component that displays a hierarchical permission structure with use/edit checkboxes. Groups and leaf items are rendered with depth-based coloring and collapse/expand support.

```typescript
@Component({ selector: "sd-permission-table" })
class SdPermissionTableControl<TModule> {
  value = model<Record<string, boolean>>({});
  items = input<ISdPermission<TModule>[]>([]);
  disabled = input(false, { transform: booleanAttribute });
}
```

| Input/Model | Type | Description |
|-------------|------|-------------|
| `value` | `Record<string, boolean>` | Two-way binding of permission key-value map (e.g., `{ "admin.users.use": true }`) |
| `items` | `ISdPermission<TModule>[]` | Hierarchical permission tree from `SdAppStructureProvider` |
| `disabled` | `boolean` | Disables all checkboxes |

Behaviors:
- Unchecking "use" automatically unchecks "edit" for the same item
- "edit" checkbox is disabled when "use" is unchecked
- Checking/unchecking a parent cascades to all children
- Collapsible groups with depth-based theme coloring (info/warning/success cycle)

## `SdBaseContainerControl`

Layout shell that wraps a page or modal. Handles busy state, access restriction, and auto-resolves title from app structure or modal context.

```typescript
@Component({ selector: "sd-base-container" })
class SdBaseContainerControl {
  viewType = input<TSdViewType>();
  header = input<string>();
  initialized = input<boolean | undefined>(undefined);
  restricted = input(false, { transform: booleanAttribute });
  busy = input(false, { transform: booleanAttribute });
  busyMessage = input<string>();
}
```

| Input | Type | Description |
|-------|------|-------------|
| `viewType` | `TSdViewType \| undefined` | Override view type |
| `header` | `string \| undefined` | Explicit title override |
| `initialized` | `boolean \| undefined` | Controls rendering gate |
| `restricted` | `boolean` | Shows "no permission" message |
| `busy` | `boolean` | Shows busy spinner |
| `busyMessage` | `string \| undefined` | Message shown during busy |

Content templates: `#contentTpl` (required), `#pageTopbarTpl`, `#modalBottomTpl`.

## `SdDataSheetControl`

Presentation component for data sheet views. Must be placed inside an `AbsSdDataSheet`-extending component. Delegates all logic to the parent.

```typescript
@Component({ selector: "sd-data-sheet" })
class SdDataSheetControl {
  insertText = input<string>();
  deleteText = input<string>();
  restoreText = input<string>();
  deleteIcon = input(tablerEraser);
  restoreIcon = input(tablerRestore);
}
```

Content templates: `#pageTopbarTpl`, `#prevTpl`, `#filterTpl`, `#beforeToolTpl`, `#toolTpl`, `#modalBottomTpl`. Content children: `SdDataSheetColumnDirective`.

## `AbsSdDataSheet`

Abstract base directive for data sheet screens. Manages state, change tracking, pagination, sorting, and CRUD.

```typescript
@Directive()
abstract class AbsSdDataSheet<TFilter, TItem, TKey> {
  // Abstract (must implement)
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  abstract editMode: "inline" | "modal" | undefined;
  abstract selectMode: InputSignal<"single" | "multi" | undefined>;
  abstract itemPropInfo: ISdDataSheetItemPropInfo<TItem>;
  abstract getItemInfoFn: (item: TItem) => ISdDataSheetItemInfo<TKey>;
  abstract bindFilter(): TFilter;
  abstract search(usePagination: boolean): Promise<ISdDataSheetSearchResult<TItem>> | ISdDataSheetSearchResult<TItem>;

  // Optional abstract
  hideTool?: Signal<boolean>;
  diffsExcludes?: string[];
  prepareRefreshEffect?(): void;
  editItem?(item?: TItem): Promise<boolean | undefined> | boolean | undefined;
  toggleDeleteItems?(del: boolean): Promise<boolean>;
  newItem?(): Promise<TItem> | TItem;
  submit?(diffs: ArrayOneWayDiffResult<TItem>[]): Promise<boolean> | boolean;
  downloadExcel?(items: TItem[]): Promise<void> | void;
  uploadExcel?(file: File): Promise<void> | void;

  // State
  busyCount = signal(0);
  busyMessage = signal<string | undefined>(undefined);
  initialized = signal(false);
  items = signal<TItem[]>([]);
  selectedItems = signal<TItem[]>([]);
  selectedItemKeys = model<TKey[]>([]);
  summaryData = signal<Partial<TItem>>({});
  page = signal(0);
  pageLength = signal(0);
  sortingDefs = signal<ISortingDef[]>([]);
  filter = signal<TFilter>({} as TFilter);
  lastFilter = signal<TFilter>({} as TFilter);

  // Output
  close = output<{ selectedItemKeys: TKey[]; selectedItems: TItem[] }>();
  submitted = output<boolean>();

  // Public methods
  checkIgnoreChanges(): boolean;
  doFilterSubmit(): void;
  doRefresh(): void;
  async refresh(): Promise<void>;
  async doAddItem(): Promise<void>;
  async doSubmit(opt?): Promise<void>;
  doToggleDeleteItem(item: TItem): void;
  async doEditItem(item?: TItem): Promise<void>;
  async doToggleDeleteItems(del: boolean): Promise<void>;
  async doDownloadExcel(): Promise<void>;
  async doUploadExcel(): Promise<void>;
  doModalConfirm(): void;
  doModalCancel(): void;
}
```

## `ISdDataSheetItemPropInfo`

Maps property names for metadata columns.

```typescript
interface ISdDataSheetItemPropInfo<I> {
  isDeleted: (keyof I & string) | undefined;
  lastModifiedAt: (keyof I & string) | undefined;
  lastModifiedBy: (keyof I & string) | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `isDeleted` | `(keyof I & string) \| undefined` | Property name for soft-delete flag |
| `lastModifiedAt` | `(keyof I & string) \| undefined` | Property name for last modified timestamp |
| `lastModifiedBy` | `(keyof I & string) \| undefined` | Property name for last modifier |

## `ISdDataSheetItemInfo`

Per-item capability flags.

```typescript
interface ISdDataSheetItemInfo<K> {
  key: K;
  canSelect: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `K` | Item unique key |
| `canSelect` | `boolean` | Whether item can be selected |
| `canEdit` | `boolean` | Whether item can be edited |
| `canDelete` | `boolean` | Whether item can be deleted |

## `ISdDataSheetSearchResult`

Return shape of `AbsSdDataSheet.search()`.

```typescript
interface ISdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `I[]` | Result items |
| `pageLength` | `number \| undefined` | Total page count for pagination |
| `summary` | `Partial<I> \| undefined` | Optional summary row data |

## `SdDataSheetColumnDirective`

Extends `SdSheetColumnDirective` with an additional `edit` input for modal edit mode.

```typescript
@Directive({ selector: "sd-data-sheet-column" })
class SdDataSheetColumnDirective extends SdSheetColumnDirective {
  edit = input(false, { transform: booleanAttribute });
}
```

## `SdDataDetailControl`

Presentation component for detail/form screens. Delegates logic to parent `AbsSdDataDetail`.

```typescript
@Component({ selector: "sd-data-detail" })
class SdDataDetailControl { }
```

Content templates: `#contentTpl` (required), `#toolTpl`, `#prevTpl`, `#nextTpl`.

## `AbsSdDataDetail`

Abstract base directive for detail (form) screens. Manages data load, change detection, save, and delete.

```typescript
@Directive()
abstract class AbsSdDataDetail<T, R = boolean> implements ISdModal<R> {
  // Abstract (must implement)
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  abstract load(): Promise<{ data: T; info: ISdDataDetailDataInfo }> | { data: T; info: ISdDataDetailDataInfo };

  // Optional abstract
  canDelete?: Signal<boolean>;
  prepareRefreshEffect?(): void;
  toggleDelete?(del: boolean): Promise<R | undefined> | R | undefined;
  submit?(data: T): Promise<R | undefined> | R | undefined;

  // State
  busyCount = signal(0);
  busyMessage = signal<string | undefined>(undefined);
  initialized = signal(false);
  data = signal<T>({} as T);
  dataInfo = signal<ISdDataDetailDataInfo | undefined>(undefined);

  // Output
  close = output<R>();

  // Public methods
  checkIgnoreChanges(): boolean;
  async doRefresh(): Promise<void>;
  async refresh(): Promise<void>;
  async doToggleDelete(del: boolean): Promise<void>;
  async doSubmit(opt?): Promise<void>;
}
```

## `ISdDataDetailDataInfo`

Metadata about the current detail record.

```typescript
interface ISdDataDetailDataInfo {
  isNew: boolean;
  isDeleted: boolean;
  lastModifiedAt: DateTime | undefined;
  lastModifiedBy: string | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `isNew` | `boolean` | Whether this is a new (unsaved) record |
| `isDeleted` | `boolean` | Whether this record is soft-deleted |
| `lastModifiedAt` | `DateTime \| undefined` | Last modification timestamp |
| `lastModifiedBy` | `string \| undefined` | Last modifier identity |

## `SdDataSelectButtonControl`

Presentation component for modal-backed select buttons. Delegates to parent `AbsSdDataSelectButton`.

```typescript
@Component({ selector: "sd-data-select-button" })
class SdDataSelectButtonControl { }
```

Content template: `SdItemOfTemplateDirective` for rendering each selected item.

## `AbsSdDataSelectButton`

Abstract base directive for select-button components backed by a modal.

```typescript
@Directive()
abstract class AbsSdDataSelectButton<TItem, TKey> {
  abstract modal: Signal<TSdSelectModalInfo<ISdSelectModal<TKey>>>;
  abstract load(keys: TKey[]): Promise<TItem[]> | TItem[];

  value = model<TSelectModeValue<TKey>>();
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<"single" | "multi">("single");

  selectedItems = signal<TItem[]>([]);
  isNoValue = computed(/* true when value is null/empty */);

  async doShowModal(options?: ISdModalOptions): Promise<void>;
  doInitialValue(): void;
}
```

## `SdSharedDataSelectControl`

Dropdown select backed by shared data items. Supports single/multi selection, tree hierarchy, search, and modal selection.

```typescript
@Component({ selector: "sd-shared-data-select" })
class SdSharedDataSelectControl<TItem extends ISharedDataBase<string | number>> {
  value = model<TSelectModeValue<TItem["__valueKey"]>>();
  items = input.required<TItem[]>();
  disabled = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  useUndefined = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  selectMode = input<"single" | "multi">("single");
  filterFn = input<(item: TItem, index: number, ...params: any[]) => boolean>();
  filterFnParams = input<any[]>();
  modal = input<TSdSelectModalInfo<any>>();
  editModal = input<ISdModalInfo<ISdModal<boolean>>>();
  selectClass = input<string>();
  multiSelectionDisplayDirection = input<"vertical">();
  getIsHiddenFn = input<(item: TItem, index: number) => boolean>();
  getSearchTextFn = input<(item: TItem, index: number) => string>();
  displayOrderKeyProp = input<string>();
}
```

Content templates: `SdItemOfTemplateDirective`, `#undefinedTpl`.

## `SdSharedDataSelectButtonControl`

Concrete `AbsSdDataSelectButton` for shared data with numeric keys.

```typescript
@Component({ selector: "sd-shared-data-select-button" })
class SdSharedDataSelectButtonControl<TItem extends ISharedDataBase<number>> extends AbsSdDataSelectButton<TItem, number> {
  items = input<TItem[]>([]);
  modal = input.required<TSdSelectModalInfo<ISdSelectModal<any>>>();
}
```

Content template: `SdItemOfTemplateDirective` (required).

## `SdSharedDataSelectListControl`

List-style single-selection control for shared data. Supports search, pagination, and modal launch.

```typescript
@Component({ selector: "sd-shared-data-select-list" })
class SdSharedDataSelectListControl<TItem extends ISharedDataBase<string | number>> {
  selectedItem = model<TItem>();
  canChangeFn = input<(item: TItem | undefined) => boolean | Promise<boolean>>(() => true);
  items = input.required<TItem[]>();
  selectedIcon = input<string>();
  useUndefined = input(false, { transform: booleanAttribute });
  filterFn = input<(item: TItem, index: number) => boolean>();
  modal = input<TSdSelectModalInfo<any>>();
  header = input<string>();
  pageItemCount = input<number>();

  select(item: TItem | undefined): void;
  toggle(item: TItem | undefined): void;
}
```

Content templates: `#headerTpl`, `#filterTpl`, `SdItemOfTemplateDirective`, `#undefinedTpl`.
