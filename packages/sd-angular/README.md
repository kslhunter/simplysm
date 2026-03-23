# @simplysm/sd-angular

Angular 20 component library for building enterprise web applications. Provides 161+ exports across UI components, reactive signal utilities, layout primitives, overlay system, and opinionated feature modules for CRUD data views, shared data management, and permission handling.

Built on zoneless Angular with standalone components, signal-based state management, and CSS custom property theming.

## Installation

```bash
npm install @simplysm/sd-angular
```

**Peer dependencies (optional):** `@capacitor/app`, `@capacitor/core` (for Capacitor mobile support)

## Quick Start

```typescript
import { provideSdAngular, sdHmrBootstrapAsync } from "@simplysm/sd-angular";

// main.ts
export default sdHmrBootstrapAsync(AppComponent, {
  providers: [
    provideSdAngular({
      clientName: "my-app",
      defaultTheme: "compact",
      defaultDark: false,
    }),
    provideRouter(routes),
  ],
});
```

### Using Components

```typescript
import {
  SdTextfieldControl,
  SdButtonControl,
  SdSheetControl,
  SdSheetColumnDirective,
  SdSheetColumnCellTemplateDirective,
  $signal,
  $computed,
} from "@simplysm/sd-angular";

@Component({
  selector: "my-page",
  standalone: true,
  imports: [
    SdTextfieldControl,
    SdButtonControl,
    SdSheetControl,
    SdSheetColumnDirective,
    SdSheetColumnCellTemplateDirective,
  ],
  template: `
    <sd-textfield [type]="'text'" [(value)]="searchText" [placeholder]="'Search...'" />

    <sd-button [theme]="'primary'" (click)="onSearch()">Search</sd-button>

    <sd-sheet [key]="'my-sheet'" [items]="items()" [(sorts)]="sorts">
      <sd-sheet-column [key]="'name'" [header]="'Name'">
        <ng-template cell let-item>{{ item.name }}</ng-template>
      </sd-sheet-column>
      <sd-sheet-column [key]="'value'" [header]="'Value'" [width]="'100px'">
        <ng-template cell let-item>{{ item.value }}</ng-template>
      </sd-sheet-column>
    </sd-sheet>
  `,
})
export class MyPageComponent {
  searchText = $signal<string>();
  items = $signal<any[]>([]);
  sorts = $signal<ISdSortingDef[]>([]);

  onSearch() {
    // ...
  }
}
```

### Using Signal Utilities

```typescript
import { $signal, $computed, $effect, $arr, $obj, toSignal } from "@simplysm/sd-angular";

// Enhanced writable signals with $mark()
const items = $signal<Item[]>([]);

// Immutable array operations
$arr(items).insert(0, newItem);
$arr(items).remove(oldItem);
$arr(items).toggle(item);

// Snapshot-based change tracking
$arr(items).snapshot("id");
const diffs = $arr(items).diffs();

// Object change tracking
const data = $signal<MyData>({ name: "" });
$obj(data).snapshot();
const changed = $obj(data).changed();

// Reactive computed with async support
const result = $computed([triggerSignal], async () => {
  return await fetchData();
});
```

## API Reference

### Core - Bootstrap & Configuration

