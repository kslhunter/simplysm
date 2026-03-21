# @simplysm/solid

SolidJS + Tailwind CSS UI component library for building enterprise web applications.

## Installation

```bash
npm install @simplysm/solid
```

## API Overview

### Form Controls

| API | Type | Description |
|-----|------|-------------|
| `Button` | Component | Themed button with ripple effect |
| `Select` | Component | Single/multiple select dropdown |
| `Select.Item` | Sub-component | Selectable item within Select |
| `Select.Header` | Sub-component | Custom header slot for Select dropdown |
| `Select.Action` | Sub-component | Action button appended to Select trigger |
| `Select.ItemTemplate` | Sub-component | Render template for items in `items` mode |
| `Combobox` | Component | Autocomplete with async search |
| `Combobox.Item` | Sub-component | Selectable item within Combobox |
| `Combobox.ItemTemplate` | Sub-component | Render template for loaded items |
| `TextInput` | Component | Text input field with format support |
| `TextInput.Prefix` | Sub-component | Prefix slot for TextInput |
| `NumberInput` | Component | Numeric input with grouping and formatting |
| `NumberInput.Prefix` | Sub-component | Prefix slot for NumberInput |
| `DatePicker` | Component | Date input (year/month/date units) |
| `DateTimePicker` | Component | DateTime input (minute/second units) |
| `TimePicker` | Component | Time input (minute/second units) |
| `Textarea` | Component | Auto-resizing textarea |
| `Checkbox` | Component | Checkbox with indicator |
| `Radio` | Component | Radio button with indicator |
| `CheckboxGroup` | Component | Multi-select checkbox group |
| `CheckboxGroup.Item` | Sub-component | Item within CheckboxGroup |
| `RadioGroup` | Component | Single-select radio group |
| `RadioGroup.Item` | Sub-component | Item within RadioGroup |
| `ColorPicker` | Component | Native color picker input |
| `DateRangePicker` | Component | Date range with period type selector |
| `RichTextEditor` | Component | Tiptap-based rich text editor |
| `Numpad` | Component | Numeric keypad for touch input |
| `StatePreset` | Component | Save/restore state presets to storage |
| `ThemeToggle` | Component | Light/system/dark theme cycle button |
| `Invalid` | Component | Validation indicator wrapper |
| `fieldSurface`, `fieldBaseClass`, `fieldSizeClasses`, `fieldInputClass` | Style export | Field style tokens |
| `getFieldWrapperClass`, `getTextareaWrapperClass` | Function | Field wrapper class builders |
| `checkboxBaseClass`, `indicatorBaseClass`, `checkedClass`, `checkboxSizeClasses` | Style export | Checkbox style tokens |

-> See [docs/form-control.md](./docs/form-control.md) for details.

### Layout

| API | Type | Description |
|-----|------|-------------|
| `FormGroup` | Component | Vertical/inline form field group |
| `FormGroup.Item` | Sub-component | Labeled form group item |
| `FormTable` | Component | Table-based form layout |
| `FormTable.Row` | Sub-component | Table row |
| `FormTable.Item` | Sub-component | Labeled table cell |
| `Sidebar` | Component | Collapsible sidebar panel |
| `Sidebar.Container` | Sub-component | Sidebar + content layout container |
| `Sidebar.Menu` | Sub-component | Recursive menu with route matching |
| `Sidebar.User` | Sub-component | User info with dropdown menu |
| `Topbar` | Component | Top navigation bar |
| `Topbar.Container` | Sub-component | Topbar + content layout container |
| `Topbar.Menu` | Sub-component | Dropdown navigation menu |
| `Topbar.User` | Sub-component | User info with dropdown |
| `Topbar.Actions` | Sub-component | Displays actions from useTopbarActions() |
| `useTopbarActions()` | Hook | Register topbar action elements |
| `useTopbarActionsAccessor()` | Hook | Read topbar actions signal |

-> See [docs/layout.md](./docs/layout.md) for details.

### Data

| API | Type | Description |
|-----|------|-------------|
| `Table` | Component | Styled HTML table |
| `Table.Row` | Sub-component | Table row |
| `Table.HeaderCell` | Sub-component | Table header cell |
| `Table.Cell` | Sub-component | Table data cell |
| `List` | Component | Vertical list container |
| `ListContext` | Context | List nesting level context |
| `useListContext()` | Hook | Access list context |
| `Pagination` | Component | Page navigation controls |
| `DataSheet` | Component | Spreadsheet-like data grid |
| `DataSheet.Column` | Sub-component | Column definition |
| `Calendar` | Component | Month calendar with value items |
| `Kanban` | Component | Kanban board with drag-and-drop |
| `Kanban.Lane` | Sub-component | Kanban lane |
| `Kanban.Card` | Sub-component | Draggable card |

