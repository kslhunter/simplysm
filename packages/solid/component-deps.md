# Solid Package Component Dependencies Overview

Organized by Depth, showing how components in `src/components` depend on other components.
(External libraries, hooks, helpers, styles, directives, and Context files are excluded from dependencies)

---

## Depth 1 — Components with no dependencies on other components

### display

| Component | File | Dependencies |
|----------|------|------------------|
| `Icon` | `display/Icon.tsx` | None |
| `Alert` | `display/Alert.tsx` | None |
| `Card` | `display/Card.tsx` | None |
| `Tag` | `display/Tag.tsx` | None |
| `Link` | `display/Link.tsx` | None |
| `Barcode` | `display/Barcode.tsx` | None |
| `Echarts` | `display/Echarts.tsx` | None |

### form-control

| Component | File | Dependencies |
|----------|------|------------------|
| `Button` | `form-control/Button.tsx`  | None |
| `Invalid` | `form-control/Invalid.tsx`  | None |
| `FieldPlaceholder` | `form-control/field/FieldPlaceholder.tsx`  | None |

### disclosure

| Component | File | Dependencies |
|----------|------|------------------|
| `Collapse` | `disclosure/Collapse.tsx`  | None |
| `Dropdown` | `disclosure/Dropdown.tsx`  | None |
| `Tabs` | `disclosure/Tabs.tsx`  | None |

### feedback

| Component | File | Dependencies |
|----------|------|------------------|
| `Progress` | `feedback/Progress.tsx`  | None |

### data

| Component | File | Dependencies |
|----------|------|------------------|
| `Table` | `data/Table.tsx`  | None |
| `Calendar` | `data/calendar/Calendar.tsx`  | None |
| `DataSheetColumn` | `data/sheet/DataSheetColumn.tsx`  | None |
| `List` | `data/list/List.tsx` | 없음 (자체 내부 ListItem 정의 포함, 상호참조지만 ListContext 통해 연결) |

### layout

| Component | File | Dependencies |
|----------|------|------------------|
| `FormGroup` | `layout/FormGroup.tsx`  | None |
| `FormTable` | `layout/FormTable.tsx`  | None |
| `TopbarActions` | `layout/topbar/TopbarActions.tsx`  | None (only TopbarContext referenced) |
| `TopbarContainer` | `layout/topbar/TopbarContainer.tsx`  | None (only TopbarContext referenced) |
| `SidebarContainer` | `layout/sidebar/SidebarContainer.tsx`  | None (only SidebarContext referenced) |

---

## Depth 2 — Components depending only on Depth 1 components

### display

| Component | File | Dependencies |
|----------|------|------------------|
| `NotificationBanner` | `feedback/notification/NotificationBanner.tsx` | `Icon` |

### form-control

| Component | File | Dependencies |
|----------|------|------------------|
| `Checkbox` | `form-control/checkbox/Checkbox.tsx` | `Icon`, `Invalid` |
| `Radio` | `form-control/checkbox/Radio.tsx` | `Invalid` |
| `TextInput` | `form-control/field/TextInput.tsx` | `Invalid`, `FieldPlaceholder` |
| `NumberInput` | `form-control/field/NumberInput.tsx` | `Invalid`, `FieldPlaceholder` |
| `DatePicker` | `form-control/field/DatePicker.tsx` | `Invalid` |
| `DateTimePicker` | `form-control/field/DateTimePicker.tsx` | `Invalid` |
| `TimePicker` | `form-control/field/TimePicker.tsx` | `Invalid` |
| `Textarea` | `form-control/field/Textarea.tsx` | `Invalid`, `FieldPlaceholder` |
| `ColorPicker` | `form-control/color-picker/ColorPicker.tsx` | `Invalid` |
| `ThemeToggle` | `form-control/ThemeToggle.tsx` | `Icon` |
| `EditorToolbar` | `form-control/editor/EditorToolbar.tsx` | `Icon` |
| `StatePreset` | `form-control/state-preset/StatePreset.tsx` | `Icon` |

### data

| Component | File | Dependencies |
|----------|------|------------------|
| `Pagination` | `data/Pagination.tsx` | `Button`, `Icon` |
| `ListItem` | `data/list/ListItem.tsx` | `Icon`, `Collapse`, `List` |

### disclosure

| Component | File | Dependencies |
|----------|------|------------------|
| `Dialog` | `disclosure/Dialog.tsx` | `Icon`, `Button` |

### feedback

| Component | File | Dependencies |
|----------|------|------------------|
| `BusyContainer` | `feedback/busy/BusyContainer.tsx`  | None (only BusyContext referenced) |

---

## Depth 3 — Components depending on Depth 1~2 components

### form-control

| Component | File | Dependencies |
|----------|------|------------------|
| `CheckboxGroup` | `form-control/checkbox/CheckboxGroup.tsx` | `Checkbox` |
| `RadioGroup` | `form-control/checkbox/RadioGroup.tsx` | `Radio` |
| `Select` | `form-control/select/Select.tsx` | `Icon`, `Dropdown`, `List`, `Invalid` |
| `SelectItem` | `form-control/select/SelectItem.tsx` | `Icon`, `Collapse`, `List` |
| `SelectList` | `form-control/select-list/SelectList.tsx` | `List`, `Pagination`, `TextInput` |
| `Combobox` | `form-control/combobox/Combobox.tsx` | `Icon`, `Dropdown`, `List`, `Invalid` |
| `ComboboxItem` | `form-control/combobox/ComboboxItem.tsx`  | None (only ComboboxContext referenced) |
| `Numpad` | `form-control/numpad/Numpad.tsx` | `Button`, `NumberInput`, `Icon` |
| `RichTextEditor` | `form-control/editor/RichTextEditor.tsx` | `EditorToolbar` |

