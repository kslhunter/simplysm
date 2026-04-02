# @simplysm/angular

Angular 21 UI component library for Simplysm applications. Provides zoneless, signal-based components covering layout, forms, navigation, data display, overlays, theming, and application infrastructure.

## Installation

```bash
npm install @simplysm/angular
```

## API Overview

### Core

Providers, plugins, directives, pipes, and utility functions that form the framework foundation.

| API | Type | Description |
|-----|------|-------------|
| `provideSdAngular` | function | Bootstraps all core providers, plugins, error handler, and zoneless change detection |
| `TXT_CHANGE_IGNORE_CONFIRM` | const | Confirmation message text for discarding unsaved changes |
| `SdAngularConfigProvider` | provider | Holds client application name |
| `SdThemeProvider` | provider | Dark/light theme toggle via signal |
| `SdSystemLogProvider` | provider | Centralized logging with optional custom handler |
| `SdAppStructureProvider` | abstract provider | Maps app structure to menus and permissions |
| `SdAppStructureUtils` | class | Static utility methods for app structure operations |
| `usePermsSignal` | function | Reactive permission checker as computed signal |
| `SdFileDialogProvider` | provider | Native file picker dialog |
| `SdLocalStorageProvider` | provider | Typed localStorage wrapper scoped by client name |
| `SdSystemConfigProvider` | provider | Async config storage abstraction |
| `SdServiceClientFactoryProvider` | provider | Manages ServiceClient connections by key |
| `SdSharedDataProvider` | abstract provider | Event-driven shared data cache |
| `SdSharedDataChangeEvent` | const | Event definition for shared data change notifications |
| `SdNavigateWindowProvider` | provider | New-window navigation with auto-close |
| `SdPrintProvider` | provider | Dynamic component rendering for print/PDF |
| `SdGlobalErrorHandlerPlugin` | plugin | Global error handler with overlay |
| `SdOptionEventPlugin` | plugin | `.capture`, `.passive`, `.once` event suffix support |
| `SdResizeEventPlugin` | plugin | `sdResize` event via ResizeObserver |
| `SdIntersectionEventPlugin` | plugin | `sdIntersection` event via IntersectionObserver |
| `SdSaveCommandEventPlugin` | plugin | `sdSaveCommand` event (Ctrl+S) |
| `SdRefreshCommandEventPlugin` | plugin | `sdRefreshCommand` event (Ctrl+Alt+L) |
| `SdInsertCommandEventPlugin` | plugin | `sdInsertCommand` event (Ctrl+Insert) |
| `SdEventsDirective` | directive | Exposes captured/passive/once events and custom events as outputs |
| `SdRippleDirective` | directive | Material-style ripple effect |
| `SdShowEffectDirective` | directive | Viewport entrance animation |
| `SdInvalidDirective` | directive | Validation indicator |
| `SdTypedTemplateDirective` | directive | Type-safe template context guard |
| `SdItemOfTemplateDirective` | directive | Typed item iteration template |
| `SdRouterLinkDirective` | directive | Enhanced router link with window/tab support |
| `FormatPipe` | pipe | Formats DateTime, DateOnly, or string values |
| `setSafeStyle` | function | Applies multiple CSS styles via Renderer2 |
| `setupBgTheme` | function | Sets body background to theme color |
| `setupRipple` | function | Attaches ripple effect to host element |
| `setupRevealOnShow` | function | IntersectionObserver entrance animation |
| `setupInvalid` | function | Validation indicator injection |
| `setupModelHook` | function | Guards WritableSignal.set with predicate |
| `setupCanDeactivate` | function | Deactivation guard for modal/route |
| `setupCumulateSelectedKeys` | function | Syncs selectedItems and selectedItemKeys |
| `setupCloserWhenSingleSelectionChange` | function | Auto-close on single selection change |
| `useSdSystemConfigResource` | function | Angular resource backed by system config |
| `useCurrentPageCodeSignal` | function | Current route page code signal |
| `useFullPageCodeSignal` | function | Full URL page code signal |
| `useViewTitleSignal` | function | Current view title signal |
| `useViewTypeSignal` | function | View context type signal (page/modal/control) |
| `useExpandingManager` | function | Tree expand/collapse state manager |
| `IExpandItemDef` | interface | Tree node definition (item, depth, hasChildren) |
| `useSelectionManager` | function | Item selection state manager |
| `useSortingManager` | function | Multi-column sorting state manager |
| `injectParent` | function | Finds parent component instance |
| `TSdAppStructureItem` | type | Discriminated union for app structure nodes |
| `ISdMenu` | interface | Menu tree node |
| `ISdFlatMenu` | interface | Flattened menu entry |
| `ISdPermission` | interface | Permission tree node |
| `ISdFlatPermission` | interface | Flattened permission entry |
| `ISharedDataBase` | interface | Base interface for shared data items |
| `ISharedDataInfo` | interface | Shared data source registration descriptor |
| `SharedDataHandle` | interface | Read handle for shared data |
| `ISdResizeEvent` | interface | Resize event payload |
| `ISdIntersectionEvent` | interface | Intersection event payload |
| `ISdPrint` | interface | Printable component contract |
| `ISdPrintInput` | interface | Print template input descriptor |
| `SdItemOfTemplateContext` | interface | Template context for item iteration |
| `ISortingDef` | interface | Sort definition (key + direction) |
| `withBusy` | function | Wraps async function with busy signal increment/decrement |
| `ISdStatePreset` | interface | Named state preset |
| `TSdViewType` | type | `"page" \| "modal" \| "control"` |
| `TDirectiveInputSignals` | type | Extracts input signal value types from component |
| `TUndefToOptional` | type | Converts undefined-accepting props to optional |
| `TWithOptional` | type | Converts specified keys to optional |