-> See [docs/data.md](./docs/data.md) for details.

### Display

| API | Type | Description |
|-----|------|-------------|
| `Barcode` | Component | SVG barcode renderer (bwip-js) |
| `BarcodeType` | Type | Union of supported barcode formats |
| `Card` | Component | Elevated card container |
| `Echarts` | Component | Apache ECharts wrapper |
| `Icon` | Component | Tabler icon wrapper |
| `Tag` | Component | Themed inline tag/badge |
| `Link` | Component | Themed anchor link |
| `Alert` | Component | Themed alert box |

-> See [docs/display.md](./docs/display.md) for details.

### Disclosure

| API | Type | Description |
|-----|------|-------------|
| `Collapse` | Component | Animated expand/collapse container |
| `Dropdown` | Component | Positioned popup with trigger |
| `Dropdown.Trigger` | Sub-component | Click target for dropdown |
| `Dropdown.Content` | Sub-component | Popup content |
| `Dialog` | Component | Modal/float dialog with drag/resize |
| `Dialog.Header` | Sub-component | Dialog title bar |
| `Dialog.Action` | Sub-component | Header action buttons |
| `DialogProvider` | Component | Programmatic dialog provider |
| `useDialog()` | Hook | Open dialogs programmatically |
| `DialogDefaultsContext` | Context | Default dialog configuration |
| `Tabs` | Component | Tab bar container |
| `Tabs.Tab` | Sub-component | Individual tab |

-> See [docs/disclosure.md](./docs/disclosure.md) for details.

### Feedback

| API | Type | Description |
|-----|------|-------------|
| `Progress` | Component | Themed progress bar |
| `NotificationProvider` | Component | Notification system provider |
| `useNotification()` | Hook | Create/manage notifications |
| `NotificationBell` | Component | Bell icon with unread badge + dropdown |
| `NotificationBanner` | Component | Toast-style notification banner |
| `BusyProvider` | Component | Global loading overlay provider |
| `useBusy()` | Hook | Show/hide loading overlay |
| `BusyContainer` | Component | Local loading overlay container |
| `PrintProvider` | Component | Print/PDF generation provider |
| `usePrint()` | Hook | Print to printer or generate PDF |
| `usePrintInstance()` | Hook | Signal ready state in print content |
| `Print` | Component | Print content wrapper |
| `Print.Page` | Sub-component | Page break boundary |

