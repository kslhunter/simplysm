# Feature Components

Feature components are high-level, opinionated building blocks that combine multiple UI components with business logic patterns.

---

## SdAddressSearchModal

A modal for searching Korean postal addresses.

**Selector:** `sd-address-search-modal`

Implements `ISdModal<{ zonecode: string; address: string }>`. No inputs.

```typescript
const result = await this._modal.showAsync({
  title: "주소 검색",
  type: SdAddressSearchModal,
  inputs: {},
});
if (result) {
  this.address.set(result.address);
}
```

---

## SdBaseContainerControl

A smart container that renders different layouts based on the current view type (`"page"`, `"modal"`, or `"control"`). Handles busy state, access restriction messages, topbar with title, and modal bottom area.

**Selector:** `sd-base-container`

Used internally by `SdDataDetailControl` and `SdDataSheetControl`. Typically not used directly.

**Inputs:**

| Input         | Type          | Description                            |
| ------------- | ------------- | -------------------------------------- |
| `viewType`    | `TSdViewType` | Override view type                     |
| `initialized` | `boolean`     | Show content (undefined = always show) |
| `restricted`  | `boolean`     | Show access denied message             |
| `busy`        | `boolean`     | Show busy overlay                      |
| `busyMessage` | `string`      | Busy overlay message                   |
| `header`      | `string`      | Override title                         |

**Content projection:** `#contentTpl` (required), `#pageTopbarTpl`, `#modalBottomTpl`

---

## SdDataDetailControl

The detail form view for `AbsSdDataDetail`. Renders the form with save/refresh/delete actions and handles modal vs page vs control view types.

**Selector:** `sd-data-detail`

**Content projection:** `#contentTpl` (required), `#toolTpl`, `#prevTpl`, `#nextTpl`

Used with `AbsSdDataDetail`:

```typescript
@Component({
  selector: "app-product-detail",
  template: `
    <sd-data-detail>
      <ng-template #contentTpl>
        <sd-textfield [(value)]="data().name" [required]="true" />
      </ng-template>
    </sd-data-detail>
  `,
})
export class ProductDetailComponent extends AbsSdDataDetail<IProduct> {
  canUse = $computed(() => this._perms().canUse);
  canEdit = $computed(() => this._perms().canEdit);

  async load() {
    const data = await this._api.getProduct(this.id);
    return { data, info: { isNew: false } };
  }

  async submit(data: IProduct) {
    await this._api.saveProduct(data);
    return true;
  }
}
```

---

## AbsSdDataDetail

Abstract base class for detail components. Extend this to build a CRUD detail form.

```typescript
@Directive()
abstract class AbsSdDataDetail<T extends object, R = boolean> implements ISdModal<R> {
  // Required:
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  abstract load():
    | Promise<{ data: T; info: ISdDataDetailDataInfo }>
    | { data: T; info: ISdDataDetailDataInfo };

  // Optional overrides:
  canDelete?: Signal<boolean>;
  toggleDelete?(del: boolean): Promise<R | undefined> | R | undefined;
  submit?(data: T): Promise<R | undefined> | R | undefined;
  prepareRefreshEffect?(): void;

  // Provided:
  viewType: Signal<TSdViewType>;
  busyCount: WritableSignal<number>;
  busyMessage: WritableSignal<string | undefined>;
  initialized: WritableSignal<boolean>;
  data: WritableSignal<T>;
  dataInfo: WritableSignal<ISdDataDetailDataInfo | undefined>;
  close: OutputEmitterRef<R>;
}
```

**`ISdDataDetailDataInfo`:**

```typescript
interface ISdDataDetailDataInfo {
  isNew: boolean;
  isDeleted?: boolean;
  lastModifiedAt?: DateTime;
  lastModifiedBy?: string;
}
```

---

## SdDataSheetControl

The list/sheet view for `AbsSdDataSheet`. Renders a data grid with filter, pagination, toolbar, and selection.

**Selector:** `sd-data-sheet`

**Content projection:** `#filterTpl`, `#toolTpl`, `#beforeToolTpl`, `#pageTopbarTpl`, `#prevTpl`, `#modalBottomTpl`, `sd-data-sheet-column` elements

**Inputs:** `insertText`, `deleteText`, `restoreText`, `deleteIcon`, `restoreIcon`

---