| Export | Type | Description |
|--------|------|-------------|
| [`provideSdAngular`](docs/core-bootstrap.md#providesdangular) | Function | Main provider factory for Angular app setup |
| [`sdHmrBootstrapAsync`](docs/core-bootstrap.md#sdhmrbootstrapasync) | Function | HMR-aware application bootstrapper |
| [`TXT_CHANGE_IGNORE_CONFIRM`](docs/core-bootstrap.md#txt_change_ignore_confirm) | Constant | Default unsaved changes confirmation message |

[Full documentation](docs/core-bootstrap.md)

### Core - Directives

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdEventsDirective`](docs/core-directives.md#sdeventsdirective) | Directive | Various event selectors | Unified event handler for capture/passive/once events |
| [`SdInvalidDirective`](docs/core-directives.md#sdinvaliddirective) | Directive | `[sd-invalid]` | Validation indicator for elements |
| [`SdItemOfTemplateDirective`](docs/core-directives.md#sditemoftemplatedirective) | Directive | `ng-template[itemOf]` | Type-safe template context for iterating items |
| [`SdRippleDirective`](docs/core-directives.md#sdrippledirective) | Directive | `[sd-ripple]` | Material Design ripple effect |
| [`SdRouterLinkDirective`](docs/core-directives.md#sdrouterlinkdirective) | Directive | `[sd-router-link]` | Enhanced router link with window/tab support |
| [`SdShowEffectDirective`](docs/core-directives.md#sdshoweffectdirective) | Directive | `[sd-show-effect]` | Reveal animation on element visibility |
| [`SdTypedTemplateDirective`](docs/core-directives.md#sdtypedtemplatedirective) | Directive | `ng-template[typed]` | Type-safe template context guard |

[Full documentation](docs/core-directives.md)

### Core - Pipes

| Export | Type | Name | Description |
|--------|------|------|-------------|
| [`FormatPipe`](docs/core-pipes.md#formatpipe) | Pipe | `format` | Formats DateTime, DateOnly, and pattern strings |

[Full documentation](docs/core-pipes.md)

### Core - Plugins

| Export | Type | Description |
|--------|------|-------------|
| [`SdSaveCommandEventPlugin`](docs/core-plugins.md#sdsavecommandeventplugin) | EventManagerPlugin | Ctrl+S save command |
| [`SdRefreshCommandEventPlugin`](docs/core-plugins.md#sdrefreshcommandeventplugin) | EventManagerPlugin | Ctrl+Alt+L refresh command |
| [`SdInsertCommandEventPlugin`](docs/core-plugins.md#sdinsertcommandeventplugin) | EventManagerPlugin | Ctrl+Insert insert command |
| [`SdBackbuttonEventPlugin`](docs/core-plugins.md#sdbackbuttoneventplugin) | EventManagerPlugin | Back button event (deprecated) |
| [`SdIntersectionEventPlugin`](docs/core-plugins.md#sdintersectioneventplugin) | EventManagerPlugin | IntersectionObserver event |
| [`SdOptionEventPlugin`](docs/core-plugins.md#sdoptioneventplugin) | EventManagerPlugin | Capture/passive/once event options |
| [`SdResizeEventPlugin`](docs/core-plugins.md#sdresizeeventplugin) | EventManagerPlugin | ResizeObserver event |
| [`SdGlobalErrorHandlerPlugin`](docs/core-plugins.md#sdglobalerrorhandlerplugin) | ErrorHandler | Global error handler with overlay |

[Full documentation](docs/core-plugins.md)

### Core - Providers

| Export | Type | Description |
|--------|------|-------------|
| [`SdAngularConfigProvider`](docs/core-providers.md#sdangularconfigprovider) | Injectable (root) | App configuration (clientName, theme, dark) |
| [`SdAppStructureProvider`](docs/core-providers.md#sdappstructureprovider) | Injectable (root) | App menu/permission structure management |
| [`SdAppStructureUtils`](docs/core-providers.md#sdappstructureutils) | Class | Static utility methods for app structure |
| [`SdSystemConfigProvider`](docs/core-providers.md#sdsystemconfigprovider) | Injectable (root) | System config storage (local or remote) |
| [`SdSystemLogProvider`](docs/core-providers.md#sdsystemlogprovider) | Injectable (root) | System log writer |
| [`SdFileDialogProvider`](docs/core-providers.md#sdfiledialogprovider) | Injectable (root) | File open dialog |
| [`SdNavigateWindowProvider`](docs/core-providers.md#sdnavigatewindowprovider) | Injectable (root) | Window/tab navigation helper |
| [`SdPrintProvider`](docs/core-providers.md#sdprintprovider) | Injectable (root) | Component-based print and PDF generation |
| [`SdServiceClientFactoryProvider`](docs/core-providers.md#sdserviceclientfactoryprovider) | Injectable (root) | WebSocket service client factory |
| [`SdLocalStorageProvider`](docs/core-providers.md#sdlocalstorageprovider) | Injectable (root) | Typed localStorage wrapper |
| [`SdSharedDataProvider`](docs/core-providers.md#sdshareddataprovider) | Injectable (root) | Real-time shared data with event sync |
| [`SdThemeProvider`](docs/core-providers.md#sdthemeprovider) | Injectable (root) | Theme and dark mode management |

[Full documentation](docs/core-providers.md)

### Core - Signal Utilities

| Export | Type | Description |
|--------|------|-------------|
| [`$signal`](docs/core-utilities.md#signal) | Function | Enhanced writable signal with `$mark()` |
| [`toSignal`](docs/core-utilities.md#tosignal) | Function | Converts WritableSignal to SdWritableSignal |
| [`$computed`](docs/core-utilities.md#computed) | Function | Computed signal with optional async support |
| [`$effect`](docs/core-utilities.md#effect) | Function | Effect with optional condition signals |
| [`$resource`](docs/core-utilities.md#resource) | Function | Resource with optional auto-save |
| [`$afterRenderEffect`](docs/core-utilities.md#afterrendereffect) | Function | After-render effect with optional signals |
| [`$afterRenderComputed`](docs/core-utilities.md#afterrendercomputed) | Function | After-render computed signal |
| [`$mark`](docs/core-utilities.md#mark) | Function | Force signal notification without value change |
| [`$arr`](docs/core-utilities.md#arr) | Function | Immutable array wrapper for signals |
| [`$map`](docs/core-utilities.md#map) | Function | Immutable Map wrapper for signals |
| [`$obj`](docs/core-utilities.md#obj) | Function | Object wrapper with snapshot/change tracking |
| [`$set`](docs/core-utilities.md#set) | Function | Immutable Set wrapper for signals |
| [`injectElementRef`](docs/core-utilities.md#injectelementref) | Function | Typed ElementRef injection |
| [`injectParent`](docs/core-utilities.md#injectparent) | Function | Parent component injection by type |
| [`SdExpandingManager`](docs/core-utilities.md#sdexpandingmanager) | Class | Tree expand/collapse state management |
| [`SdSelectionManager`](docs/core-utilities.md#sdselectionmanager) | Class | Multi/single selection state management |
| [`SdSortingManager`](docs/core-utilities.md#sdsortingmanager) | Class | Multi-column sort state management |
| [`setSafeStyle`](docs/core-utilities.md#setsafestyle) | Function | Safe style application via Renderer2 |
| [`TDirectiveInputSignals`](docs/core-utilities.md#tdirectiveinputsignals) | Type | Extract input signal types from component |
| [`transformBoolean`](docs/core-utilities.md#transformboolean) | Function | Boolean input transform |
| [`transformNullableBoolean`](docs/core-utilities.md#transformnullableboolean) | Function | Nullable boolean input transform |
| [`setupBgTheme`](docs/core-utilities.md#setupbgtheme) | Function | Background theme setup |
| [`setupCanDeactivate`](docs/core-utilities.md#setupcandeactivate) | Function | Route/modal deactivation guard |
| [`setupCloserWhenSingleSelectionChange`](docs/core-utilities.md#setupcloserwhensingleselectionchange) | Function | Auto-close modal on single selection |
| [`setupCumulateSelectedKeys`](docs/core-utilities.md#setupcumulateselectedkeys) | Function | Key-based selection accumulator |
| [`setupInvalid`](docs/core-utilities.md#setupinvalid) | Function | Invalid state indicator setup |
| [`setupModelHook`](docs/core-utilities.md#setupmodelhook) | Function | Model value hook with guard |
| [`setupRevealOnShow`](docs/core-utilities.md#setuprevealonshow) | Function | Reveal animation on intersection |
| [`setupRipple`](docs/core-utilities.md#setupripple) | Function | Ripple effect setup |
| [`useCurrentPageCodeSignal`](docs/core-utilities.md#usecurrentpagecodesignal) | Function | Current page code from route |
| [`useFullPageCodeSignal`](docs/core-utilities.md#usefullpagecodesignal) | Function | Full page code from router URL |
| [`useParamMapSignal`](docs/core-utilities.md#useparammapsignal) | Function | Route param map as signal |
| [`useQueryParamMapSignal`](docs/core-utilities.md#usequerymapsignal) | Function | Query param map as signal |
| [`useSdSystemConfigResource`](docs/core-utilities.md#usesdsystemconfigresource) | Function | System config resource with auto-save |
| [`useViewTitleSignal`](docs/core-utilities.md#useviewtitlesignal) | Function | View title from app structure |
| [`useViewTypeSignal`](docs/core-utilities.md#useviewtypesignal) | Function | View type (page/modal/control) |

[Full documentation](docs/core-utilities.md)

### Feature Controls

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdAddressSearchModal`](docs/feature-controls.md#sdaddresssearchmodal) | Component | `sd-address-search-modal` | Korean address search (Daum postcode) |
| [`SdBaseContainerControl`](docs/feature-controls.md#sdbasecontainercontrol) | Component | `sd-base-container` | Base container with topbar and busy state |
| [`SdDataDetailControl`](docs/feature-controls.md#sddatadetailcontrol) | Component | `sd-data-detail` | CRUD detail form with save/refresh |
| [`SdDataSelectButtonControl`](docs/feature-controls.md#sddataselectbuttoncontrol) | Component | `sd-data-select-button` | Button that opens a select modal |
| [`SdDataSheetColumnDirective`](docs/feature-controls.md#sddatasheetcolumndirective) | Directive | `sd-data-sheet-column` | Extended sheet column with edit flag |
| [`SdDataSheetControl`](docs/feature-controls.md#sddatasheetcontrol) | Component | `sd-data-sheet` | CRUD data sheet with full toolbar |
| [`SdPermissionTableControl`](docs/feature-controls.md#sdpermissiontablecontrol) | Component | `sd-permission-table` | Hierarchical permission checkbox table |
| [`SdSharedDataSelectButtonControl`](docs/feature-controls.md#sdshareddataselectbuttoncontrol) | Component | `sd-shared-data-select-button` | Shared data select button |
| [`SdSharedDataSelectListControl`](docs/feature-controls.md#sdshareddataselectlistcontrol) | Component | `sd-shared-data-select-list` | Shared data select list |
| [`SdSharedDataSelectControl`](docs/feature-controls.md#sdshareddataselectcontrol) | Component | `sd-shared-data-select` | Shared data dropdown select |
| [`SdThemeSelectorControl`](docs/feature-controls.md#sdthemeselectorcontrol) | Component | `sd-theme-selector` | Theme picker (compact/mobile/kiosk + dark) |

[Full documentation](docs/feature-controls.md)

### UI - Data

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdListControl`](docs/ui-data.md#sdlistcontrol) | Component | `sd-list` | Styled list container |
| [`SdListItemControl`](docs/ui-data.md#sdlistitemcontrol) | Component | `sd-list-item` | List item with accordion/flat layout |
| [`SdSheetControl`](docs/ui-data.md#sdsheetcontrol) | Component | `sd-sheet` | Full-featured data grid |
| [`SdSheetColumnDirective`](docs/ui-data.md#sdsheetcolumndirective) | Directive | `sd-sheet-column` | Sheet column definition |
| [`SdSheetColumnCellTemplateDirective`](docs/ui-data.md#sdsheetcolumncelltemplatedirective) | Directive | `ng-template[cell]` | Cell template for sheet columns |
| [`SdSheetConfigModal`](docs/ui-data.md#sdsheetconfigmodal) | Component | `sd-sheet-config-modal` | Sheet column configuration modal |

[Full documentation](docs/ui-data.md)

### UI - Form

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdAdditionalButtonControl`](docs/ui-form.md#sdadditionalbuttoncontrol) | Component | `sd-additional-button` | Button with additional action area |
| [`SdAnchorControl`](docs/ui-form.md#sdanchorcontrol) | Component | `sd-anchor` | Styled anchor/link element |
| [`SdButtonControl`](docs/ui-form.md#sdbuttoncontrol) | Component | `sd-button` | Theme-aware button |
| [`SdModalSelectButtonControl`](docs/ui-form.md#sdmodalselectbuttoncontrol) | Component | `sd-modal-select-button` | Button that opens a modal for selection |
| [`SdCheckboxControl`](docs/ui-form.md#sdcheckboxcontrol) | Component | `sd-checkbox` | Checkbox with theme and size options |
| [`SdCheckboxGroupControl`](docs/ui-form.md#sdcheckboxgroupcontrol) | Component | `sd-checkbox-group` | Group of checkboxes with array value |
| [`SdCheckboxGroupItemControl`](docs/ui-form.md#sdcheckboxgroupitemcontrol) | Component | `sd-checkbox-group-item` | Item within a checkbox group |
| [`SdStatePresetControl`](docs/ui-form.md#sdstatepresetcontrol) | Component | `sd-state-preset` | Save/load named state presets |
| [`SdSwitchControl`](docs/ui-form.md#sdswitchcontrol) | Component | `sd-switch` | Toggle switch |
| [`SdQuillEditorControl`](docs/ui-form.md#sdquilleditorcontrol) | Component | `sd-quill-editor` | Rich text editor (Quill-based) |
| [`SdDateRangePicker`](docs/ui-form.md#sddaterangepicker) | Component | `sd-date-range-picker` | Date range picker with period types |
| [`SdNumpadControl`](docs/ui-form.md#sdnumpadcontrol) | Component | `sd-numpad` | Numeric keypad input |
| [`SdRangeControl`](docs/ui-form.md#sdrangecontrol) | Component | `sd-range` | From-to range input |
| [`SdTextareaControl`](docs/ui-form.md#sdtextareacontrol) | Component | `sd-textarea` | Auto-growing textarea |
| [`SdTextfieldControl`](docs/ui-form.md#sdtextfieldcontrol) | Component | `sd-textfield` | Typed text input (text, number, date, etc.) |
| [`SdFormControl`](docs/ui-form.md#sdformcontrol) | Component | `sd-form` | Form wrapper with submit/invalid events |
| [`SdSelectControl`](docs/ui-form.md#sdselectcontrol) | Component | `sd-select` | Dropdown select with single/multi mode |
| [`SdSelectItemControl`](docs/ui-form.md#sdselectitemcontrol) | Component | `sd-select-item` | Item within a select dropdown |
| [`SdSelectButtonControl`](docs/ui-form.md#sdselectbuttoncontrol) | Component | `sd-select-button` | Button-style select display |

[Full documentation](docs/ui-form.md)

### UI - Layout

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdDockContainerControl`](docs/ui-layout.md#sddockcontainercontrol) | Component | `sd-dock-container` | Container for docked panels |
| [`SdDockControl`](docs/ui-layout.md#sddockcontrol) | Component | `sd-dock` | Dockable panel (top/bottom/left/right) |
| [`SdFlexDirective`](docs/ui-layout.md#sdflexdirective) | Directive | `sd-flex, [sd-flex]` | Flex container |
| [`SdFlexGrowDirective`](docs/ui-layout.md#sdflexgrowdirective) | Directive | `[sd-flex-grow]` | Flex item sizing |
| [`SdFormBoxDirective`](docs/ui-layout.md#sdformboxdirective) | Directive | `sd-form-box, [sd-form-box]` | Form layout box |
| [`SdFormBoxItemDirective`](docs/ui-layout.md#sdformboxitemdirective) | Directive | `sd-form-box-item, [sd-form-box-item]` | Item within form box |
| [`SdFormTableDirective`](docs/ui-layout.md#sdformtabledirective) | Directive | `sd-form-table, [sd-form-table]` | Table-style form layout |
| [`SdGridDirective`](docs/ui-layout.md#sdgriddirective) | Directive | `sd-grid, [sd-grid]` | Responsive grid container |
| [`SdGridItemDirective`](docs/ui-layout.md#sdgriditemdirective) | Directive | `sd-grid-item, [sd-grid-item]` | Grid item with responsive spans |
| [`SdKanbanBoardControl`](docs/ui-layout.md#sdkanbanboardcontrol) | Component | `sd-kanban-board` | Kanban board container with drag-drop |
| [`SdKanbanLaneControl`](docs/ui-layout.md#sdkanbanlanecontrol) | Component | `sd-kanban-lane` | Kanban lane/column |
| [`SdKanbanControl`](docs/ui-layout.md#sdkanbancontrol) | Component | `sd-kanban` | Kanban card |
| [`SdCardDirective`](docs/ui-layout.md#sdcarddirective) | Directive | `sd-card, [sd-card]` | Card container |
| [`SdGapControl`](docs/ui-layout.md#sdgapcontrol) | Component | `sd-gap` | Spacing/gap element |
| [`SdPaneDirective`](docs/ui-layout.md#sdpanedirective) | Directive | `sd-pane, [sd-pane]` | Scrollable pane |
| [`SdTableDirective`](docs/ui-layout.md#sdtabledirective) | Directive | `sd-table, [sd-table]` | Styled table |
| [`SdViewControl`](docs/ui-layout.md#sdviewcontrol) | Component | `sd-view` | View container for tab content |
| [`SdViewItemControl`](docs/ui-layout.md#sdviewitemcontrol) | Component | `sd-view-item` | Individual view within view container |

[Full documentation](docs/ui-layout.md)

### UI - Navigation

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdCollapseControl`](docs/ui-navigation.md#sdcollapsecontrol) | Component | `sd-collapse` | Collapsible content panel |
| [`SdCollapseIconControl`](docs/ui-navigation.md#sdcollapseiconcontrol) | Component | `sd-collapse-icon` | Animated collapse/expand icon |
| [`SdPaginationControl`](docs/ui-navigation.md#sdpaginationcontrol) | Component | `sd-pagination` | Page navigation control |
| [`SdSidebarContainerControl`](docs/ui-navigation.md#sdsidebarcontainercontrol) | Component | `sd-sidebar-container` | Sidebar layout container |
| [`SdSidebarControl`](docs/ui-navigation.md#sdsidebarcontrol) | Component | `sd-sidebar` | Sidebar panel |
| [`SdSidebarMenuControl`](docs/ui-navigation.md#sdsidebarmenucontrol) | Component | `sd-sidebar-menu` | Sidebar menu tree |
| [`SdSidebarUserControl`](docs/ui-navigation.md#sdsidebarusercontrol) | Component | `sd-sidebar-user` | Sidebar user info section |
| [`SdTabControl`](docs/ui-navigation.md#sdtabcontrol) | Component | `sd-tab` | Tab bar |
| [`SdTabItemControl`](docs/ui-navigation.md#sdtabitemcontrol) | Component | `sd-tab-item` | Tab item |
| [`SdTabviewControl`](docs/ui-navigation.md#sdtabviewcontrol) | Component | `sd-tabview` | Tabbed view container |
| [`SdTabviewItemControl`](docs/ui-navigation.md#sdtabviewitemcontrol) | Component | `sd-tabview-item` | Content panel for tabview |
| [`SdTopbarContainerControl`](docs/ui-navigation.md#sdtopbarcontainercontrol) | Component | `sd-topbar-container` | Topbar layout container |
| [`SdTopbarControl`](docs/ui-navigation.md#sdtopbarcontrol) | Component | `sd-topbar` | Top navigation bar |
| [`SdTopbarMenuControl`](docs/ui-navigation.md#sdtopbarmenucontrol) | Component | `sd-topbar-menu` | Topbar menu tree |
| [`SdTopbarUserControl`](docs/ui-navigation.md#sdtopbarusercontrol) | Component | `sd-topbar-user` | Topbar user dropdown |

[Full documentation](docs/ui-navigation.md)

### UI - Overlay

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdBusyContainerControl`](docs/ui-overlay.md#sdbusycontainercontrol) | Component | `sd-busy-container` | Loading overlay container |
| [`SdBusyProvider`](docs/ui-overlay.md#sdbusyprovider) | Injectable (root) | Global busy state manager |
| [`SdDropdownControl`](docs/ui-overlay.md#sddropdowncontrol) | Component | `sd-dropdown` | Dropdown toggle container |
| [`SdDropdownPopupControl`](docs/ui-overlay.md#sddropdownpopupcontrol) | Component | `sd-dropdown-popup` | Dropdown popup content |
| [`SdModalControl`](docs/ui-overlay.md#sdmodalcontrol) | Component | `sd-modal` | Modal dialog |
| [`SdModalProvider`](docs/ui-overlay.md#sdmodalprovider) | Injectable (root) | Programmatic modal management |
| [`SdModalInstance`](docs/ui-overlay.md#sdmodalinstance) | Class | -- | Modal instance reference |
| [`SdActivatedModalProvider`](docs/ui-overlay.md#sdactivatedmodalprovider) | Injectable | -- | Context for active modal |
| [`SdToastContainerControl`](docs/ui-overlay.md#sdtoastcontainercontrol) | Component | `sd-toast-container` | Toast notification container |
| [`SdToastControl`](docs/ui-overlay.md#sdtoastcontrol) | Component | `sd-toast` | Individual toast notification |
| [`SdToastProvider`](docs/ui-overlay.md#sdtoastprovider) | Injectable (root) | Toast notification manager |

[Full documentation](docs/ui-overlay.md)

### UI - Visual

| Export | Type | Selector | Description |
|--------|------|----------|-------------|
| [`SdBarcodeControl`](docs/ui-visual.md#sdbarcodecontrol) | Component | `sd-barcode` | Barcode renderer (100+ formats) |
| [`SdCalendarControl`](docs/ui-visual.md#sdcalendarcontrol) | Component | `sd-calendar` | Calendar view with item rendering |
| [`SdEchartsControl`](docs/ui-visual.md#sdechartscontrol) | Component | `sd-echarts` | Apache ECharts wrapper |
| [`SdLabelControl`](docs/ui-visual.md#sdlabelcontrol) | Component | `sd-label` | Themed text label |
| [`SdNoteControl`](docs/ui-visual.md#sdnotecontrol) | Component | `sd-note` | Themed note/alert box |
| [`SdProgressControl`](docs/ui-visual.md#sdprogresscontrol) | Component | `sd-progress` | Progress bar |

[Full documentation](docs/ui-visual.md)

## Theming

Three built-in themes controlled via `SdThemeProvider`:

- **`compact`** -- Dense desktop layout (default)
- **`mobile`** -- Touch-friendly mobile layout
- **`kiosk`** -- Large-format kiosk layout

Dark mode is toggled independently via `SdThemeProvider.dark`.

Theme and dark mode selections are persisted to localStorage automatically.

## License

MIT
