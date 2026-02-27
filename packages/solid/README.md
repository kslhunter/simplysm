# @simplysm/solid

A SolidJS UI component library for enterprise back-office applications such as ERP and MES.

## Installation

```
pnpm add @simplysm/solid
```

**Peer Dependencies:**
- `solid-js` ^1.9
- `tailwindcss` ^3.4

**Optional Peer Dependencies:**
- `echarts` ^6.0 — Required for Echarts chart components

## Configuration

Register the Tailwind preset in your app's `tailwind.config.ts`:

```typescript
import simplysmPreset from "@simplysm/solid/tailwind.config";
export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: ["./src/**/*.{ts,tsx}", ...simplysmPreset.content],
};
```

Import base CSS in your entry point:

```typescript
import "@simplysm/solid/tailwind.css";
```

Wrap your app with providers:

```tsx
import { SystemProvider, DialogProvider, PrintProvider } from "@simplysm/solid";
<SystemProvider clientName="my-app">
  <DialogProvider>
    <PrintProvider>
      <App />
    </PrintProvider>
  </DialogProvider>
</SystemProvider>
```

| Provider | Required | Description |
|----------|----------|-------------|
| `SystemProvider` | Yes | Infrastructure: config, theme, logger, notification, busy, service client, shared data |
| `DialogProvider` | If using `useDialog()` | Programmatic dialog management |
| `PrintProvider` | If using `usePrint()` | Printing and PDF generation |

## Source Index

