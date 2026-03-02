# @simplysm/solid

SolidJS component library for the Simplysm framework. Provides form controls, layout components, data display, disclosure, feedback, providers, hooks, styles, directives, helpers, and feature-level composite components.

## Installation

```bash
pnpm add @simplysm/solid
```

## Table of Contents

- [Form Control](docs/form-control.md) — Input and selection components
- [Layout](docs/layout.md) — Page scaffolding and form layout
- [Data](docs/data.md) — Tables, lists, calendars, and kanban boards
- [Display](docs/display.md) — Visual presentation components
- [Disclosure](docs/disclosure.md) — Show/hide patterns (collapse, dropdown, dialog, tabs)
- [Feedback](docs/feedback.md) — Notifications, busy states, print, and progress
- [Providers](docs/providers.md) — Application-level context providers
- [Hooks](docs/hooks.md) — Reactive primitives and utility hooks
- [Styles, Directives, Helpers](docs/styles.md) — Design tokens, CSS patterns, directives, and utilities
- [Features](docs/features.md) — High-level composite components (CRUD, permissions, address search)

---

## Form Control

Input and selection components for user data entry. All field components support `required`, `validate`, `disabled`, `inset`, `size`, and `touchMode` unless noted.

See [docs/form-control.md](docs/form-control.md) for full signatures and props.

