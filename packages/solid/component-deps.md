# Solid 패키지 컴포넌트 의존성 정리

`src/components` 디렉토리 기준으로 각 컴포넌트가 다른 컴포넌트를 어떻게 의존하는지 Depth별로 정리합니다.
(외부 라이브러리, hooks, helpers, styles, directives, Context 파일은 의존성 대상에서 제외)

---

## Depth 1 — 다른 컴포넌트에 의존하지 않는 컴포넌트

### display

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Icon` | `display/Icon.tsx` | 없음 |
| `Alert` | `display/Alert.tsx` | 없음 |
| `Card` | `display/Card.tsx` | 없음 |
| `Tag` | `display/Tag.tsx` | 없음 |
| `Link` | `display/Link.tsx` | 없음 |
| `Barcode` | `display/Barcode.tsx` | 없음 |
| `Echarts` | `display/Echarts.tsx` | 없음 |

### form-control

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Button` | `form-control/Button.tsx` | 없음 |
| `Invalid` | `form-control/Invalid.tsx` | 없음 |
| `FieldPlaceholder` | `form-control/field/FieldPlaceholder.tsx` | 없음 |

### disclosure

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Collapse` | `disclosure/Collapse.tsx` | 없음 |
| `Dropdown` | `disclosure/Dropdown.tsx` | 없음 |
| `Tabs` | `disclosure/Tabs.tsx` | 없음 |

### feedback

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Progress` | `feedback/Progress.tsx` | 없음 |

### data

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Table` | `data/Table.tsx` | 없음 |
| `Calendar` | `data/calendar/Calendar.tsx` | 없음 |
| `DataSheetColumn` | `data/sheet/DataSheetColumn.tsx` | 없음 |
| `List` | `data/list/List.tsx` | 없음 (자체 내부 ListItem 정의 포함, 상호참조지만 ListContext 통해 연결) |

### layout

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `FormGroup` | `layout/FormGroup.tsx` | 없음 |
| `FormTable` | `layout/FormTable.tsx` | 없음 |
| `TopbarActions` | `layout/topbar/TopbarActions.tsx` | 없음 (TopbarContext만 참조) |
| `TopbarContainer` | `layout/topbar/TopbarContainer.tsx` | 없음 (TopbarContext만 참조) |
| `SidebarContainer` | `layout/sidebar/SidebarContainer.tsx` | 없음 (SidebarContext만 참조) |

---

## Depth 2 — Depth 1 컴포넌트만 의존하는 컴포넌트

### display

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `NotificationBanner` | `feedback/notification/NotificationBanner.tsx` | `Icon` |

### form-control

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
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

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Pagination` | `data/Pagination.tsx` | `Button`, `Icon` |
| `ListItem` | `data/list/ListItem.tsx` | `Icon`, `Collapse`, `List` |