### Form Control

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/form-control/Button.tsx` | `ButtonProps`, `Button` | Button with ripple effect, theme/variant/size/inset options | `Button.spec.tsx` |
| `src/components/form-control/select/Select.tsx` | `SelectProps`, `Select` | Dropdown selection with single/multiple mode, search, hierarchical items | `Select.spec.tsx` |
| `src/components/form-control/combobox/Combobox.tsx` | `ComboboxProps`, `Combobox` | Autocomplete with async search, debounce, and custom value support | `Combobox.spec.tsx` |
| `src/components/form-control/field/TextInput.tsx` | `TextInputProps`, `TextInput` | Text input with IME support, format mask, prefix slot, validation | `TextInput.spec.tsx` |
| `src/components/form-control/field/NumberInput.tsx` | `NumberInputProps`, `NumberInput` | Numeric input with thousand-separator, min/max, prefix slot, validation | `NumberInput.spec.tsx` |
| `src/components/form-control/field/DatePicker.tsx` | `DatePickerProps`, `DatePicker` | Date input supporting year/month/date units (DateOnly type) | `DatePicker.spec.tsx` |
| `src/components/form-control/field/DateTimePicker.tsx` | `DateTimePickerProps`, `DateTimePicker` | Date-time input supporting minute/second units (DateTime type) | `DateTimePicker.spec.tsx` |
| `src/components/form-control/field/TimePicker.tsx` | `TimePickerProps`, `TimePicker` | Time input supporting minute/second units (Time type) | `TimePicker.spec.tsx` |
| `src/components/form-control/field/Textarea.tsx` | `TextareaProps`, `Textarea` | Auto-height textarea with IME support, minRows, validation | `Textarea.spec.tsx` |
| `src/components/form-control/field/Field.styles.ts` | `FieldSize`, `fieldBaseClass`, `fieldSizeClasses`, `fieldInsetClass`, `fieldInsetHeightClass`, `fieldInsetSizeHeightClasses`, `fieldDisabledClass`, `textAreaBaseClass`, `textAreaSizeClasses`, `fieldInputClass`, `fieldGapClasses`, `getFieldWrapperClass`, `getTextareaWrapperClass` | Shared Tailwind class tokens and wrapper class generators for field components | - |
| `src/components/form-control/checkbox/Checkbox.tsx` | `CheckboxProps`, `Checkbox` | Checkbox with ripple, controlled/uncontrolled, inset/inline modes | `Checkbox.spec.tsx` |
| `src/components/form-control/checkbox/Checkbox.styles.ts` | `CheckboxSize`, `checkboxBaseClass`, `indicatorBaseClass`, `checkedClass`, `checkboxSizeClasses`, `checkboxInsetClass`, `checkboxInsetSizeHeightClasses`, `checkboxInlineClass`, `checkboxDisabledClass` | Tailwind class tokens shared by Checkbox and Radio components | - |
| `src/components/form-control/checkbox/Radio.tsx` | `RadioProps`, `Radio` | Radio button (single-select variant of Checkbox) with ripple effect | `Radio.spec.tsx` |
| `src/components/form-control/checkbox/CheckboxGroup.tsx` | `CheckboxGroup` | Group of checkboxes with multi-select value binding and validation | `CheckboxGroup.spec.tsx` |
| `src/components/form-control/checkbox/RadioGroup.tsx` | `RadioGroup` | Group of radio buttons with single-select value binding and validation | `RadioGroup.spec.tsx` |
| `src/components/form-control/color-picker/ColorPicker.tsx` | `ColorPickerProps`, `ColorPicker` | Native color picker input (#RRGGBB) with size and inset support | `ColorPicker.spec.tsx` |
| `src/components/form-control/date-range-picker/DateRangePicker.tsx` | `DateRangePeriodType`, `DateRangePickerProps`, `DateRangePicker` | Date range input with day/month/range period type selection | `DateRangePicker.spec.tsx` |
| `src/components/form-control/editor/RichTextEditor.tsx` | `RichTextEditorProps`, `RichTextEditor` | WYSIWYG rich text editor (Tiptap) with toolbar, table, image support | - |
| `src/components/form-control/numpad/Numpad.tsx` | `NumpadProps`, `Numpad` | On-screen numeric keypad with optional ENT/minus buttons | `Numpad.spec.tsx` |
| `src/components/form-control/state-preset/StatePreset.tsx` | `StatePresetProps`, `StatePreset` | Named state preset chips — save, restore, and overwrite arbitrary values | - |
| `src/components/form-control/ThemeToggle.tsx` | `ThemeToggleProps`, `ThemeToggle` | Icon button that cycles light/system/dark theme modes | - |
| `src/components/form-control/Invalid.tsx` | `InvalidProps`, `Invalid` | Validation wrapper that shows border or dot indicator with native form validity | `Invalid.spec.tsx` |

### Layout

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/layout/FormGroup.tsx` | `FormGroupProps`, `FormGroupItemProps`, `FormGroup` | Labeled field group in vertical or inline (horizontal) layout | `FormGroup.spec.tsx` |
| `src/components/layout/FormTable.tsx` | `FormTableProps`, `FormTable` | Table layout for aligned label/field rows in forms | `FormTable.spec.tsx` |
| `src/components/layout/sidebar/Sidebar.tsx` | `SidebarProps`, `SidebarContainerProps`, `SidebarMenuProps`, `SidebarUserMenu`, `SidebarUserProps`, `Sidebar` | Collapsible sidebar with slide animation, responsive desktop/mobile behavior | `Sidebar.spec.tsx` |
| `src/components/layout/sidebar/SidebarContext.ts` | `SM_MEDIA_QUERY`, `SidebarContextValue`, `SidebarContext`, `useSidebarContext`, `useSidebarContextOptional` | Context providing toggle state for Sidebar open/close coordination | - |
| `src/components/layout/topbar/Topbar.tsx` | `TopbarProps`, `TopbarContainerProps`, `TopbarMenuItem`, `TopbarMenuProps`, `TopbarUserMenu`, `TopbarUserProps`, `Topbar` | App topbar with optional sidebar toggle button and menu/user slots | - |
| `src/components/layout/topbar/TopbarContext.ts` | `TopbarContextValue`, `TopbarContext`, `useTopbarActionsAccessor`, `createTopbarActions` | Context for injecting page-level action buttons into the topbar | `createTopbarActions.spec.tsx` |