| Component | Description |
|-----------|-------------|
| [`Button`](docs/form-control.md#button) | Interactive button with semantic themes and variants |
| [`Select`](docs/form-control.md#select) | Dropdown supporting single/multiple selection and hierarchical items |
| [`Combobox`](docs/form-control.md#combobox) | Async search combo box with optional free-text input |
| [`TextInput`](docs/form-control.md#textinput) | Text/password/email input with format transformation |
| [`NumberInput`](docs/form-control.md#numberinput) | Number input with comma formatting and min/max constraints |
| [`DatePicker`](docs/form-control.md#datepicker) | Date picker with configurable granularity (year/month/date) |
| [`DateTimePicker`](docs/form-control.md#datetimepicker) | Date-time picker (minute/second granularity) |
| [`TimePicker`](docs/form-control.md#timepicker) | Time picker (minute/second granularity) |
| [`Textarea`](docs/form-control.md#textarea) | Multi-line text input with auto-grow |
| [`Checkbox`](docs/form-control.md#checkbox) | Boolean checkbox input |
| [`Radio`](docs/form-control.md#radio) | Boolean radio input |
| [`CheckboxGroup`](docs/form-control.md#checkboxgroup) | Group of checkboxes for multi-value selection |
| [`RadioGroup`](docs/form-control.md#radiogroup) | Group of radio buttons for single-value selection |
| [`ColorPicker`](docs/form-control.md#colorpicker) | Color picker returning `#RRGGBB` hex strings |
| [`DateRangePicker`](docs/form-control.md#daterangepicker) | Date range picker with period type (day/month/range) |
| [`RichTextEditor`](docs/form-control.md#richtexteditor) | Rich text editor powered by Tiptap, outputs HTML |
| [`Numpad`](docs/form-control.md#numpad) | On-screen numeric keypad for touch input |
| [`StatePreset`](docs/form-control.md#statepreset) | Named state snapshot save/restore backed by SyncConfig |
| [`ThemeToggle`](docs/form-control.md#themetoggle) | Button cycling through light/system/dark themes |
| [`Invalid`](docs/form-control.md#invalid) | Validation wrapper with error indicator |
| [`Field.styles`](docs/form-control.md#field-styles-fieldstyles) | Style utilities for custom field components |
| [`Checkbox.styles`](docs/form-control.md#checkbox-styles-checkboxstyles) | Style utilities for custom checkbox/radio components |

---

## Layout

Structural layout components for page scaffolding and form organization.

See [docs/layout.md](docs/layout.md) for full details.

| Component | Description |
|-----------|-------------|
| [`FormGroup`](docs/layout.md#formgroup) | Responsive form layout with label-field pairs |
| [`FormTable`](docs/layout.md#formtable) | Styled HTML table for form layouts |
| [`Sidebar`](docs/layout.md#sidebar) | Responsive sidebar navigation |
| [`SidebarContext`](docs/layout.md#sidebarcontext) | Context and utilities for the Sidebar |
| [`Topbar`](docs/layout.md#topbar) | Top navigation bar with actions, menu, and user slots |
| [`TopbarContext`](docs/layout.md#topbarcontext) | Context for injecting page-level topbar actions |

---

## Data

Components for displaying and managing tabular, list, calendar, and kanban data.

See [docs/data.md](docs/data.md) for full details.

| Component | Description |
|-----------|-------------|
| [`Table`](docs/data.md#table) | Styled HTML table |
| [`List`](docs/data.md#list) | Keyboard-navigable list with tree support |
| [`ListContext`](docs/data.md#listcontext) | Context for tracking nesting level in List |
| [`ListItem.styles`](docs/data.md#listitemstyles) | Style constants for custom list item implementations |
| [`Pagination`](docs/data.md#pagination) | Page navigation control |
| [`DataSheet`](docs/data.md#datasheet) | Feature-rich data grid with sorting, pagination, selection, tree, and reorder |
| [`Calendar`](docs/data.md#calendar) | Monthly calendar view rendering items on dates |
| [`Kanban`](docs/data.md#kanban) | Kanban board with drag-and-drop card reordering |
| [`KanbanContext`](docs/data.md#kanbancontext) | Internal context and types for Kanban |

---

## Display

Visual presentation components for rendering data, media, and decorative elements.

See [docs/display.md](docs/display.md) for full details.

| Component | Description |
|-----------|-------------|
| [`Barcode`](docs/display.md#barcode) | Renders barcodes using bwip-js |
| [`Card`](docs/display.md#card) | White surface card with shadow and hover animation |
| [`Echarts`](docs/display.md#echarts) | Apache ECharts chart with lazy loading and auto-resize |
| [`Icon`](docs/display.md#icon) | Renders a Tabler icon SVG |
| [`Tag`](docs/display.md#tag) | Inline badge/tag with semantic color theming |
| [`Link`](docs/display.md#link) | Styled anchor with theme and disabled support |
| [`Alert`](docs/display.md#alert) | Styled alert/callout block |

---

## Disclosure

Components for showing and hiding content.

See [docs/disclosure.md](docs/disclosure.md) for full details.

| Component | Description |
|-----------|-------------|
| [`Collapse`](docs/disclosure.md#collapse) | Animated height-collapse panel |
| [`Dropdown`](docs/disclosure.md#dropdown) | Popup dropdown with trigger/content slots |
| [`Dialog`](docs/disclosure.md#dialog) | Dialog with header, actions, resize/move support |
| [`DialogContext`](docs/disclosure.md#dialogcontext) | Hook for programmatic dialog management |
| [`DialogProvider`](docs/disclosure.md#dialogprovider) | Provider enabling `useDialog()` |
| [`DialogInstanceContext`](docs/disclosure.md#dialoginstancecontext) | Context for dialog result communication |
| [`Tabs`](docs/disclosure.md#tabs) | Tab navigation component |

---

## Feedback

Components for user feedback.

See [docs/feedback.md](docs/feedback.md) for full details.

| Component | Description |
|-----------|-------------|
| [`NotificationContext`](docs/feedback.md#notificationcontext) | Hook for in-app notifications |
| [`NotificationBell`](docs/feedback.md#notificationbell) | Bell icon with unread count |
| [`NotificationBanner`](docs/feedback.md#notificationbanner) | Portal-based notification banner |
| [`BusyContext`](docs/feedback.md#busycontext) | Hook for global busy state overlays |
| [`BusyContainer`](docs/feedback.md#busycontainer) | Container with spinner/bar loading overlay |
| [`PrintContext`](docs/feedback.md#printcontext) | Hook for print and PDF generation |
| [`PrintProvider`](docs/feedback.md#printprovider) | Provider enabling `usePrint()` |
| [`Print`](docs/feedback.md#print) | Printable content layout with pages |
| [`PrintInstanceContext`](docs/feedback.md#printinstancecontext) | Context for print component communication |
| [`Progress`](docs/feedback.md#progress) | Progress bar component |

---

## Providers

Application-level context providers for configuration, storage, theming, i18n, and shared data.

See [docs/providers.md](docs/providers.md) for full details.

| Provider | Description |
|----------|-------------|
| [`ConfigContext`](docs/providers.md#configcontext) | Application-wide configuration context |
| [`SyncStorageContext`](docs/providers.md#syncstoragecontext) | Persistent key-value storage with pluggable adapter |
| [`LoggerContext`](docs/providers.md#loggercontext) | Structured logging with pluggable adapter |
| [`ThemeContext`](docs/providers.md#themecontext) | Light/dark/system theme management |
| [`ServiceClientContext`](docs/providers.md#serviceclientcontext) | WebSocket service client context |
| [`SystemProvider`](docs/providers.md#systemprovider) | Composite root provider for applications |
| [`SharedDataContext`](docs/providers.md#shareddatacontext) | Shared data synchronized with the server |
| [`SharedDataChangeEvent`](docs/providers.md#shareddatachangeevent) | Event class for shared data change notifications |
| [`I18nContext`](docs/providers.md#i18ncontext) | Internationalization with built-in EN/KO dictionaries |

---

## Hooks

Reactive primitives and utility hooks.

See [docs/hooks.md](docs/hooks.md) for full details.

| Hook | Description |
|------|-------------|
| [`useLocalStorage`](docs/hooks.md#uselocalstorage) | Reactive localStorage accessor with SSR safety |
| [`useSyncConfig`](docs/hooks.md#usesyncconfig) | Persistent configuration backed by SyncStorage |
| [`useLogger`](docs/hooks.md#uselogger) | Structured logger from the logger context |
| [`createControllableSignal`](docs/hooks.md#createcontrollablesignal) | Signal for controlled/uncontrolled patterns |
| [`createControllableStore`](docs/hooks.md#createcontrollablestore) | Store for controlled/uncontrolled patterns |
| [`createIMEHandler`](docs/hooks.md#createimehandler) | IME composition handlers for CJK input |
| [`createMountTransition`](docs/hooks.md#createmounttransition) | Mount/unmount lifecycle with animation support |
| [`createSlotSignal`](docs/hooks.md#createslotsignal) | Slot registration for compound components |
| [`useRouterLink`](docs/hooks.md#userouterlink) | SolidJS Router navigation click handler |

---

## Styles, Directives, Helpers

Design tokens, CSS class patterns, directives, and utilities.

See [docs/styles.md](docs/styles.md) for full details.

| Export | Description |
|--------|-------------|
| [`tokens.styles`](docs/styles.md#tokensstyles) | Design token constants and type definitions |
| [`patterns.styles`](docs/styles.md#patternsstyles) | Reusable Tailwind class patterns |
| [`ripple`](docs/styles.md#ripple-directive) | Material-style ripple click effect directive |
| [`mergeStyles`](docs/styles.md#mergestyles) | Merge multiple CSS style values into one object |

---

## Features

High-level composite components combining multiple primitives into application-ready patterns.

See [docs/features.md](docs/features.md) for full details.

| Component | Description |
|-----------|-------------|
| [`AddressSearchContent`](docs/features.md#addresssearchcontent) | Korean address search dialog via Daum Postcode API |
| [`SharedDataSelect`](docs/features.md#shareddataselect) | Select pre-wired to a SharedDataAccessor |
| [`SharedDataSelectButton`](docs/features.md#shareddataselectbutton) | DataSelectButton pre-wired to a SharedDataAccessor |
| [`SharedDataSelectList`](docs/features.md#shareddataselectlist) | Searchable list with pagination for SharedDataAccessor |
| [`DataSelectButton`](docs/features.md#dataselectbutton) | Generic trigger button opening a selection dialog |
| [`CrudSheet`](docs/features.md#crudsheet) | Full CRUD data grid with inline/dialog edit and Excel support |
| [`CrudDetail`](docs/features.md#cruddetail) | Detail form with load/save/delete lifecycle |
| [`PermissionTable`](docs/features.md#permissiontable) | Permission editor grid with cascading checkbox logic |
| [`createAppStructure`](docs/features.md#createappstructure) | Typed app structure builder (routes, menus, permissions) |
| [`createSlotComponent`](docs/features.md#createslotcomponent) | Factory for slot registration in compound components |
