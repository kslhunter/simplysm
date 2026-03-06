# Features

High-level composite components and utilities that combine multiple primitives into application-ready patterns.

---

## `AddressSearchContent`

Dialog content component for Korean address search via the Daum Postcode API. Intended to be used inside a `DialogProvider`-managed dialog.

```tsx
import { AddressSearchContent } from "@simplysm/solid";

const dialog = useDialog();
const result = await dialog.show(AddressSearchContent, {});
// result: { postNumber, address, buildingName } | undefined
```

**`AddressSearchResult`**

| Property | Type | Description |
|----------|------|-------------|
| `postNumber` | `string \| undefined` | Postal code |
| `address` | `string \| undefined` | Street/lot address |
| `buildingName` | `string \| undefined` | Building name |

---

## `SharedDataSelect`

`Select` component pre-wired to a `SharedDataAccessor`. Accepts keys instead of items; resolves items internally. Supports optional search dialog and custom actions.

```tsx
import { SharedDataSelect } from "@simplysm/solid";

<SharedDataSelect data={shared.users} value={selectedId} onValueChange={setSelectedId}>
  <SharedDataSelect.ItemTemplate>
    {(user, index, depth) => <span>{user.name}</span>}
  </SharedDataSelect.ItemTemplate>
</SharedDataSelect>
```

