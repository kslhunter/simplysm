# @simplysm/angular

Simplysm Angular 21 UI component library. Provides configuration, providers, directives, pipes, setup functions, hooks, layout components, form controls, navigation, data display, overlays, and visual components -- all designed for zoneless Angular with signal-based APIs.

## Installation

```bash
npm install @simplysm/angular
```

## API Overview

### Commons & Configuration

| API | Type | Description |
|-----|------|-------------|
| `provideSdAngular` | function | Bootstrap function that registers all core providers, event plugins, error handler, and zoneless change detection |
| `TXT_CHANGE_IGNORE_CONFIRM` | const string | Confirmation message text for discarding unsaved changes |

-> See [docs/commons-and-configuration.md](./docs/commons-and-configuration.md) for details.

### Providers / Services

| API | Type | Description |
|-----|------|-------------|
| `SdThemeProvider` | Injectable | Manages dark/light theme toggle via signal |
| `SdAngularConfigProvider` | Injectable | Holds client application name |
| `SdSystemLogProvider` | Injectable | Writes log messages to console and optional custom handler |
| `SdNavigateWindowProvider` | Injectable | Opens navigation links in new windows/tabs |
| `SdLocalStorageProvider` | Injectable | Typed localStorage wrapper scoped by client name |
| `SdSystemConfigProvider` | Injectable | Persists/retrieves system configuration (localStorage or custom backend) |
| `SdFileDialogProvider` | Injectable | Opens native file picker dialogs |
| `SdServiceClientFactoryProvider` | Injectable | Manages WebSocket service client connections |
| `SdAppStructureProvider` | Injectable (abstract) | Provides app menu/permission structure |
| `SdAppStructureUtils` | abstract class | Static utilities for menu/permission computation |
| `SdSharedDataProvider` | Injectable (abstract) | Real-time shared data with event-driven partial updates |
| `SdModalProvider` | Injectable | Programmatically creates and shows modal dialogs |
| `SdActivatedModalProvider` | Injectable | Injected inside a modal to access modal context |
| `SdToastProvider` | Injectable | Shows toast notifications with severity levels |
| `SdBusyProvider` | Injectable | Manages global busy/loading overlay |
| `SdPrintProvider` | Injectable | Prints components or generates PDF buffers |

-> See [docs/providers.md](./docs/providers.md) for details.

### Event Plugins

| API | Type | Description |
|-----|------|-------------|
| `SdOptionEventPlugin` | EventManagerPlugin | Adds `.capture`, `.passive`, `.once` modifiers to native events |
| `SdResizeEventPlugin` | EventManagerPlugin | Provides `(sdResize)` event via ResizeObserver |
| `ISdResizeEvent` | interface | Payload for sdResize event |
| `SdIntersectionEventPlugin` | EventManagerPlugin | Provides `(sdIntersection)` event via IntersectionObserver |
| `ISdIntersectionEvent` | interface | Payload for sdIntersection event |
| `SdSaveCommandEventPlugin` | EventManagerPlugin | Provides `(sdSaveCommand)` event (Ctrl+S) |
| `SdRefreshCommandEventPlugin` | EventManagerPlugin | Provides `(sdRefreshCommand)` event (Ctrl+Alt+L) |
| `SdInsertCommandEventPlugin` | EventManagerPlugin | Provides `(sdInsertCommand)` event (Ctrl+Insert) |
| `SdGlobalErrorHandlerPlugin` | ErrorHandler | Global error handler that displays errors and logs them |

-> See [docs/event-plugins.md](./docs/event-plugins.md) for details.

### Directives