-> See [docs/feedback.md](./docs/feedback.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `AddressSearchContent` | Component | Korean address search (Daum Postcode) |
| `SharedDataSelect` | Component | Select bound to shared data |
| `SharedDataSelectButton` | Component | Button that opens shared data dialog |
| `SharedDataSelectList` | Component | List bound to shared data |
| `DataSelectButton` | Component | Button that opens a data selection dialog |
| `CrudSheet` | Component | Full CRUD data grid |
| `CrudSheet.Column` | Sub-component | Column definition for CrudSheet |
| `CrudSheet.Filter` | Sub-component | Filter panel slot |
| `CrudSheet.Tools` | Sub-component | Toolbar slot |
| `CrudDetail` | Component | CRUD detail form |
| `CrudDetail.Header` | Sub-component | Detail header slot |
| `PermissionTable` | Component | Permission matrix table |

-> See [docs/features.md](./docs/features.md) for details.

### Providers

| API | Type | Description |
|-----|------|-------------|
| `ConfigContext` | Context | App configuration (clientName) |
| `useConfig()` | Hook | Access app config |
| `ConfigProvider` | Component | Provides app config |
| `SyncStorageProvider` | Component | Pluggable storage provider |
| `useSyncStorage()` | Hook | Access sync storage adapter |
| `LoggerProvider` | Component | Logging adapter provider |
| `ThemeProvider` | Component | Light/dark/system theme provider |
| `useTheme()` | Hook | Access theme mode and toggle |
| `ServiceClientProvider` | Component | Service client connection provider |
| `useServiceClient()` | Hook | Access service client |
| `SystemProvider` | Component | Composite provider (bundles common providers) |
| `I18nProvider` | Component | Internationalization provider |
| `useI18n()` | Hook | Access translation functions |
| `SharedDataProvider` | Component | Shared data cache provider |
| `useSharedData()` | Hook | Access shared data definitions |
| `SharedDataChangeEvent` | Event | Event emitted on shared data changes |

-> See [docs/providers.md](./docs/providers.md) for details.

### Hooks

| API | Type | Description |
|-----|------|-------------|
| `useLocalStorage` | Hook | localStorage-backed reactive signal |
| `useSyncConfig` | Hook | Storage-synced config signal |
| `useLogger` | Hook | Logging with pluggable adapter |
| `createControllableSignal` | Hook | Controlled/uncontrolled signal pattern |
| `createControllableStore` | Hook | Controlled/uncontrolled store pattern |
| `createIMEHandler` | Hook | IME composition handling for inputs |
| `createMountTransition` | Hook | Mount/unmount animation state |
| `useRouterLink` | Hook | Router navigation with modifier keys |

-> See [docs/hooks.md](./docs/hooks.md) for details.

### Helpers

| API | Type | Description |
|-----|------|-------------|
| `mergeStyles` | Function | Merge CSS style objects and strings |
| `createAppStructure` | Function | Build app menus, routes, and permissions |
| `createSlot` | Function | Single-item slot pattern |
| `createSlots` | Function | Multi-item slot pattern |

-> See [docs/helpers.md](./docs/helpers.md) for details.

### Styles + Directives

| API | Type | Description |
|-----|------|-------------|
| `border`, `bg`, `text` | Style tokens | Base design tokens |
| `state`, `ComponentSize`, `pad`, `gap` | Style tokens | Control design tokens |
| `themeTokens`, `SemanticTheme` | Style tokens | Theme color tokens |
| `ripple` | Directive | Pointer ripple effect |

-> See [docs/styles.md](./docs/styles.md) for details.

## Usage Examples

### Basic Form

```tsx
import { createSignal } from "solid-js";
import { TextInput, NumberInput, Button, Select } from "@simplysm/solid";

function OrderForm() {
  const [name, setName] = createSignal("");
  const [quantity, setQuantity] = createSignal<number>();
  const [status, setStatus] = createSignal<string>();

  return (
    <FormGroup>
      <FormGroup.Item label="Name">
        <TextInput value={name()} onValueChange={setName} required />
      </FormGroup.Item>
      <FormGroup.Item label="Quantity">
        <NumberInput value={quantity()} onValueChange={setQuantity} min={1} />
      </FormGroup.Item>
      <FormGroup.Item label="Status">
        <Select value={status()} onValueChange={setStatus} renderValue={(v) => v}>
          <Select.Item value="pending">Pending</Select.Item>
          <Select.Item value="confirmed">Confirmed</Select.Item>
        </Select>
      </FormGroup.Item>
      <Button theme="primary" variant="solid">Submit</Button>
    </FormGroup>
  );
}
```

### Dialog + Notification

```tsx
import { useDialog, useNotification, Button } from "@simplysm/solid";

function MyPage() {
  const dialog = useDialog();
  const notification = useNotification();

  const handleOpen = async () => {
    const result = await dialog.show(
      MyDialogContent,
      { title: "Edit Item" },
      { header: "Edit", resizable: true },
    );
    if (result) {
      notification.success("Saved", "Item saved successfully.");
    }
  };

  return <Button onClick={handleOpen}>Open Editor</Button>;
}
```

### Sidebar + Topbar Layout

```tsx
import { Sidebar, Topbar, ThemeToggle, NotificationBell } from "@simplysm/solid";

function AppLayout() {
  return (
    <div class="h-screen">
      <Sidebar.Container>
        <Sidebar>
          <Sidebar.User name="Admin" description="admin@example.com" />
          <Sidebar.Menu menus={appMenus} />
        </Sidebar>
        <Topbar.Container>
          <Topbar>
            <h1 class="text-lg font-bold">My App</h1>
            <Topbar.Menu menus={navMenus} />
            <div class="flex-1" />
            <NotificationBell />
            <ThemeToggle />
          </Topbar>
          <main class="flex-1 overflow-auto p-4">
            {/* Page content */}
          </main>
        </Topbar.Container>
      </Sidebar.Container>
    </div>
  );
}
```

### Data Table with Busy State

```tsx
import { DataSheet, BusyContainer, Pagination, useBusy } from "@simplysm/solid";

function DataPage() {
  const busy = useBusy();

  const loadData = async () => {
    busy.show();
    try {
      // fetch data
    } finally {
      busy.hide();
    }
  };

  return (
    <BusyContainer busy={loading()}>
      <DataSheet items={items()} getItemKey={(item) => item.id}>
        <DataSheet.Column header="Name" key="name">
          {(ctx) => ctx.item.name}
        </DataSheet.Column>
        <DataSheet.Column header="Value" key="value" align="right">
          {(ctx) => ctx.item.value}
        </DataSheet.Column>
      </DataSheet>
      <Pagination page={page()} onPageChange={setPage} totalPageCount={10} />
    </BusyContainer>
  );
}
```
