# @simplysm/solid

A SolidJS UI component library for enterprise back-office applications such as ERP and MES. Provides components for data-intensive forms, tables, and sidebar layouts with Tailwind CSS styling, dark mode, and responsive design.

## Installation

```bash
pnpm add @simplysm/solid
```

**Peer Dependencies:**
- `solid-js` ^1.9
- `tailwindcss` ^3.4

**Optional Peer Dependencies:**
- `echarts` ^6.0 -- Required for Echarts chart components

## Configuration

### Tailwind CSS

`@simplysm/solid` provides a Tailwind CSS preset. Register it as a preset in your app's `tailwind.config.ts` to automatically apply custom themes including semantic colors, field sizes, and z-index values.

```typescript
// tailwind.config.ts
import simplysmPreset from "@simplysm/solid/tailwind.config";

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    ...simplysmPreset.content,
  ],
};
```

### Provider Setup

Use `SystemProvider` to wrap your app. It provides all infrastructure providers (config, theme, logger, notification, service client, etc.).

For programmatic dialogs and printing, add `DialogProvider` and/or `PrintProvider` separately. Place them **below your own Providers** if your dialog/print content needs access to them.

```tsx
import { SystemProvider, DialogProvider, PrintProvider } from "@simplysm/solid";

function App() {
  return (
    <SystemProvider clientName="my-app">
      {/* Your Providers can go here */}
      <DialogProvider>
        <PrintProvider>
          <AppRoot />
        </PrintProvider>
      </DialogProvider>
    </SystemProvider>
  );
}
```

> **Why separate?** `DialogProvider` and `PrintProvider` render user-provided components (via `dialog.show(factory)` / `print.toPrinter(factory)`). By placing them below your Providers, the factory content can access your contexts (e.g., auth, data stores). `SystemProvider` provides infrastructure that doesn't render user components.

| Provider | Required | Must be inside | Description |
|----------|----------|----------------|-------------|
| `SystemProvider` | Yes | (root) | Infrastructure: config, theme, logger, notification, busy, service client, shared data |
| `DialogProvider` | If using `useDialog()` | `SystemProvider` | Programmatic dialog management |
| `PrintProvider` | If using `usePrint()` | `SystemProvider` | Printing and PDF generation |

```tsx
import { SystemProvider, DialogProvider, PrintProvider, useServiceClient, useSyncStorage, useLogger, useSharedData } from "@simplysm/solid";
import { onMount } from "solid-js";

function AppRoot() {
  const serviceClient = useServiceClient();

  onMount(async () => {
    await serviceClient.connect("main", { port: 3000 });
    useSyncStorage()!.configure((origin) => myStorageAdapter);
    useLogger().configure((origin) => myLogAdapter);
    useSharedData().configure((origin) => definitions);
  });
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clientName` | `string` | (required) | Client identifier (used as storage key prefix) |
| `busyVariant` | `BusyVariant` | `"spinner"` | Busy overlay display variant (`"spinner"` or `"bar"`) |

**StorageAdapter interface:**

```typescript
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}
```

**LogAdapter interface:**

```typescript
interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}
```

### Base CSS

Import the base CSS in your entry point:

```typescript
// entry point (e.g., index.tsx)
import "@simplysm/solid/tailwind.css";
```

## Components

### Form Controls