→ See [docs/core.md](./docs/core.md) for details.

### Features

High-level feature components: address search, base container, data views, and shared-data controls.

| API | Type | Description |
|-----|------|-------------|
| `SdAddressSearchModal` | component | Korean address search via Daum Postcode widget |
| `SdPermissionTableControl` | component | Permission matrix table with use/edit checkboxes |
| `SdBaseContainerControl` | component | Page/modal layout shell with busy state and access restriction |
| `SdDataSheetControl` | component | Presentation layer for data sheet views |
| `AbsSdDataSheet` | abstract directive | Base for data sheet screens (CRUD, pagination, sorting) |
| `SdDataSheetColumnDirective` | directive | Column definition extending SdSheetColumnDirective |
| `SdDataDetailControl` | component | Presentation layer for detail/form screens |
| `AbsSdDataDetail` | abstract directive | Base for detail screens (load, save, delete) |
| `SdDataSelectButtonControl` | component | Modal-backed select button presentation |
| `AbsSdDataSelectButton` | abstract directive | Base for select buttons backed by modal |
| `SdSharedDataSelectControl` | component | Dropdown select backed by shared data |
| `SdSharedDataSelectButtonControl` | component | Select button for shared data with numeric keys |
| `SdSharedDataSelectListControl` | component | List-style selection for shared data |
| `IAddress` | interface | Korean postal address |
| `ISdDataSheetItemPropInfo` | interface | Metadata column property names |
| `ISdDataSheetItemInfo` | interface | Per-item capability flags |
| `ISdDataSheetSearchResult` | interface | Search result shape |
| `ISdDataDetailDataInfo` | interface | Detail record metadata |

→ See [docs/features.md](./docs/features.md) for details.

### UI Layout

| API | Type | Description |
|-----|------|-------------|
| `SdDockContainerControl` | component | Flex container with dockable side panels |
| `SdDockControl` | component | Dockable panel (top/bottom/left/right) with optional resize |
| `SdPaneDirective` | directive | Fill-container scrollable pane |
| `SdGapControl` | component | Configurable spacer element |
| `SdViewControl` | component | Value-matched view container |
| `SdViewItemControl` | component | Single view panel within SdViewControl |
| `SdCardDirective` | directive | Card styling (shadow, border-radius) |
| `SdKanbanBoardControl` | component | Kanban board with drag-and-drop and multi-selection |
| `SdKanbanControl` | component | Individual kanban card |
| `SdKanbanLaneControl` | component | Kanban lane (column) |
| `ISdKanbanBoardDropInfo` | interface | Drop event payload |
| `ISdKanbanDragRef` | interface | Dragged card reference |
| `ISdKanbanDropTarget` | interface | Drop target reference |