| API | Type | Description |
|-----|------|-------------|
| `SdEventsDirective` | Directive | Exposes capture/passive/once event outputs for template binding |
| `SdRippleDirective` | Directive | Adds material-style ripple effect on pointer interaction |
| `SdShowEffectDirective` | Directive | Animates element reveal on intersection |
| `SdInvalidDirective` | Directive | Shows validation indicator with custom message |
| `SdTypedTemplateDirective` | Directive | Provides type-safe ng-template context guard |
| `SdItemOfTemplateDirective` | Directive | Provides typed iteration context for ng-template |
| `SdItemOfTemplateContext` | interface | Context type for SdItemOfTemplateDirective |
| `SdRouterLinkDirective` | Directive | Navigation directive with window/tab/outlet support |
| `SdCardDirective` | Directive | Applies card styling class |
| `SdPaneDirective` | Directive | Applies fill pane styling |

-> See [docs/directives.md](./docs/directives.md) for details.

### Pipes

| API | Type | Description |
|-----|------|-------------|
| `FormatPipe` | Pipe | Formats DateTime, DateOnly, or string values using pattern |

-> See [docs/pipes.md](./docs/pipes.md) for details.

### Setup Functions

| API | Type | Description |
|-----|------|-------------|
| `setupBgTheme` | function | Sets body background CSS variable based on theme |
| `setupRipple` | function | Adds ripple effect to host element |
| `setupRevealOnShow` | function | Animates element visibility on intersection |
| `setupInvalid` | function | Adds form validation indicator to host element |
| `setupModelHook` | function | Intercepts model signal set with async guard |
| `setupCanDeactivate` | function | Registers route/modal can-deactivate guard |

-> See [docs/setup-functions.md](./docs/setup-functions.md) for details.

### Hooks & Utilities

| API | Type | Description |
|-----|------|-------------|
| `usePermsSignal` | function | Returns signal of permitted keys for given view codes |
| `useSdSystemConfigResource` | function | Creates a resource for reading/writing system config |
| `useCurrentPageCodeSignal` | function | Returns signal of current page code from activated route |
| `useFullPageCodeSignal` | function | Returns signal of full page code from router URL |
| `useViewTitleSignal` | function | Returns signal of current view title |
| `useViewTypeSignal` | function | Returns signal of view type (page/modal/control) |
| `TSdViewType` | type | `"page" \| "modal" \| "control"` |
| `useExpandingManager` | function | Manages tree expand/collapse state |
| `IExpandItemDef` | interface | Tree item definition with depth and parent |
| `useSelectionManager` | function | Manages item selection state (single/multi) |
| `useSortingManager` | function | Manages column sorting state |
| `ISortingDef` | interface | Sort definition with key and direction |
| `setSafeStyle` | function | Safely sets multiple CSS styles via Renderer2 |
| `TDirectiveInputSignals` | type | Extracts InputSignal value types from component |
| `TUndefToOptional` | type | Converts undefined-containing properties to optional |

-> See [docs/hooks-and-utilities.md](./docs/hooks-and-utilities.md) for details.

### App Structure Types

| API | Type | Description |
|-----|------|-------------|
| `TSdAppStructureItem` | type | Union of group and leaf structure items |
| `ISdMenu` | interface | Menu tree node |
| `ISdFlatMenu` | interface | Flattened menu entry |
| `ISdPermission` | interface | Permission tree node |
| `ISdFlatPermission` | interface | Flattened permission entry |

-> See [docs/providers.md](./docs/providers.md) for details (under SdAppStructureProvider).

### Layout Components

| API | Type | Description |
|-----|------|-------------|
| `SdDockContainerControl` | Component | Container for docked panels |
| `SdDockControl` | Component | Dockable panel (top/bottom/left/right) with optional resize |
| `SdPaneDirective` | Directive | Fill-area pane |
| `SdGapControl` | Component | Spacing element with preset or pixel sizes |
| `SdViewControl` | Component | View container for tab-like content switching |
| `SdViewItemControl` | Component | Individual view item, shown when value matches parent |
| `SdCardDirective` | Directive | Card styling |
| `SdKanbanBoardControl` | Component | Kanban board with drag-and-drop support |
| `SdKanbanLaneControl` | Component | Kanban lane (column) |
| `SdKanbanControl` | Component | Kanban card item |