### Data

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/data/Table.tsx` | `TableProps`, `Table` | Simple bordered HTML table with optional inset (borderless) style | `Table.spec.tsx` |
| `src/components/data/list/List.tsx` | `ListProps`, `List` | Keyboard-navigable list container with tree expand/collapse support | `List.spec.tsx` |
| `src/components/data/list/ListContext.ts` | `ListContextValue`, `ListContext`, `useListContext` | Context carrying nesting level for recursive List rendering | - |
| `src/components/data/list/ListItem.styles.ts` | `listItemBaseClass`, `listItemSizeClasses`, `listItemSelectedClass`, `listItemDisabledClass`, `listItemReadonlyClass`, `listItemIndentGuideClass`, `listItemContentClass`, `getListItemSelectedIconClass` | Tailwind class tokens for ListItem states (selected, disabled, readonly, indent) | - |
| `src/components/data/Pagination.tsx` | `PaginationProps`, `Pagination` | Page navigation bar with first/prev/next/last buttons | `Pagination.spec.tsx` |
| `src/components/data/sheet/DataSheet.tsx` | `DataSheet` | Feature-rich data grid with sorting, selection, tree expand, reorder, pagination | `DataSheet.spec.tsx` |
| `src/components/data/sheet/DataSheet.styles.ts` | `dataSheetContainerClass`, `tableClass`, `thClass`, `thContentClass`, `tdClass`, `summaryThClass`, `insetContainerClass`, `insetTableClass`, `defaultContainerClass`, `sortableThClass`, `sortIconClass`, `toolbarClass`, `fixedClass`, `fixedLastClass`, `resizerClass`, `resizeIndicatorClass`, `featureThClass`, `featureTdClass`, `expandIndentGuideClass`, `expandIndentGuideLineClass`, `expandToggleClass`, `selectSingleClass`, `selectSingleSelectedClass`, `selectSingleUnselectedClass`, `reorderHandleClass`, `reorderIndicatorClass`, `featureCellWrapperClass`, `featureCellBodyWrapperClass`, `featureCellClickableClass`, `featureCellBodyClickableClass`, `reorderCellWrapperClass`, `configButtonClass` | Tailwind class tokens for all DataSheet internal visual elements | - |
| `src/components/data/sheet/types.ts` | `DataSheetProps`, `DataSheetColumnProps`, `DataSheetCellContext`, `SortingDef`, `DataSheetConfig`, `DataSheetConfigColumn`, `DataSheetColumnDef`, `HeaderDef`, `FlatItem`, `DataSheetDragPosition`, `DataSheetReorderEvent`, `DataSheetConfigColumnInfo` | TypeScript types and interfaces for DataSheet props, column defs, and internal structures | - |
| `src/components/data/calendar/Calendar.tsx` | `CalendarProps`, `Calendar` | Monthly calendar grid that renders arbitrary items on their DateOnly date | - |
| `src/components/data/kanban/Kanban.tsx` | `KanbanCardProps`, `KanbanLaneProps`, `KanbanProps`, `Kanban` | Kanban board with drag-and-drop card reordering and multi-select | `Kanban.selection.spec.tsx` |
| `src/components/data/kanban/KanbanContext.ts` | `KanbanCardRef`, `KanbanDropInfo`, `KanbanDropTarget`, `KanbanContextValue`, `KanbanContext`, `useKanbanContext`, `KanbanLaneContextValue`, `KanbanLaneContext`, `useKanbanLaneContext` | Contexts sharing drag state and selection state between Kanban board and lanes | - |

### Display

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/display/Barcode.tsx` | `BarcodeType`, `BarcodeProps`, `Barcode` | Barcode/QR code renderer using bwip-js with many format options | `Barcode.spec.tsx` |
| `src/components/display/Card.tsx` | `CardProps`, `Card` | Elevated card container with shadow and fade-in animation | `Card.spec.tsx` |
| `src/components/display/Echarts.tsx` | `EchartsProps`, `Echarts` | Apache ECharts wrapper with resize observer and busy overlay support | - |
| `src/components/display/Icon.tsx` | `IconProps`, `Icon` | Wrapper for Tabler icon components with size normalization | - |
| `src/components/display/Tag.tsx` | `TagTheme`, `TagProps`, `Tag` | Inline colored badge/tag with semantic theme options | `Tag.spec.tsx` |
| `src/components/display/Link.tsx` | `LinkTheme`, `LinkProps`, `Link` | Themed anchor link with disabled state support | `Link.spec.tsx` |
| `src/components/display/Alert.tsx` | `AlertTheme`, `AlertProps`, `Alert` | Block alert box with semantic theme background colors | `Alert.spec.tsx` |