→ See [docs/ui-layout.md](./docs/ui-layout.md) for details.

### UI Form

| API | Type | Description |
|-----|------|-------------|
| `SdButtonControl` | component | Themed button with ripple |
| `SdAnchorControl` | component | Inline anchor/link element |
| `SdAdditionalButtonControl` | component | Content + button side-by-side layout |
| `SdModalSelectButtonControl` | component | Button that opens a selection modal |
| `SdTextfieldControl` | component | Multi-type text input (text, number, date, color, etc.) |
| `SdTextareaControl` | component | Auto-growing multi-line text input |
| `SdNumpadControl` | component | On-screen numeric keypad |
| `SdRangeControl` | component | From/to range input |
| `SdDateRangePicker` | component | Date range picker with period types |
| `SdStatePresetControl` | component | Save/restore named state presets |
| `SdCheckboxControl` | component | Checkbox with optional radio style and async guard |
| `SdSwitchControl` | component | Toggle switch |
| `SdCheckboxGroupControl` | component | Checkbox group container |
| `SdCheckboxGroupItemControl` | component | Individual checkbox group item |
| `SdTiptapEditorControl` | component | Rich text editor (TipTap) |
| `SdSelectControl` | component | Dropdown select (single/multi, tree) |
| `SdSelectItemControl` | component | Select option item |
| `SdSelectButtonControl` | component | Button slot inside select |
| `SdFormControl` | component | Form container with submit/invalid events |
| `ISdSelectModal` | interface | Modal contract for select buttons |
| `ISelectModalOutputResult` | interface | Selection modal output |
| `TSdSelectModalInfo` | type | Modal info for select modals |
| `TSdTextfieldTypes` | type | Maps type keys to value types |
| `sdTextfieldTypes` | const | Array of all textfield type keys |
| `TSelectModeValue` | type | `T \| T[] \| undefined` |

→ See [docs/ui-form.md](./docs/ui-form.md) for details.

### UI Navigation

| API | Type | Description |
|-----|------|-------------|
| `SdCollapseControl` | component | Animated collapse/expand container |
| `SdCollapseIconControl` | component | Animated chevron icon |
| `SdTabControl` | component | Tab bar container |
| `SdTabItemControl` | component | Tab button |
| `SdTabviewControl` | component | Combined tab bar + content panels |
| `SdTabviewItemControl` | component | Tab content panel |
| `SdPaginationControl` | component | Pagination bar with navigation |
| `SdSidebarContainerControl` | component | Sidebar + content layout |
| `SdSidebarControl` | component | Sidebar panel |
| `SdSidebarMenuControl` | component | Recursive sidebar menu |
| `SdSidebarUserControl` | component | Sidebar user section with dropdown |
| `SdTopbarContainerControl` | component | Topbar + content layout |
| `SdTopbarControl` | component | Top navigation bar |
| `SdTopbarMenuControl` | component | Horizontal topbar menu |
| `SdTopbarUserControl` | component | Topbar user dropdown |
| `ISidebarUserMenu` | interface | Sidebar user dropdown menu item |
| `ISdTopbarUserMenu` | interface | Topbar user dropdown menu item |

→ See [docs/ui-navigation.md](./docs/ui-navigation.md) for details.

### UI Data

| API | Type | Description |
|-----|------|-------------|
| `SdListControl` | component | Simple list container |
| `SdListItemControl` | component | List item with accordion/flat layout |
| `SdSheetControl` | component | Full-featured data grid/spreadsheet |
| `SdSheetColumnDirective` | directive | Sheet column definition |
| `SdSheetConfigModal` | component | Sheet column configuration modal |
| `ISdSheetColumnDef` | interface | Runtime column definition |
| `ISdSheetHeaderDef` | interface | Header cell definition |
| `ISdSheetConfig` | interface | Persisted sheet configuration |
| `ISdSheetItemKeydownEventParam` | interface | Sheet row keydown event payload |
| `ISdSheetCellKeydownEventParam` | interface | Sheet cell keydown event payload |