-> See [docs/layout-components.md](./docs/layout-components.md) for details.

### Form Components

| API | Type | Description |
|-----|------|-------------|
| `SdButtonControl` | Component | Themed button with ripple effect |
| `SdAnchorControl` | Component | Inline clickable anchor element |
| `SdAdditionalButtonControl` | Component | Content with adjacent action buttons |
| `SdModalSelectButtonControl` | Component | Button that opens a modal for selection |
| `SdTextfieldControl` | Component | Text/number/date/time input field |
| `SdTextareaControl` | Component | Multi-line text input |
| `SdNumpadControl` | Component | On-screen numeric keypad |
| `SdRangeControl` | Component | From-to range input pair |
| `SdDateRangePicker` | Component | Date range picker with period type selector |
| `SdCheckboxControl` | Component | Checkbox with optional radio mode |
| `SdSwitchControl` | Component | Toggle switch |
| `SdCheckboxGroupControl` | Component | Group container for checkbox items |
| `SdCheckboxGroupItemControl` | Component | Individual item in checkbox group |
| `SdSelectControl` | Component | Dropdown select (single/multi) |
| `SdSelectItemControl` | Component | Item inside SdSelectControl |
| `SdSelectButtonControl` | Component | Additional button slot inside SdSelectControl |
| `SdTiptapEditorControl` | Component | Rich text editor powered by Tiptap |
| `SdStatePresetControl` | Component | Save/load named state presets |
| `SdFormControl` | Component | Form wrapper with submit/validation |

-> See [docs/form-components.md](./docs/form-components.md) for details.

### Navigation Components

| API | Type | Description |
|-----|------|-------------|
| `SdCollapseControl` | Component | Animated collapsible content |
| `SdCollapseIconControl` | Component | Rotating chevron icon for collapse state |
| `SdTabControl` | Component | Tab header container |
| `SdTabItemControl` | Component | Individual tab header item |
| `SdTabviewControl` | Component | Combined tab header + content view |
| `SdTabviewItemControl` | Component | Tab content panel |
| `SdPaginationControl` | Component | Page navigation with group support |
| `SdSidebarContainerControl` | Component | Layout container with sidebar toggle |
| `SdSidebarControl` | Component | Sidebar panel |
| `SdSidebarMenuControl` | Component | Menu renderer for sidebar |
| `ISdSidebarMenu` | interface | Sidebar menu item definition |
| `SdSidebarUserControl` | Component | User info section in sidebar |
| `ISidebarUserMenu` | interface | User menu definition |
| `SdTopbarContainerControl` | Component | Layout container for topbar |
| `SdTopbarControl` | Component | Top navigation bar |
| `SdTopbarMenuControl` | Component | Menu renderer for topbar with dropdowns |
| `ISdTopbarMenu` | interface | Topbar menu item definition |
| `SdTopbarUserControl` | Component | User dropdown in topbar |
| `ISdTopbarUserMenu` | interface | Topbar user menu definition |

-> See [docs/navigation-components.md](./docs/navigation-components.md) for details.

### Data Display Components

| API | Type | Description |
|-----|------|-------------|
| `SdListControl` | Component | List container |
| `SdListItemControl` | Component | List item with accordion/flat layout |
| `SdSheetControl` | Component | Data grid with sorting, selection, expanding, pagination |
| `SdSheetColumnDirective` | Directive | Column definition for SdSheetControl |
| `SdSheetConfigModal` | Component | Sheet column configuration modal |
| `ISdSheetColumnDef` | interface | Column definition fields |
| `ISdSheetConfig` | interface | Sheet configuration (column widths, ordering, visibility) |
| `ISdSheetHeaderDef` | interface | Header cell definition |
| `ISdSheetItemKeydownEventParam` | interface | Keydown event parameter for sheet items |