### Disclosure

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/disclosure/Collapse.tsx` | `CollapseProps`, `Collapse` | Animated height-based expand/collapse container | `Collapse.spec.tsx` |
| `src/components/disclosure/Dropdown.tsx` | `DropdownProps`, `Dropdown` | Positioned floating dropdown with Portal rendering and keyboard navigation | `Dropdown.spec.tsx` |
| `src/components/disclosure/Dialog.tsx` | `DialogProps`, `Dialog` | Modal dialog with draggable/resizable/closable options and backdrop | `Dialog.spec.tsx` |
| `src/components/disclosure/DialogContext.ts` | `DialogDefaults`, `DialogShowOptions`, `DialogContextValue`, `DialogDefaultsContext`, `DialogContext`, `useDialog` | Context and hook for opening programmatic dialogs imperatively | - |
| `src/components/disclosure/DialogInstanceContext.ts` | `DialogInstance`, `DialogInstanceContext`, `useDialogInstance` | Context providing close() to components rendered inside a dialog | - |
| `src/components/disclosure/DialogProvider.tsx` | `DialogProviderProps`, `DialogProvider` | Provider that manages programmatic dialog stack via useDialog() | `DialogProvider.spec.tsx` |
| `src/components/disclosure/Tabs.tsx` | `Tabs` | Tab bar with controlled/uncontrolled active tab selection | `Tabs.spec.tsx` |

### Feedback

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/feedback/notification/NotificationContext.ts` | `NotificationTheme`, `NotificationAction`, `NotificationItem`, `NotificationOptions`, `NotificationUpdateOptions`, `NotificationContextValue`, `NotificationContext`, `useNotification` | Context and hook for creating/updating/removing toast notifications | `NotificationContext.spec.tsx` |
| `src/components/feedback/notification/NotificationBell.tsx` | `NotificationBellProps`, `NotificationBell` | Bell icon button that shows notification history dropdown | `NotificationBell.spec.tsx` |
| `src/components/feedback/notification/NotificationBanner.tsx` | `NotificationBanner` | Fixed top-right banner that displays incoming notifications | `NotificationBanner.spec.tsx` |
| `src/components/feedback/busy/BusyContext.ts` | `BusyVariant`, `BusyContextValue`, `BusyContext`, `useBusy` | Context and hook for showing/hiding spinner or progress bar overlay | - |
| `src/components/feedback/busy/BusyContainer.tsx` | `BusyContainerProps`, `BusyContainer` | Container that overlays a spinner or progress bar while busy | `BusyContainer.spec.tsx` |
| `src/components/feedback/print/PrintContext.ts` | `PrintOptions`, `PrintContextValue`, `PrintContext`, `usePrint` | Context and hook for sending content to printer or exporting as PDF | - |
| `src/components/feedback/print/PrintProvider.tsx` | `PrintProvider` | Provider that implements toPrinter() and toPdf() via jsPDF and html-to-image | - |
| `src/components/feedback/print/Print.tsx` | `Print` | Declarative print content wrapper with Print.Page sub-component | `Print.spec.tsx` |
| `src/components/feedback/print/PrintInstanceContext.ts` | `PrintInstance`, `PrintInstanceContext`, `usePrintInstance` | Context providing ready() callback to print content components | - |
| `src/components/feedback/Progress.tsx` | `ProgressTheme`, `ProgressProps`, `Progress` | Horizontal progress bar with theme and size options | - |