→ See [docs/ui-data.md](./docs/ui-data.md) for details.

### UI Visual

| API | Type | Description |
|-----|------|-------------|
| `SdLabelControl` | component | Inline badge/tag label |
| `SdNoteControl` | component | Block-level note/callout |
| `SdProgressControl` | component | Progress bar |
| `SdCalendarControl` | component | Month calendar grid |
| `SdBarcodeControl` | component | Barcode renderer (bwip-js) |
| `SdEchartsControl` | component | Apache ECharts wrapper |
| `TBarcodeType` | type | Union of ~100 barcode format strings |

→ See [docs/ui-visual.md](./docs/ui-visual.md) for details.

### UI Overlay

| API | Type | Description |
|-----|------|-------------|
| `SdDropdownControl` | component | Dropdown trigger with popup positioning |
| `SdDropdownPopupControl` | component | Dropdown popup container |
| `SdModalControl` | component | Modal dialog shell (drag, resize, focus-trap) |
| `SdModalProvider` | provider | Programmatic modal creation |
| `SdActivatedModalProvider` | provider | Access modal shell from content component |
| `SdPromptModalControl` | component | Built-in text input prompt modal |
| `SdConfirmModalControl` | component | Built-in confirm/cancel modal |
| `SdToastControl` | component | Toast notification element |
| `SdToastContainerControl` | component | Toast stacking container |
| `SdToastProvider` | provider | Programmatic toast creation |
| `SdBusyContainerControl` | component | Busy overlay with animation |
| `SdBusyProvider` | provider | Global busy state manager |
| `ISdModal` | interface | Modal content component contract |
| `ISdModalInfo` | interface | Modal creation input descriptor |
| `ISdModalOptions` | interface | Modal display/behavior options |
| `ISdToast` | interface | Custom toast component contract |
| `ISdToastInput` | interface | Toast creation input descriptor |
| `TSdToastSeverity` | type | `"info" \| "success" \| "warning" \| "danger"` |
| `TSdToastTheme` | type | Toast theme options |
| `TSdBusyType` | type | `"spinner" \| "bar" \| "cube"` |

→ See [docs/ui-overlay.md](./docs/ui-overlay.md) for details.

### Styling

CSS classes, custom properties, themes, and SCSS mixins.

| API | Type | Description |
|-----|------|-------------|
| `.flex-row`, `.flex-column`, `.flex-fill` | CSS class | Flex layout utilities |
| `.grid`, `.grid-{1…12}` | CSS class | 12-column CSS grid |
| `.card` | CSS class | Card styling (shadow, animation) |
| `.bg-theme-*`, `.tx-trans-*`, `.bd-*` | CSS class | Color/border/background utilities |
| `.p-*`, `.m-*`, `.gap-*` | CSS class | Spacing utilities |
| `.form-control`, `.form-box`, `.table` | CSS class | Form and table layouts |
| `--theme-{group}-{shade}` | CSS custom property | Theme color tokens |
| `--gap-{key}` | CSS custom property | Spacing scale tokens |
| `--font-size-{key}` | CSS custom property | Font size tokens |
| `.sd-theme-dark` | theme class | Dark mode theme |

→ See [docs/styling.md](./docs/styling.md) for details.

## Usage Examples

### Bootstrap Application

```typescript
import { provideSdAngular } from "@simplysm/angular";

bootstrapApplication(AppComponent, {
  providers: [provideSdAngular({ clientName: "my-app" })],
});
```

### Data Sheet with CRUD

```typescript
@Component({
  selector: "my-data-sheet",
  template: `
    <sd-data-sheet>
      <sd-data-sheet-column key="name" header="Name">
        <ng-template #cellTpl let-item>{{ item.name }}</ng-template>
      </sd-data-sheet-column>
    </sd-data-sheet>
  `,
})
class MyDataSheet extends AbsSdDataSheet<IFilter, IItem, number> {
  // implement abstract members...
}
```

### Show a Modal Programmatically

```typescript
const result = await this.modalProvider.showAsync(
  { title: "Select Item", type: MySelectModal, inputs: {} },
  { resizable: true },
);
```