-> See [docs/data-display-components.md](./docs/data-display-components.md) for details.

### Overlay Components

| API | Type | Description |
|-----|------|-------------|
| `SdDropdownControl` | Component | Dropdown trigger container |
| `SdDropdownPopupControl` | Component | Dropdown popup content |
| `SdModalControl` | Component | Modal dialog with header, close, resize, drag |
| `SdPromptModalControl` | Component | Built-in prompt modal (text input + confirm/cancel) |
| `SdConfirmModalControl` | Component | Built-in confirm modal (confirm/cancel) |
| `ISdModal` | interface | Interface for modal content components |
| `ISdModalInfo` | interface | Modal creation info (title, type, inputs) |
| `ISdModalOptions` | interface | Modal display options |
| `SdToastControl` | Component | Individual toast notification |
| `SdToastContainerControl` | Component | Toast container (fixed position) |
| `ISdToast` | interface | Interface for custom toast content components |
| `ISdToastInput` | interface | Toast creation info |
| `TSdToastSeverity` | type | `"info" \| "success" \| "warning" \| "danger"` |
| `TSdToastTheme` | type | Toast theme including severity and color themes |
| `SdBusyContainerControl` | Component | Busy/loading overlay container |
| `TSdBusyType` | type | `"spinner" \| "bar" \| "cube"` |

-> See [docs/overlay-components.md](./docs/overlay-components.md) for details.

### Visual Components

| API | Type | Description |
|-----|------|-------------|
| `SdLabelControl` | Component | Colored label/badge |
| `SdNoteControl` | Component | Note/callout block |
| `SdProgressControl` | Component | Progress bar with percentage display |
| `SdCalendarControl` | Component | Monthly calendar grid with item slots |
| `SdBarcodeControl` | Component | Barcode/QR code renderer (bwip-js) |
| `TBarcodeType` | type | Barcode type identifier |
| `SdEchartsControl` | Component | ECharts wrapper component |

-> See [docs/visual-components.md](./docs/visual-components.md) for details.

### Shared Data Types

| API | Type | Description |
|-----|------|-------------|
| `ISharedDataBase` | interface | Base interface for shared data items |
| `ISharedDataInfo` | interface | Registration info for shared data |
| `SharedDataHandle` | interface | Handle for accessing shared data items signal |
| `SdSharedDataChangeEvent` | const | Event definition for shared data change notifications |
| `ISdSelectModal` | interface | Interface for select modal components |
| `ISelectModalOutputResult` | interface | Result from modal select |
| `TSdSelectModalInfo` | type | Modal info type excluding select-specific inputs |
| `TSelectModeValue` | type | `T \| T[] \| undefined` |
| `TSdTextfieldTypes` | type | Map of textfield type names to value types |
| `sdTextfieldTypes` | const | Array of all textfield type names |
| `ISdStatePreset` | interface | Named state preset |

-> See [docs/form-components.md](./docs/form-components.md) for details.

## Usage Examples

### Bootstrap Application

```typescript
import { provideSdAngular } from "@simplysm/angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({ clientName: "my-app" }),
    provideRouter(routes),
  ],
});
```

### Modal Dialog

```typescript
import { SdModalProvider, SdConfirmModalControl } from "@simplysm/angular";

const modal = inject(SdModalProvider);

const confirmed = await modal.showAsync(
  {
    title: "Confirm Action",
    type: SdConfirmModalControl,
    inputs: { message: "Are you sure?" },
  },
  { useCloseByBackdrop: false },
);
```

### Toast Notification

```typescript
import { SdToastProvider } from "@simplysm/angular";

const toast = inject(SdToastProvider);
toast.success("Operation completed successfully");
toast.danger("An error occurred");

// With progress
const progress = toast.info("Uploading...", true);
progress.set(50); // 50%
progress.set(100); // auto-dismiss after 1s
```
