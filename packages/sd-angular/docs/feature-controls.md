# Feature Controls

Feature components are high-level, opinionated building blocks that combine multiple UI components with business logic patterns for common enterprise application views.

---

## SdAddressSearchModal

**Type:** `@Component` | **Selector:** `sd-address-search-modal`

Korean address search modal using the Daum Postcode API. Implements `ISdModal<IAddress>`.

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `close` | `OutputEmitterRef<IAddress>` | Emits selected address data |

### Public Members

| Member | Type | Description |
|--------|------|-------------|
| `initialized` | `SdWritableSignal<boolean>` | Indicates when the API is loaded |

**IAddress:**

| Field | Type | Description |
|-------|------|-------------|
| `postNumber` | `string \| undefined` | Postal/zip code |
| `address` | `string \| undefined` | Full address string |
| `buildingName` | `string \| undefined` | Building name |

---

## SdBaseContainerControl

**Type:** `@Component` | **Selector:** `sd-base-container`

Base container that adapts its layout based on view type (page/modal/control). In page mode, it wraps content in `sd-topbar-container` with a title bar. In modal mode, it provides content and optional bottom area. Includes busy indicator.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `viewType` | `TSdViewType` | No | Auto-detected | Override view type |
| `header` | `string` | No | Auto from app structure | Title text override |
| `initialized` | `boolean \| ""` | No | `undefined` | Initialization state |
| `restricted` | `boolean \| ""` | No | `false` | Show restricted access message |
| `busy` | `boolean \| ""` | No | `false` | Show loading overlay |
| `busyMessage` | `string` | No | -- | Loading message text |

### Content Templates

- `#contentTpl` (required) -- Main content area
- `#pageTopbarTpl` -- Additional topbar content (page mode only)
- `#modalBottomTpl` -- Bottom action area (modal mode only)

---

## SdDataDetailControl

**Type:** `@Component` | **Selector:** `sd-data-detail`

CRUD detail form view with save (Ctrl+S) and refresh (Ctrl+Alt+L) toolbar buttons. Integrates with `SdBaseContainerControl` for layout. Handles unsaved change warnings and form submission.

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `close` | `OutputEmitterRef<R>` | Emits when the view closes (modal) |

### Host Bindings

- `(sdRefreshCommand)` -- Triggers refresh
- `(sdSaveCommand)` -- Triggers save

---

## SdDataSelectButtonControl

**Type:** `@Component` | **Selector:** `sd-data-select-button`

Button that displays selected items and opens a modal for selection. Supports single/multi selection modes with a clear button. Used as a child component inside a parent that provides selection state.

### Content Templates

Accepts `SdItemOfTemplateDirective` content child for custom item rendering.

### ISdSelectModal

```typescript
interface ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

### TSdSelectModalInfo

```typescript
type TSdSelectModalInfo<T extends ISdSelectModal<any>> = ISdModalInfo<
  T,
  "selectMode" | "selectedItemKeys"