### Providers

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/providers/ConfigContext.tsx` | `AppConfig`, `ConfigContext`, `useConfig`, `ConfigProvider` | App-wide configuration provider (clientName as storage key prefix) | `ConfigContext.spec.tsx` |
| `src/providers/SyncStorageContext.tsx` | `StorageAdapter`, `SyncStorageContextValue`, `SyncStorageContext`, `useSyncStorage`, `SyncStorageProvider` | Pluggable storage adapter provider (localStorage by default, swappable) | `SyncStorageContext.spec.tsx` |
| `src/providers/LoggerContext.tsx` | `LogAdapter`, `LoggerContextValue`, `LoggerContext`, `LoggerProvider` | Logger provider with chainable adapter decoration (consola by default) | `LoggerContext.spec.tsx` |
| `src/providers/ThemeContext.tsx` | `ThemeMode`, `ResolvedTheme`, `useTheme`, `ThemeProvider` | Theme provider managing light/dark/system mode with OS detection | - |
| `src/providers/ServiceClientContext.ts` | `ServiceClientContextValue`, `ServiceClientContext`, `useServiceClient` | Context for managing named WebSocket service client connections | `ServiceClientContext.spec.tsx` |
| `src/providers/shared-data/SharedDataContext.ts` | `SharedDataDefinition`, `SharedDataAccessor`, `SharedDataValue`, `SharedDataContext`, `useSharedData` | Context for reactive server-synced shared data with live-update subscriptions | `SharedDataProvider.spec.tsx` |
| `src/providers/shared-data/SharedDataChangeEvent.ts` | `SharedDataChangeEvent` | Service event definition for broadcasting shared data changes | - |
| `src/providers/SystemProvider.tsx` | `BusyVariant`, `SystemProvider` | Composite root provider that composes all infrastructure providers | - |
| `src/providers/i18n/I18nContext.tsx` | `useI18n`, `useI18nOptional`, `I18nProvider` | Internationalization provider with t(), locale management, and localStorage persistence | `I18nContext.spec.tsx` |
| `src/providers/i18n/I18nContext.types.ts` | `I18nContextValue`, `I18nConfigureOptions`, `FlatDict` | TypeScript types for I18n context value, configure options, and flat dict | - |

### Hooks

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/hooks/useLocalStorage.ts` | `useLocalStorage` | Reactive localStorage signal with clientName-prefixed keys | `useLocalStorage.spec.tsx` |
| `src/hooks/useSyncConfig.ts` | `useSyncConfig` | Persistent config signal synced via SyncStorageProvider (falls back to localStorage) | `useSyncConfig.spec.tsx` |
| `src/hooks/useLogger.ts` | `Logger`, `useLogger` | Logger hook that delegates to LoggerContext adapter (consola fallback) | `useLogger.spec.tsx` |
| `src/hooks/createControllableSignal.ts` | `createControllableSignal` | Controlled/uncontrolled signal pattern hook supporting functional setters | `createControllableSignal.spec.ts` |
| `src/hooks/createControllableStore.ts` | `createControllableStore` | Controlled/uncontrolled store pattern hook for object/array state | - |
| `src/hooks/createIMEHandler.ts` | `createIMEHandler` | IME composition handler that delays value commit to prevent Korean input breakage | `createIMEHandler.spec.ts` |
| `src/hooks/createMountTransition.ts` | `createMountTransition` | Mount/unmount animation hook providing mounted and animating signals | `createMountTransition.spec.ts` |
| `src/hooks/createSlotSignal.ts` | `SlotAccessor`, `createSlotSignal` | Signal factory for registering JSX slot content from child components | - |
| `src/hooks/useRouterLink.ts` | `RouterLinkOptions`, `useRouterLink` | Router navigation hook with Shift+click new-window support | `useRouterLink.spec.tsx` |