### data

| Component | File | Dependencies |
|----------|------|------------------|
| `DataSheet` | `data/sheet/DataSheet.tsx` | `Icon`, `Checkbox`, `Pagination`, `DataSheetColumn`, (DialogContext로 DataSheetConfigDialog 동적 import) |
| `Kanban` | `data/kanban/Kanban.tsx` | `Card`, `Checkbox`, `Icon`, `BusyContainer` |

### disclosure

| Component | File | Dependencies |
|----------|------|------------------|
| `DialogProvider` | `disclosure/DialogProvider.tsx` | `Dialog` |

### feedback

| Component | File | Dependencies |
|----------|------|------------------|
| `BusyProvider` | `feedback/busy/BusyProvider.tsx` | `BusyContainer` |
| `NotificationBell` | `feedback/notification/NotificationBell.tsx` | `Dropdown`, `Icon`, `NotificationBanner` |
| `NotificationProvider` | `feedback/notification/NotificationProvider.tsx`  | None (only NotificationContext referenced) |
| `PrintProvider` | `feedback/print/PrintProvider.tsx` | `BusyContainer` (BusyContext 통해) |

### layout

| Component | File | Dependencies |
|----------|------|------------------|
| `SidebarMenu` | `layout/sidebar/SidebarMenu.tsx` | `Icon`, `List`, `ListItem` |
| `SidebarUser` | `layout/sidebar/SidebarUser.tsx` | `Icon`, `Collapse`, `List`, `ListItem` |
| `TopbarMenu` | `layout/topbar/TopbarMenu.tsx` | `Icon`, `Button`, `Dropdown`, `List`, `ListItem` |
| `TopbarUser` | `layout/topbar/TopbarUser.tsx` | `Icon`, `Button`, `Dropdown`, `List`, `ListItem` |

### features

| Component | File | Dependencies |
|----------|------|------------------|
| `DataSelectButton` | `features/data-select-button/DataSelectButton.tsx` | `Icon`, `Invalid` |

---

## Depth 4 — Components depending on Depth 1~3 components

### form-control

| Component | File | Dependencies |
|----------|------|------------------|
| `DateRangePicker` | `form-control/date-range-picker/DateRangePicker.tsx` | `DatePicker`, `Select` |

### data

| Component | File | Dependencies |
|----------|------|------------------|
| `DataSheetConfigDialog` | `data/sheet/DataSheetConfigDialog.tsx` | `DataSheet`, `Checkbox`, `TextInput`, `Button` |

### layout

| Component | File | Dependencies |
|----------|------|------------------|
| `Sidebar` | `layout/sidebar/Sidebar.tsx` | `SidebarContainer`, `SidebarMenu`, `SidebarUser` |
| `Topbar` | `layout/topbar/Topbar.tsx` | `Icon`, `Button`, `TopbarActions`, `TopbarContainer`, `TopbarMenu`, `TopbarUser` |

### features

| Component | File | Dependencies |
|----------|------|------------------|
| `AddressSearch` | `features/address/AddressSearch.tsx` | `BusyContainer` |
| `SharedDataSelect` | `features/shared-data/SharedDataSelect.tsx` | `Select`, `Icon` |
| `SharedDataSelectList` | `features/shared-data/SharedDataSelectList.tsx` | `SelectList`, `Icon` |
| `SharedDataSelectButton` | `features/shared-data/SharedDataSelectButton.tsx` | `DataSelectButton` |
| `PermissionTable` | `features/permission-table/PermissionTable.tsx` | `DataSheet`, `Checkbox` |

---

## Depth 5 — Components depending on Depth 1~4 components

### features

| Component | File | Dependencies |
|----------|------|------------------|
| `CrudDetail` | `features/crud-detail/CrudDetail.tsx` | `BusyContainer`, `Button`, `Icon`, `Dialog` |
| `CrudDetailTools` | `features/crud-detail/CrudDetailTools.tsx`  | None (slot definition) |
| `CrudDetailBefore` | `features/crud-detail/CrudDetailBefore.tsx`  | None (slot definition) |
| `CrudDetailAfter` | `features/crud-detail/CrudDetailAfter.tsx`  | None (slot definition) |
| `CrudSheet` | `features/crud-sheet/CrudSheet.tsx` | `DataSheet`, `DataSheetColumn`, `BusyContainer`, `Button`, `Icon`, `FormGroup`, `Dialog`, `Link` |
| `CrudSheetColumn` | `features/crud-sheet/CrudSheetColumn.tsx` | `DataSheetColumn` (sheetUtils 통해) |
| `CrudSheetFilter` | `features/crud-sheet/CrudSheetFilter.tsx`  | None (slot definition) |
| `CrudSheetTools` | `features/crud-sheet/CrudSheetTools.tsx`  | None (slot definition) |
| `CrudSheetHeader` | `features/crud-sheet/CrudSheetHeader.tsx`  | None (slot definition) |