>;
```

### ISelectModalOutputResult

```typescript
interface ISelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}
```

---

## SdDataSheetColumnDirective

**Type:** `@Directive` | **Selector:** `sd-data-sheet-column`

Extended `SdSheetColumnDirective` with an `edit` flag. Used inside `SdDataSheetControl` to mark columns that require edit permissions.

### Inputs

Inherits all inputs from `SdSheetColumnDirective` plus:

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `edit` | `boolean \| ""` | No | `false` | Whether this column requires edit permission |

---

## SdDataSheetControl

**Type:** `@Component` | **Selector:** `sd-data-sheet`

Full CRUD data sheet view with toolbar (save, refresh, add, search, upload, download Excel). Integrates sorting, selection, pagination, and change tracking. Combines `SdBaseContainerControl` + `SdSheetControl`.

### Host Bindings

- `(sdRefreshCommand)` -- Triggers refresh
- `(sdSaveCommand)` -- Triggers save

---

## SdPermissionTableControl

**Type:** `@Component` | **Selector:** `sd-permission-table`

Hierarchical permission table with checkboxes. Renders a tree of `ISdPermission` items with expand/collapse. Checking a parent toggles all children.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `items` | `ISdPermission<TModule>[]` | No | `[]` | Permission tree items |
| `disabled` | `boolean \| ""` | No | `false` | Disable all checkboxes |

### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `Record<string, boolean>` | Permission key-value record |

---

## SdSharedDataSelectButtonControl

**Type:** `@Component` | **Selector:** `sd-shared-data-select-button`

Select button for shared data items. Wraps modal selection with `SdDataSelectButtonControl` pattern.

### Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| `items` | `TItem[]` | No | Available items (default: `[]`) |
| `modal` | `TSdSelectModalInfo<TModal>` | Yes | Modal configuration |

---

## SdSharedDataSelectListControl

**Type:** `@Component` | **Selector:** `sd-shared-data-select-list`

Scrollable list for selecting shared data items with search, pagination, and optional modal for editing/searching.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `items` | `TItem[]` | Yes | -- | Available items |
| `selectedIcon` | `string` | No | -- | Icon for selected state |
| `useUndefined` | `boolean \| ""` | No | `false` | Allow undefined selection |
| `filterFn` | `(item, index) => boolean` | No | -- | Filter function |
| `modal` | `TSdSelectModalInfo<TModal>` | No | -- | Optional modal for search |
| `header` | `string` | No | -- | Header text |
| `pageItemCount` | `number` | No | -- | Items per page for pagination |
| `canChangeFn` | `(item) => boolean \| Promise<boolean>` | No | `() => true` | Guard function |

### Models

| Model | Type | Description |
|-------|------|-------------|
| `selectedItem` | `TItem` | Currently selected item |

---

## SdSharedDataSelectControl

**Type:** `@Component` | **Selector:** `sd-shared-data-select`

Dropdown select for shared data items with search, tree support, and optional modal for extended selection/editing.

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `items` | `TItem[]` | Yes | -- | Available items |
| `disabled` | `boolean \| ""` | No | `false` | Disable the control |
| `required` | `boolean \| ""` | No | `false` | Mark as required |
| `useUndefined` | `boolean \| ""` | No | `false` | Show undefined option |
| `inset` | `boolean \| ""` | No | `false` | Inset style |
| `inline` | `boolean \| ""` | No | `false` | Inline display |
| `size` | `"sm" \| "lg"` | No | -- | Size variant |
| `selectMode` | `"single" \| "multi"` | No | `"single"` | Selection mode |
| `filterFn` | `(item, index, ...params) => boolean` | No | -- | Filter function |
| `filterFnParams` | `any[]` | No | -- | Additional filter parameters |
| `modal` | `TSdSelectModalInfo<TModal>` | No | -- | Modal for extended search |
| `editModal` | `ISdModalInfo<ISdModal<boolean>>` | No | -- | Modal for editing items |
| `selectClass` | `string` | No | -- | CSS class for select |
| `multiSelectionDisplayDirection` | `"vertical" \| "horizontal"` | No | -- | Multi-selection layout |
| `getIsHiddenFn` | `(item, index) => boolean` | No | `item.__isHidden` | Hidden items filter |
| `getSearchTextFn` | `(item, index) => string` | No | `item.__searchText` | Search text extractor |
| `parentKeyProp` | `string` | No | -- | Property for tree parent key |
| `displayOrderKeyProp` | `string` | No | -- | Property for display ordering |

### Models

| Model | Type | Description |
|-------|------|-------------|
| `value` | `TSelectModeValue<TItem["__valueKey"] \| undefined>[TMode]` | Selected value(s) |

---

## SdThemeSelectorControl

**Type:** `@Component` | **Selector:** `sd-theme-selector`

Theme picker control that lets users select between `compact`, `mobile`, and `kiosk` themes, and toggle dark mode. Changes are applied immediately via `SdThemeProvider`.