### Styles

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/styles/tokens.styles.ts` | `borderDefault`, `borderSubtle`, `bgSurface`, `textDefault`, `textMuted`, `textPlaceholder`, `disabledOpacity`, `ComponentSize`, `ComponentSizeCompact`, `paddingXs`, `paddingSm`, `paddingLg`, `paddingXl`, `SemanticTheme`, `themeTokens` | Design token constants (colors, sizes, themes) as Tailwind class strings | - |
| `src/styles/patterns.styles.ts` | `iconButtonBase`, `insetFocusOutline`, `insetFocusOutlineSelf`, `insetBase`, `fieldSurface`, `inputBase` | Reusable Tailwind class patterns for icon buttons, inset fields, and input elements | - |

### Directives

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/directives/ripple.ts` | `ripple` | SolidJS directive that adds a Material-style ripple effect on click | `ripple.spec.tsx` |

### Helpers

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/helpers/mergeStyles.ts` | `mergeStyles` | Merges multiple JSX style objects or strings into a single style object | `mergeStyles.spec.ts` |
| `src/helpers/createAppStructure.ts` | `AppStructureGroupItem`, `AppStructureLeafItem`, `AppStructureItem`, `AppStructureSubPerm`, `AppMenu`, `AppPerm`, `AppFlatPerm`, `AppRoute`, `AppFlatMenu`, `AppStructure`, `createAppStructure` | Builds typed app route/menu/permission structures from a nested definition tree | `createAppStructure.spec.tsx` |
| `src/helpers/createSlotComponent.ts` | `createSlotComponent` | Factory for creating slot registration sub-components that inject into parent context | - |

### Features

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/components/features/address/AddressSearch.tsx` | `AddressSearchResult`, `AddressSearchContent` | Daum Postcode address search dialog content component | `AddressSearch.spec.tsx` |
| `src/components/features/shared-data/SharedDataSelect.tsx` | `SharedDataSelectProps`, `SharedDataSelect` | Select dropdown bound to a SharedDataAccessor with search and edit action | - |
| `src/components/features/shared-data/SharedDataSelectButton.tsx` | `SharedDataSelectButtonProps`, `SharedDataSelectButton` | Button-trigger selector bound to a SharedDataAccessor via modal list | - |
| `src/components/features/shared-data/SharedDataSelectList.tsx` | `SharedDataSelectListProps`, `SharedDataSelectListComponent`, `SharedDataSelectList` | Paginated list for selecting a single item from a SharedDataAccessor | `SharedDataSelectList.spec.tsx` |
| `src/components/features/data-select-button/DataSelectButton.tsx` | `DataSelectModalResult`, `DataSelectButtonProps`, `DataSelectButton` | Button that opens a modal dialog for selecting items from an async data source | `DataSelectButton.spec.tsx` |
| `src/components/features/crud-sheet/CrudSheet.tsx` | `CrudSheet` | Full CRUD data grid with inline/modal edit, Excel import/export, search | `CrudSheet.spec.tsx` |
| `src/components/features/crud-sheet/types.ts` | `SearchResult`, `InlineEditConfig`, `ModalEditConfig`, `ExcelConfig`, `SelectResult`, `CrudSheetCellContext`, `CrudSheetContext`, `CrudSheetProps`, `CrudSheetColumnDef`, `CrudSheetColumnProps`, `CrudSheetFilterDef`, `CrudSheetToolsDef`, `CrudSheetHeaderDef` | TypeScript types and interfaces for CrudSheet configuration and callbacks | - |
| `src/components/features/crud-detail/CrudDetail.tsx` | `CrudDetail` | Detail form panel with load/save/refresh lifecycle and change tracking | `CrudDetail.spec.tsx` |
| `src/components/features/crud-detail/types.ts` | `CrudDetailInfo`, `CrudDetailContext`, `CrudDetailProps`, `CrudDetailToolsDef`, `CrudDetailBeforeDef`, `CrudDetailAfterDef` | TypeScript types and interfaces for CrudDetail props and context | - |
| `src/components/features/permission-table/PermissionTable.tsx` | `PermissionTableProps`, `collectAllPerms`, `filterByModules`, `changePermCheck`, `PermissionTable` | Permission matrix table for managing role-based access per module/action | `PermissionTable.spec.tsx` |

## License

Apache-2.0