## AbsSdDataSheet

Abstract base class for list/sheet components. Handles search, pagination, editing, Excel import/export, and selection modal integration.

```typescript
@Directive()
abstract class AbsSdDataSheet<
  TFilter extends Record<string, any>,
  TItem,
  TKey,
> implements ISdSelectModal<TItem> {
  // Required:
  abstract canUse: Signal<boolean>;
  abstract canEdit: Signal<boolean>;
  abstract editMode: "inline" | "modal" | undefined;
  abstract selectMode: InputSignal<"single" | "multi" | undefined>;
  abstract bindFilter(): TFilter;
  abstract itemPropInfo: ISdDataSheetItemPropInfo<TItem>;
  abstract getItemInfoFn: (item: TItem) => ISdDataSheetItemInfo<TKey>;
  abstract search(
    usePagination: boolean,
  ): Promise<ISdDataSheetSearchResult<TItem>> | ISdDataSheetSearchResult<TItem>;

  // Optional:
  hideTool?: Signal<boolean>;
  diffsExcludes?: string[];
  editItem?(item?: TItem): Promise<boolean | undefined> | boolean | undefined; // modal mode
  toggleDeleteItems?(del: boolean): Promise<boolean>; // modal delete
  newItem?(): Promise<TItem> | TItem; // inline mode
  submit?(diffs: TArrayDiffs2Result<TItem>[]): Promise<boolean> | boolean; // inline save
  downloadExcel?(items: TItem[]): Promise<void> | void;
  uploadExcel?(file: File): Promise<void> | void;
  prepareRefreshEffect?(): void;
}
```

**`ISdDataSheetItemPropInfo<TItem>`:**

```typescript
interface ISdDataSheetItemPropInfo<TItem> {
  isDeleted: keyof TItem; // boolean property
  // additional metadata properties
}
```

**`ISdDataSheetItemInfo<TKey>`:**

```typescript
interface ISdDataSheetItemInfo<TKey> {
  key: TKey;
  canEdit: boolean;
}
```

**`ISdDataSheetSearchResult<TItem>`:**

```typescript
interface ISdDataSheetSearchResult<TItem> {
  items: TItem[];
  totalCount?: number;
}
```

---

## SdDataSheetColumnDirective

Extends `SdSheetColumnDirective` with an `edit` input, used inside `SdDataSheetControl`.

**Selector:** `sd-data-sheet-column`

**Additional Input:** `edit: boolean` (default `false`) — enables inline edit mode for the column.

---

## SdDataSelectButtonControl

The select button view for `AbsSdDataSelectButton`. Renders an `SdAdditionalButtonControl` with a clear button and a modal open button.

**Selector:** `sd-data-select-button`

**Content projection:** `ng-template[itemOf]` — optional item display template.

---

## AbsSdDataSelectButton

Abstract base class for select-button components. Opens a modal to pick a value.

```typescript
@Directive()
abstract class AbsSdDataSelectButton<TItem extends object, TKey, TMode extends "single" | "multi"> {
  abstract modal: Signal<TSdSelectModalInfo<ISdSelectModal<any>>>;
  abstract load(keys: TKey[]): Promise<TItem[]> | TItem[];

  // Provided inputs:
  value: ModelSignal<TSelectModeValue<TKey>[TMode]>;
  disabled: InputSignal<boolean>;
  required: InputSignal<boolean>;
  inset: InputSignal<boolean>;
  size: InputSignal<"sm" | "lg" | undefined>;
  selectMode: InputSignal<TMode>;

  // Computed:
  isNoValue: Signal<boolean>;
  selectedItems: WritableSignal<TItem[]>;
}
```

---

## ISdSelectModal

Interface for modals used as selection pickers.

```typescript
interface ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

---

## TSdSelectModalInfo

Type alias for modal info compatible with `AbsSdDataSelectButton`.

```typescript
type TSdSelectModalInfo<T extends ISdSelectModal<any>> = ISdModalInfo<
  T,
  "selectMode" | "selectedItemKeys"