### disclosure

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Dialog` | `disclosure/Dialog.tsx` | `Icon`, `Button` |

### feedback

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `BusyContainer` | `feedback/busy/BusyContainer.tsx` | 없음 (BusyContext만 참조) |

---

## Depth 3 — Depth 1~2 컴포넌트를 의존하는 컴포넌트

### form-control

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `CheckboxGroup` | `form-control/checkbox/CheckboxGroup.tsx` | `Checkbox` |
| `RadioGroup` | `form-control/checkbox/RadioGroup.tsx` | `Radio` |
| `Select` | `form-control/select/Select.tsx` | `Icon`, `Dropdown`, `List`, `Invalid` |
| `SelectItem` | `form-control/select/SelectItem.tsx` | `Icon`, `Collapse`, `List` |
| `SelectList` | `form-control/select-list/SelectList.tsx` | `List`, `Pagination`, `TextInput` |
| `Combobox` | `form-control/combobox/Combobox.tsx` | `Icon`, `Dropdown`, `List`, `Invalid` |
| `ComboboxItem` | `form-control/combobox/ComboboxItem.tsx` | 없음 (ComboboxContext만 참조) |
| `Numpad` | `form-control/numpad/Numpad.tsx` | `Button`, `NumberInput`, `Icon` |
| `RichTextEditor` | `form-control/editor/RichTextEditor.tsx` | `EditorToolbar` |

### data

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `DataSheet` | `data/sheet/DataSheet.tsx` | `Icon`, `Checkbox`, `Pagination`, `DataSheetColumn`, (DialogContext로 DataSheetConfigDialog 동적 import) |
| `Kanban` | `data/kanban/Kanban.tsx` | `Card`, `Checkbox`, `Icon`, `BusyContainer` |

### disclosure

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `DialogProvider` | `disclosure/DialogProvider.tsx` | `Dialog` |

### feedback

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `BusyProvider` | `feedback/busy/BusyProvider.tsx` | `BusyContainer` |
| `NotificationBell` | `feedback/notification/NotificationBell.tsx` | `Dropdown`, `Icon`, `NotificationBanner` |
| `NotificationProvider` | `feedback/notification/NotificationProvider.tsx` | 없음 (NotificationContext만 참조) |
| `PrintProvider` | `feedback/print/PrintProvider.tsx` | `BusyContainer` (BusyContext 통해) |

### layout

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `SidebarMenu` | `layout/sidebar/SidebarMenu.tsx` | `Icon`, `List`, `ListItem` |
| `SidebarUser` | `layout/sidebar/SidebarUser.tsx` | `Icon`, `Collapse`, `List`, `ListItem` |
| `TopbarMenu` | `layout/topbar/TopbarMenu.tsx` | `Icon`, `Button`, `Dropdown`, `List`, `ListItem` |
| `TopbarUser` | `layout/topbar/TopbarUser.tsx` | `Icon`, `Button`, `Dropdown`, `List`, `ListItem` |

### features

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `DataSelectButton` | `features/data-select-button/DataSelectButton.tsx` | `Icon`, `Invalid` |

---

## Depth 4 — Depth 1~3 컴포넌트를 의존하는 컴포넌트

### form-control

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `DateRangePicker` | `form-control/date-range-picker/DateRangePicker.tsx` | `DatePicker`, `Select` |

### data

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `DataSheetConfigDialog` | `data/sheet/DataSheetConfigDialog.tsx` | `DataSheet`, `Checkbox`, `TextInput`, `Button` |

### layout

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `Sidebar` | `layout/sidebar/Sidebar.tsx` | `SidebarContainer`, `SidebarMenu`, `SidebarUser` |
| `Topbar` | `layout/topbar/Topbar.tsx` | `Icon`, `Button`, `TopbarActions`, `TopbarContainer`, `TopbarMenu`, `TopbarUser` |

### features

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `AddressSearch` | `features/address/AddressSearch.tsx` | `BusyContainer` |
| `SharedDataSelect` | `features/shared-data/SharedDataSelect.tsx` | `Select`, `Icon` |
| `SharedDataSelectList` | `features/shared-data/SharedDataSelectList.tsx` | `SelectList`, `Icon` |
| `SharedDataSelectButton` | `features/shared-data/SharedDataSelectButton.tsx` | `DataSelectButton` |
| `PermissionTable` | `features/permission-table/PermissionTable.tsx` | `DataSheet`, `Checkbox` |

---

## Depth 5 — Depth 1~4 컴포넌트를 의존하는 컴포넌트

### features

| 컴포넌트 | 파일 | 의존하는 컴포넌트 |
|----------|------|------------------|
| `CrudDetail` | `features/crud-detail/CrudDetail.tsx` | `BusyContainer`, `Button`, `Icon`, `Dialog` |
| `CrudDetailTools` | `features/crud-detail/CrudDetailTools.tsx` | 없음 (slot 정의용) |
| `CrudDetailBefore` | `features/crud-detail/CrudDetailBefore.tsx` | 없음 (slot 정의용) |
| `CrudDetailAfter` | `features/crud-detail/CrudDetailAfter.tsx` | 없음 (slot 정의용) |
| `CrudSheet` | `features/crud-sheet/CrudSheet.tsx` | `DataSheet`, `DataSheetColumn`, `BusyContainer`, `Button`, `Icon`, `FormGroup`, `Dialog`, `Link` |
| `CrudSheetColumn` | `features/crud-sheet/CrudSheetColumn.tsx` | `DataSheetColumn` (sheetUtils 통해) |
| `CrudSheetFilter` | `features/crud-sheet/CrudSheetFilter.tsx` | 없음 (slot 정의용) |
| `CrudSheetTools` | `features/crud-sheet/CrudSheetTools.tsx` | 없음 (slot 정의용) |
| `CrudSheetHeader` | `features/crud-sheet/CrudSheetHeader.tsx` | 없음 (slot 정의용) |