- [`Button`](docs/form-controls.md#button) - Interactive button with Material Design ripple effect
- [`TextInput`](docs/form-controls.md#textinput) - Text input with format mask and IME composition support
- [`NumberInput`](docs/form-controls.md#numberinput) - Number input with thousand separators and decimal places
- [`DatePicker`](docs/form-controls.md#datepicker) - Date input supporting year, month, and date units (`DateOnly` type)
- [`DateTimePicker`](docs/form-controls.md#datetimepicker) - Date-time input supporting minute and second units (`DateTime` type)
- [`TimePicker`](docs/form-controls.md#timepicker) - Time input supporting minute and second units (`Time` type)
- [`DateRangePicker`](docs/form-controls.md#daterangepicker) - Date range input with period type selection (day/month/range)
- [`Textarea`](docs/form-controls.md#textarea) - Multi-line text input with auto-height and IME support
- [`Select`](docs/form-controls.md#select) - Dropdown selection with single/multiple, hierarchical items, and compound components
- [`Combobox`](docs/form-controls.md#combobox) - Autocomplete with async search and debouncing
- [`Checkbox`](docs/form-controls.md#checkbox--radio) / [`Radio`](docs/form-controls.md#checkbox--radio) - Checkbox and radio button
- [`CheckboxGroup`](docs/form-controls.md#checkboxgroup--radiogroup) / [`RadioGroup`](docs/form-controls.md#checkboxgroup--radiogroup) - Group components for multiple/single selection
- [`ColorPicker`](docs/form-controls.md#colorpicker) - Color selection component
- [`ThemeToggle`](docs/form-controls.md#themetoggle) - Dark/light/system theme cycle toggle
- [`RichTextEditor`](docs/form-controls.md#richtexteditor) - Tiptap-based rich text editor with formatting, tables, images
- [`Invalid`](docs/form-controls.md#invalid) - Wrapper component for form validation using native browser validation
- [`Numpad`](docs/form-controls.md#numpad) - Numeric keypad for touch-based input
- [`StatePreset`](docs/form-controls.md#statepreset) - Save/load screen state as presets

### Data

- [`Table`](docs/data-components.md#table) - Basic HTML table wrapper with consistent styling
- [`DataSheet`](docs/data-components.md#datasheet) - Advanced data table with sorting, pagination, selection, tree expansion, column resize, drag reorder
- [`List`](docs/data-components.md#list) - Tree-view list with keyboard navigation
- [`Pagination`](docs/data-components.md#pagination) - Page navigation component
- [`Calendar`](docs/data-components.md#calendar) - Calendar-style data display
- [`PermissionTable`](docs/data-components.md#permissiontable) - Hierarchical permission management table with cascading checks
- [`CrudSheet`](docs/data-components.md#crudsheet) - CRUD data sheet with search, inline/modal editing, Excel import/export, and select mode

### Layout

- [`Sidebar`](docs/layout.md#sidebar) - Sidebar navigation with responsive mobile overlay
- [`Topbar`](docs/layout.md#topbar) - Top navigation bar with menus, user dropdown, and actions slot
- [`FormGroup`](docs/layout.md#formgroup) - Form fields layout with labels (vertical/inline)
- [`FormTable`](docs/layout.md#formtable) - Table-based form layout
- [`Kanban`](docs/layout.md#kanban) - Kanban board with drag-and-drop, lane collapse, multi-select

### Display

- [`Card`](docs/display.md#card) - Container with shadow effect
- [`Tag`](docs/display.md#tag) - Inline tag/badge component
- [`Link`](docs/display.md#link) - Inline text link
- [`Alert`](docs/display.md#alert) - Block-level alert/notice component
- [`Icon`](docs/display.md#icon) - Tabler Icons wrapper (scales with surrounding text)
- [`Progress`](docs/display.md#progress) - Progress indicator
- [`Barcode`](docs/display.md#barcode) - Barcode/QR code rendering (100+ barcode types)
- [`Echarts`](docs/display.md#echarts) - Apache ECharts chart wrapper

### Disclosure

- [`Tabs`](docs/disclosure.md#tabs) - Tab navigation component
- [`Collapse`](docs/disclosure.md#collapse) - Content collapse/expand animation
- [`Dropdown`](docs/disclosure.md#dropdown) - Positioned dropdown popup
- [`Dialog`](docs/disclosure.md#dialog) - Modal dialog with drag, resize, floating mode, and programmatic `useDialog`

### Feedback

- [`Notification`](docs/feedback.md#notification) - Notification system with banner and bell (`useNotification`)
- [`Busy`](docs/feedback.md#busy) - Busy overlay with spinner/bar variants (`useBusy`)
- [`Print`](docs/feedback.md#print--useprint) - Browser printing and PDF generation (`usePrint`)

## Hooks

- [`useTheme`](docs/hooks.md#usetheme) - Dark/light/system theme state access
- [`useLocalStorage`](docs/hooks.md#uselocalstorage) - Local-only persistent storage (never syncs)
- [`useSyncConfig`](docs/hooks.md#usesyncconfig) - Syncable config storage (cross-device sync support)
- [`useLogger`](docs/hooks.md#uselogger) - Logging with optional remote adapter
- [`useConfig`](docs/hooks.md#useconfig) - App-wide configuration access
- [`useNotification`](docs/hooks.md#usenotification) - Notification system access
- [`useBusy`](docs/hooks.md#usebusy) - Busy overlay control
- [`usePrint`](docs/hooks.md#useprint) - Printing and PDF generation
- [`useServiceClient`](docs/hooks.md#useserviceclient) - WebSocket RPC client access
- [`useSharedData`](docs/hooks.md#useshareddata) - Shared server-side data access
- [`useDialog`](docs/disclosure.md#dialog) - Programmatic dialog opening
- [`useDialogInstance`](docs/disclosure.md#dialog) - Access dialog instance for closing from inside dialog content
- [`createControllableSignal`](docs/hooks.md#createcontrollablesignal) - Controlled/Uncontrolled signal pattern
- [`createControllableStore`](docs/hooks.md#createcontrollablestore) - Controlled/Uncontrolled store pattern (for objects/arrays)
- [`createMountTransition`](docs/hooks.md#createmounttransition) - Mount/unmount CSS animation hook
- [`createIMEHandler`](docs/hooks.md#createimehandler) - IME composition delay handler
- [`createTopbarActions`](docs/layout.md#topbar-actions-slot) - Register actions in nearest Topbar.Container scope
- [`useTopbarActionsAccessor`](docs/layout.md#topbar-actions-slot) - Direct access to topbar actions accessor
- [`useRouterLink`](docs/hooks.md#userouterlink) - Navigation with Ctrl/Shift+click support

## Providers

- [`SystemProvider`](docs/providers.md#systemprovider) - Infrastructure provider (config, theme, logger, notification, busy, service client, shared data)
- [`DialogProvider`](docs/providers.md#dialogprovider) - Programmatic dialog provider (`useDialog`)
- [`PrintProvider`](docs/providers.md#printprovider) - Printing and PDF generation provider (`usePrint`)

## Styling

- [Semantic Colors](docs/styling.md#semantic-colors) - primary, info, success, warning, danger, base
- [Custom Sizes](docs/styling.md#custom-sizes) - Field height classes (h-field, h-field-xs, h-field-sm, h-field-lg, h-field-xl)
- [z-index Layers](docs/styling.md#z-index-layers) - Sidebar, dropdown, modal z-index values
- [Dark Mode](docs/styling.md#dark-mode) - Class-based dark mode with auto-toggle
- [Styling Patterns](docs/styling.md#styling-patterns) - clsx + twMerge usage patterns
- [Exported Style Tokens](docs/styling.md#exported-style-tokens) - TypeScript style constants (ComponentSize, SemanticTheme, themeTokens, fieldSurface, etc.)

## Helpers & Directives

- [`mergeStyles`](docs/helpers.md#mergestyles) - Merge inline style strings and CSSProperties objects
- [`splitSlots`](docs/helpers.md#splitslots) - Split children into named slots by component type
- [`ripple`](docs/helpers.md#ripple-directive) - Material Design ripple effect directive
- [`createAppStructure`](docs/hooks.md#createappstructure) - Declarative app structure (routing, menus, permissions)

---

## Demo

Check out real-world usage examples of all components in the `solid-demo` package:

```bash
pnpm dev
# http://localhost:40081 (port may vary)
```

## License

Apache-2.0