**`SharedDataSelectProps<TItem, TKey, TDialogProps>`**

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data source (required) |
| `value` | `TKey \| TKey[]` | Selected key(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `multiple` | `boolean` | Multiple selection |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless inset style |
| `filterFn` | `(item, index) => boolean` | Item filter |
| `dialog` | `Component<TDialogProps>` | Search dialog component |
| `dialogOptions` | `DialogShowOptions` | Options forwarded to `dialog.show()` |
| `dialogProps` | `UserDialogProps<TDialogProps>` | Extra props passed to the dialog component |
| `children` | `JSX.Element` | Compound sub-components (required) |

Sub-components: `SharedDataSelect.ItemTemplate`, `SharedDataSelect.Action`

---

## `SharedDataSelectButton`

`DataSelectButton` pre-wired to a `SharedDataAccessor`. Opens a selection dialog and renders selected items using a provided render function.

```tsx
import { SharedDataSelectButton } from "@simplysm/solid";

<SharedDataSelectButton
  data={shared.users}
  value={selectedId}
  onValueChange={setSelectedId}
  dialog={UserSelectDialog}
>
  {(user) => <span>{user.name}</span>}
</SharedDataSelectButton>
```

**`SharedDataSelectButtonProps<TItem, TDialogProps>`**

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data source (required) |
| `value` | `TKey \| TKey[]` | Selected key(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `multiple` | `boolean` | Multiple selection |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless inset style |
| `dialog` | `Component<TDialogProps>` | Selection dialog component (required) |
| `dialogOptions` | `DialogShowOptions` | Options forwarded to `dialog.show()` |
| `dialogProps` | `UserDialogProps<TDialogProps>` | Extra props passed to the dialog component |
| `children` | `(item: TItem) => JSX.Element` | Item renderer (required) |

---

## `SharedDataSelectList`

Searchable list pre-wired to a `SharedDataAccessor` with pagination support. Renders an `(unspecified)` option when not required.

```tsx
import { SharedDataSelectList } from "@simplysm/solid";

<SharedDataSelectList data={shared.users} value={selectedUser} onValueChange={setSelectedUser} pageSize={20}>
  <SharedDataSelectList.ItemTemplate>
    {(user) => <span>{user.name}</span>}
  </SharedDataSelectList.ItemTemplate>
</SharedDataSelectList>
```

**`SharedDataSelectListProps<TItem>`**

| Prop | Type | Description |
|------|------|-------------|
| `data` | `SharedDataAccessor<TItem>` | Shared data source (required) |
| `value` | `TItem \| undefined` | Selected item |
| `onValueChange` | `(value) => void` | Value change callback |
| `required` | `boolean` | Required (no unspecified option) |
| `disabled` | `boolean` | Disabled state |
| `filterFn` | `(item, index) => boolean` | Item filter |
| `canChange` | `(item) => boolean \| Promise<boolean>` | Change guard |
| `pageSize` | `number` | Items per page (enables pagination) |
| `header` | `JSX.Element` | Header content |
| `class` | `string` | Custom class |
| `style` | `JSX.CSSProperties` | Custom style |

Sub-components: `SharedDataSelectList.ItemTemplate`, `SharedDataSelectList.Filter`

Also exports: `SharedDataSelectListContextValue`

---

## `DataSelectButton`

Generic trigger button that opens a selection dialog and displays the selected items. Loads items by key via the `load` function.

```tsx
import { DataSelectButton } from "@simplysm/solid";

<DataSelectButton
  value={selectedKey}
  onValueChange={setSelectedKey}
  load={(keys) => fetchItemsByKey(keys)}
  dialog={MySelectionDialog}
  renderItem={(item) => <span>{item.name}</span>}
/>
```

**`DataSelectButtonProps<TItem, TKey, TDialogProps>`**

| Prop | Type | Description |
|------|------|-------------|
| `value` | `TKey \| TKey[]` | Selected key(s) |
| `onValueChange` | `(value) => void` | Value change callback |
| `load` | `(keys: TKey[]) => TItem[] \| Promise<TItem[]>` | Load items by keys (required) |
| `dialog` | `Component<TDialogProps>` | Selection dialog component (required) |
| `renderItem` | `(item: TItem) => JSX.Element` | Item display renderer (required) |
| `multiple` | `boolean` | Multiple selection |
| `required` | `boolean` | Required validation |
| `disabled` | `boolean` | Disabled state |
| `size` | `ComponentSize` | Trigger size |
| `inset` | `boolean` | Borderless inset style |
| `validate` | `(value) => string \| undefined` | Custom validation |
| `lazyValidation` | `boolean` | Show error only after blur |
| `dialogOptions` | `DialogShowOptions` | Options forwarded to `dialog.show()` |
| `dialogProps` | `UserDialogProps<TDialogProps, TKey>` | Extra props passed to the dialog component |

The dialog receives `SelectDialogBaseProps<TKey>` and must close with `DataSelectDialogResult<TKey>`: `{ selectedKeys: TKey[] }`.

Also exports: `SelectDialogBaseProps`, `DataSelectDialogResult`, `DialogPropsField`

---

## `CrudSheet`

Full-featured CRUD data grid integrating `DataSheet` with filter, toolbar, inline editing, dialog editing, Excel import/export, row selection, and keyboard shortcuts (`Ctrl+S` save, `Ctrl+Alt+L` refresh).

```tsx
import { CrudSheet } from "@simplysm/solid";

<CrudSheet
  search={async (filter, page, sorts) => fetchData(filter, page, sorts)}
  getItemKey={(item) => item.id}
  inlineEdit={{
    newItem: () => ({ id: undefined, name: "" }),
    submit: async (diffs) => await saveDiffs(diffs),
    deleteProp: "isDeleted",
  }}
>
  <CrudSheet.Filter>
    {(filter, setFilter) => (
      <FormGroup.Item label="Name">
        <TextInput value={filter.name} onValueChange={(v) => setFilter("name", v)} />
      </FormGroup.Item>
    )}
  </CrudSheet.Filter>
  <CrudSheet.Column key="name" header="Name">
    {(ctx) => (
      <TextInput value={ctx.item.name} onValueChange={(v) => ctx.setItem("name", v)} inset />
    )}
  </CrudSheet.Column>
</CrudSheet>
```

**`CrudSheetProps<TItem, TFilter>`** — either `inlineEdit` or `dialogEdit` (mutually exclusive):

| Prop | Type | Description |
|------|------|-------------|
| `search` | `(filter, page, sorts) => Promise<SearchResult<TItem>>` | Data fetch function (required) |
| `getItemKey` | `(item) => string \| number \| undefined` | Row key extractor (required) |
| `storageKey` | `string` | Key for persisting column config |
| `editable` | `boolean` | Enable editing (default: true) |
| `isItemEditable` | `(item) => boolean` | Per-item edit permission |
| `isItemDeletable` | `(item) => boolean` | Per-item delete permission |
| `isItemDeleted` | `(item) => boolean` | Returns true if item is in deleted state |
| `isItemSelectable` | `(item) => boolean \| string` | Per-item selection permission |
| `lastModifiedAtProp` | `string` | Property path for last-modified datetime |
| `lastModifiedByProp` | `string` | Property path for last-modified user |
| `filterInitial` | `TFilter` | Initial filter values |
| `items` | `TItem[]` | Controlled items (optional) |
| `onItemsChange` | `(items) => void` | Controlled items change callback |
| `inlineEdit` | `InlineEditConfig<TItem>` | Inline editing config |
| `dialogEdit` | `DialogEditConfig<TItem>` | Dialog editing config |
| `excel` | `ExcelConfig<TItem>` | Excel import/export config |
| `selectionMode` | `"single" \| "multiple"` | Selection mode |
| `onSelect` | `(result: SelectResult<TItem>) => void` | Selection result callback |
| `onSubmitComplete` | `() => void` | Called after successful save |
| `hideAutoTools` | `boolean` | Hide automatic toolbar buttons |
| `close` | `() => void` | Close dialog callback (injected when used in dialog mode) |
| `class` | `string` | Custom class |

Sub-components: `CrudSheet.Column`, `CrudSheet.Filter`, `CrudSheet.Tools`, `CrudSheet.Header`

**`InlineEditConfig<TItem>`**

| Property | Description |
|----------|-------------|
| `submit(diffs)` | Called with changed diffs on save |
| `newItem()` | Factory for new empty rows |
| `deleteProp?` | Property name used to soft-delete rows |
| `diffsExcludes?` | Property paths to exclude from diff calculation |

**`DialogEditConfig<TItem>`**

| Property | Description |
|----------|-------------|
| `editItem(item?)` | Opens edit dialog; `undefined` item = new record |
| `deleteItems?(items)` | Deletes selected items |
| `restoreItems?(items)` | Restores deleted selected items |

**`ExcelConfig<TItem>`**

| Property | Description |
|----------|-------------|
| `download(items)` | Handles Excel file download |
| `upload?(file)` | Handles Excel file upload |

**`CrudSheetContext<TItem>`** (available in `CrudSheet.Tools` render prop)

| Member | Description |
|--------|-------------|
| `items()` | Current item array |
| `selection()` | Currently selected items |
| `page()` | Current page number |
| `sorts()` | Current sort definitions |
| `busy()` | Whether a request is in progress |
| `hasChanges()` | Whether there are unsaved changes |
| `save()` | Trigger save |
| `refresh()` | Trigger refresh |
| `addItem()` | Add a new blank row (inline edit) |
| `clearSelection()` | Clear selection |
| `setPage(page)` | Change page |
| `setSorts(sorts)` | Change sorts |

**`CrudSheetCellContext<TItem>`** (available in `CrudSheet.Column` render prop)

| Member | Description |
|--------|-------------|
| `item` | Row data |
| `index` | Row index |
| `row` | Flattened display row number |
| `depth` | Tree depth |
| `setItem(key, value)` | Update a field on the item |

Also exports: `SearchResult`, `SelectResult`, `CrudSheetColumnProps`

---

## `CrudDetail`

Detail form with load/save/delete lifecycle, keyboard shortcuts (`Ctrl+S` save, `Ctrl+Alt+L` refresh), and Topbar/dialog integration.

```tsx
import { CrudDetail } from "@simplysm/solid";

<CrudDetail
  load={async () => ({ data: await fetchItem(id), info: { isNew: false, isDeleted: false } })}
  submit={async (data) => { await saveItem(data); return true; }}
  toggleDelete={async (del) => { await toggleDeleteItem(id, del); return true; }}
>
  {(ctx) => (
    <FormGroup>
      <FormGroup.Item label="Name">
        <TextInput value={ctx.data.name} onValueChange={(v) => ctx.setData("name", v)} />
      </FormGroup.Item>
    </FormGroup>
  )}
</CrudDetail>
```

**`CrudDetailProps<TData>`**

| Prop | Type | Description |
|------|------|-------------|
| `load` | `() => Promise<{ data: TData; info: CrudDetailInfo }>` | Data loader (required) |
| `children` | `(ctx: CrudDetailContext<TData>) => JSX.Element` | Form content render prop (required) |
| `submit` | `(data: TData) => Promise<boolean \| undefined>` | Save handler |
| `toggleDelete` | `(del: boolean) => Promise<boolean \| undefined>` | Soft-delete/restore handler |
| `editable` | `boolean` | Enable editing (default: true) |
| `deletable` | `boolean` | Enable delete/restore |
| `data` | `TData` | Controlled data |
| `onDataChange` | `(data: TData) => void` | Controlled data change callback |
| `close` | `(result?: boolean) => void` | Close dialog callback (injected when in dialog mode) |
| `class` | `string` | Custom class |

**`CrudDetailInfo`**

| Property | Description |
|----------|-------------|
| `isNew` | Whether this is a new (unsaved) record |
| `isDeleted` | Whether the record is soft-deleted |
| `lastModifiedAt?` | Last modification timestamp (`DateTime`) |
| `lastModifiedBy?` | Last modifier username |

**`CrudDetailContext<TData>`** (passed to `children` render prop)

| Member | Description |
|--------|-------------|
| `data` | Reactive store (proxy) |
| `setData` | Store setter |
| `info()` | Reactive `CrudDetailInfo` |
| `busy()` | Whether a request is in progress |
| `hasChanges()` | Whether there are unsaved changes |
| `save()` | Trigger save |
| `refresh()` | Trigger refresh/reload |

Sub-components: `CrudDetail.Tools`, `CrudDetail.Before`, `CrudDetail.After`

---

## `PermissionTable`

Data grid for editing role/user permissions. Uses `DataSheet` internally with cascading checkbox logic.

```tsx
import { PermissionTable } from "@simplysm/solid";

<PermissionTable
  items={structure.usablePerms()}
  value={permRecord}
  onValueChange={setPermRecord}
  modules={activeModules}
/>
```

**`PermissionTableProps<TModule>`**

| Prop | Type | Description |
|------|------|-------------|
| `items` | `AppPerm<TModule>[]` | Permission tree (from `createAppStructure`) |
| `value` | `Record<string, boolean>` | Current permission record |
| `onValueChange` | `(value) => void` | Change callback |
| `modules` | `TModule[]` | Active modules filter |
| `disabled` | `boolean` | Disabled state |
| `class` | `string` | Custom class |
| `style` | `JSX.CSSProperties` | Custom style |

Also exports utility functions:

```tsx
import {
  collectAllPerms,
  filterByModules,
  changePermCheck,
} from "@simplysm/solid";
```

| Function | Description |
|----------|-------------|
| `collectAllPerms(items)` | Collects all unique permission type strings from the tree |
| `filterByModules(items, modules)` | Filters permission tree by active modules |
| `changePermCheck(value, item, perm, checked)` | Applies cascading check logic for a single permission toggle |

---

## `createAppStructure`

Builds a typed application structure (routes, menus, permissions) from a declarative item tree. Returns a provider component and a hook.

```tsx
import { createAppStructure } from "@simplysm/solid";

const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
  items: [
    {
      code: "admin",
      title: "Admin",
      children: [
        {
          code: "users",
          title: "Users",
          component: UsersPage,
          perms: ["use", "edit"],
        },
      ],
    },
  ],
  usableModules: () => currentModules(),
  permRecord: () => userPermissions(),
}));

// Wrap your app:
<AppStructureProvider>
  <Router>...</Router>
</AppStructureProvider>

// Consume anywhere:
const structure = useAppStructure();
const routes = structure.usableRoutes(); // reactive
const menus = structure.usableMenus();   // reactive
const canEdit = structure.perms.admin.users.edit; // typed
```

**`AppStructureGroupItem<TModule>`**

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | URL segment / permission path segment |
| `title` | `string` | Display title |
| `icon?` | `Component<IconProps>` | Menu icon |
| `modules?` | `TModule[]` | Visible if any of these modules is active |
| `requiredModules?` | `TModule[]` | Visible only if all of these are active |
| `children` | `AppStructureItem<TModule>[]` | Child items |

**`AppStructureLeafItem<TModule>`**

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | URL segment / permission path segment |
| `title` | `string` | Display title |
| `icon?` | `Component<IconProps>` | Menu icon |
| `modules?` | `TModule[]` | Visibility modules |
| `requiredModules?` | `TModule[]` | Required modules |
| `component?` | `Component` | Page component |
| `perms?` | `("use" \| "edit")[]` | Permission keys for this page |
| `subPerms?` | `AppStructureSubPerm<TModule>[]` | Sub-permission definitions |
| `isNotMenu?` | `boolean` | Exclude from menu (still routes) |

**`AppStructure<TModule>`** (returned by `useAppStructure()`)

| Member | Description |
|--------|-------------|
| `items` | Original item tree |
| `usableRoutes()` | Reactive array of `AppRoute` filtered by modules and permissions |
| `usableMenus()` | Reactive nested `AppMenu[]` filtered by modules and permissions |
| `usableFlatMenus()` | Reactive flat `AppFlatMenu[]` with full title chains |
| `usablePerms()` | Reactive `AppPerm<TModule>[]` tree for permission configuration UI |
| `allFlatPerms` | Static `AppFlatPerm<TModule>[]` — all permission codes |
| `perms` | Typed permission accessor object (reactive getters) |
| `getTitleChainByHref(href)` | Returns title breadcrumb for a route path |