>;
```

---

## ISelectModalOutputResult

Return type from selection modals.

```typescript
interface ISelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}
```

---

## SdPermissionTableControl

Renders a hierarchical permission table with checkboxes. Checking a parent auto-checks children.

**Selector:** `sd-permission-table`

```html
<sd-permission-table [items]="permissionDefs()" [(value)]="userPerms" />
```

**Inputs:**

| Input      | Type                              | Description                  |
| ---------- | --------------------------------- | ---------------------------- |
| `items`    | `ISdPermission<TModule>[]`        | Permission hierarchy         |
| `value`    | `Record<string, boolean>` (model) | Permission map keyed by code |
| `disabled` | `boolean`                         | Readonly mode                |

---

## SdSharedDataSelectControl

A `SdSelectControl` pre-wired for shared data items. Includes search, optional "unspecified" option, parent-child hierarchy, and modal integration.

**Selector:** `sd-shared-data-select`

```html
<sd-shared-data-select [items]="categories()" [(value)]="selectedCategoryKey" [required]="true">
  <ng-template [itemOf]="categories()" let-item>{{ item.name }}</ng-template>
</sd-shared-data-select>
```

**Key inputs:**

| Input                     | Type                                    | Description                       |
| ------------------------- | --------------------------------------- | --------------------------------- |
| `items`                   | `TItem[]` (required)                    | Shared data items                 |
| `value` (model)           | `TSelectModeValue<TItem["__valueKey"]>` | Selected key(s)                   |
| `disabled`                | `boolean`                               | Disabled state                    |
| `required`                | `boolean`                               | Required validation               |
| `useUndefined`            | `boolean`                               | Show "unspecified" option         |
| `selectMode`              | `"single" \| "multi"`                   | Selection mode                    |
| `modal`                   | `TSdSelectModalInfo<TModal>`            | Open modal button in dropdown     |
| `editModal`               | `ISdModalInfo<ISdModal<boolean>>`       | Edit modal button                 |
| `filterFn`                | `(item, index) => boolean`              | Custom filter                     |
| `parentKeyProp`           | `string`                                | Property for hierarchical display |
| `inset`, `inline`, `size` | —                                       | Standard display options          |

**Content projection:** `ng-template[itemOf]` — item display template.

---

## SdSharedDataSelectButtonControl

An `AbsSdDataSelectButton` pre-wired for shared data items. Opens a modal for selection.

**Selector:** `sd-shared-data-select-button`

```html
<sd-shared-data-select-button
  [items]="users()"
  [modal]="{ type: UserSelectModal, inputs: {} }"
  [(value)]="selectedUserId"
>
  <ng-template [itemOf]="users()" let-item>{{ item.name }}</ng-template>
</sd-shared-data-select-button>
```

Extends `AbsSdDataSelectButton`. Items must implement `ISharedDataBase<number>`.

**Inputs:** `items: TItem[]` (required), `modal: TSdSelectModalInfo<TModal>` (required), plus all `AbsSdDataSelectButton` inputs.

---

## SdSharedDataSelectListControl

A list-based selector for shared data items with search, pagination, and optional modal trigger.

**Selector:** `sd-shared-data-select-list`

```html
<sd-shared-data-select-list
  [items]="products()"
  [(selectedItem)]="selected"
  [selectedIcon]="tablerCheck"
>
  <ng-template [itemOf]="products()" let-item>{{ item.name }}</ng-template>
</sd-shared-data-select-list>
```

**Key inputs:**

| Input           | Type                                    | Description                 |
| --------------- | --------------------------------------- | --------------------------- |
| `items`         | `TItem[]` (required)                    | Shared data items           |
| `selectedItem`  | `TItem` (model)                         | Currently selected item     |
| `selectedIcon`  | `string`                                | Icon shown on selected item |
| `useUndefined`  | `boolean`                               | Show "unspecified" option   |
| `filterFn`      | `(item, index) => boolean`              | Custom filter               |
| `modal`         | `TSdSelectModalInfo`                    | External modal button       |
| `header`        | `string`                                | List header text            |
| `canChangeFn`   | `(item) => boolean \| Promise<boolean>` | Guard before selection      |
| `pageItemCount` | `number`                                | Enables pagination          |

**Content projection:** `ng-template[itemOf]` (required), `#headerTpl`, `#filterTpl`, `#undefinedTpl`

---

## SdThemeSelectorControl

A dropdown button for selecting the application theme and dark mode.

**Selector:** `sd-theme-selector`

```html
<sd-theme-selector />
```

No inputs. Uses `SdThemeProvider` to manage theme and dark mode state.
