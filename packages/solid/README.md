# @simplysm/solid

SolidJS + Tailwind CSS UI component library for building enterprise web applications.

## Installation

```bash
npm install @simplysm/solid
```

## API Overview

### Form Control
| API | Type | Description |
|-----|------|-------------|
| `Button` | Component | Themed button with ripple effect |
| `Select` | Component | Dropdown select (single/multiple, search, tree) |
| `Select.Item` | Sub-component | Selectable item in Select dropdown |
| `Select.Header` | Sub-component | Custom header slot in Select dropdown |
| `Select.Action` | Sub-component | Action button appended to Select trigger |
| `Select.ItemTemplate` | Sub-component | Template function for items mode |
| `SelectContext` | Context | Select state context |
| `Combobox` | Component | Async autocomplete with debounced search |
| `Combobox.Item` | Sub-component | Selectable item in Combobox dropdown |
| `Combobox.ItemTemplate` | Sub-component | Template function for Combobox items |
| `ComboboxContext` | Context | Combobox state context |
| `TextInput` | Component | Text input with format masking and IME handling |
| `TextInput.Prefix` | Sub-component | Prefix slot for TextInput |
| `TextInputPrefix` | Component | Standalone prefix slot component |
| `NumberInput` | Component | Numeric input with thousand separator |
| `NumberInput.Prefix` | Sub-component | Prefix slot for NumberInput |
| `NumberInputPrefix` | Component | Standalone prefix slot component |
| `DatePicker` | Component | Date input (year/month/date units) |
| `DateTimePicker` | Component | DateTime input (minute/second units) |
| `TimePicker` | Component | Time input (minute/second units) |
| `Textarea` | Component | Auto-resizing textarea |
| `Checkbox` | Component | Checkbox toggle |
| `Radio` | Component | Radio button |
| `CheckboxGroup` | Component | Multi-value checkbox group |
| `CheckboxGroup.Item` | Sub-component | Individual checkbox in group |
| `RadioGroup` | Component | Single-value radio group |
| `RadioGroup.Item` | Sub-component | Individual radio in group |
| `ColorPicker` | Component | Native color picker |
| `DateRangePicker` | Component | Date range with period type selector |
| `RichTextEditor` | Component | WYSIWYG editor (TipTap) |
| `Numpad` | Component | On-screen number pad |
| `StatePreset` | Component | Save/restore named state presets |
| `ThemeToggle` | Component | Light/system/dark theme toggle |
| `Invalid` | Component | Validation error indicator wrapper |
| `Field.styles` | Styles | Shared form field style utilities |
| `Checkbox.styles` | Styles | Shared checkbox/radio style constants |

> See [docs/form-control.md](./docs/form-control.md) for details.

### Layout
| API | Type | Description |
|-----|------|-------------|
| `FormGroup` | Component | Vertical/inline form field grouping |
| `FormGroup.Item` | Sub-component | Labeled form field |
| `FormTable` | Component | Table-based form layout |
| `FormTable.Row` | Sub-component | Form table row |
| `FormTable.Item` | Sub-component | Form table cell with label |
| `Sidebar` | Component | Responsive sidebar navigation |
| `Sidebar.Container` | Sub-component | Root container with toggle context |
| `Sidebar.Menu` | Sub-component | Recursive navigation menu |
| `Sidebar.User` | Sub-component | User info with dropdown |
| `useSidebar` | Hook | Access sidebar toggle state |
| `Topbar` | Component | Top navigation bar |
| `Topbar.Container` | Sub-component | Layout container with actions context |
| `Topbar.Menu` | Sub-component | Responsive dropdown menu |
| `Topbar.User` | Sub-component | User section with dropdown |
| `Topbar.Actions` | Sub-component | Dynamic actions display |
| `useTopbarActions` | Hook | Register dynamic topbar actions |
| `useTopbarActionsAccessor` | Hook | Read registered actions |

> See [docs/layout.md](./docs/layout.md) for details.

### Data
| API | Type | Description |
|-----|------|-------------|
| `Table` | Component | Simple HTML table with borders |
| `Table.Row` / `Table.HeaderCell` / `Table.Cell` | Sub-components | Table elements |
| `List` | Component | List container with keyboard navigation |
| `List.Item` | Sub-component | Interactive list item |
| `ListContext` / `useListContext` | Context/Hook | List nesting level |
| `ListItem.styles` | Styles | List item style constants |
| `Pagination` | Component | Page navigation |
| `DataSheet` | Component | Feature-rich data grid |
| `DataSheet.styles` | Styles | DataSheet style constants |
| `DataSheet.types` | Types | DataSheet type definitions |
| `Calendar` | Component | Monthly calendar grid |
| `Kanban` | Component | Drag-and-drop kanban board |
| `KanbanContext` / `useKanbanContext` | Context/Hook | Board-level context |
| `KanbanLaneContext` / `useKanbanLaneContext` | Context/Hook | Lane-level context |

> See [docs/data.md](./docs/data.md) for details.

### Display
| API | Type | Description |
|-----|------|-------------|
| `Barcode` | Component | SVG barcode renderer (100+ formats) |
| `BarcodeType` | Type | Barcode format union type |
| `Card` | Component | Surface container with shadow |
| `Echarts` | Component | Apache ECharts wrapper |
| `Icon` | Component | Tabler Icons wrapper |
| `Tag` | Component | Inline badge with theme colors |
| `Link` | Component | Styled anchor element |
| `Alert` | Component | Block-level alert container |

> See [docs/display.md](./docs/display.md) for details.

### Disclosure
| API | Type | Description |
|-----|------|-------------|
| `Collapse` | Component | Animated collapsible container |
| `Dropdown` | Component | Popup dropdown with auto-positioning |
| `Dropdown.Trigger` / `Dropdown.Content` | Sub-components | Trigger and content slots |
| `Dialog` | Component | Modal/float dialog with drag and resize |
| `Dialog.Header` / `Dialog.Action` | Sub-components | Header and action slots |
| `DialogProvider` | Component | Programmatic dialog provider |
| `useDialog` | Hook | Programmatic dialog access |
| `DialogContext` / `DialogDefaultsContext` | Contexts | Dialog state contexts |
| `Tabs` | Component | Tab bar with underline indicator |
| `Tabs.Tab` | Sub-component | Individual tab button |

> See [docs/disclosure.md](./docs/disclosure.md) for details.

### Feedback
| API | Type | Description |
|-----|------|-------------|
| `NotificationProvider` | Component | Notification system provider |
| `useNotification` | Hook | Access notification system |
| `NotificationBell` | Component | Bell icon with unread count |
| `NotificationBanner` | Component | Fixed-position notification banner |
| `BusyProvider` | Component | Busy overlay provider |
| `useBusy` | Hook | Access busy overlay |
| `BusyContainer` | Component | Inline loading overlay |
| `PrintProvider` | Component | Print-to-printer/PDF provider |
| `usePrint` / `usePrintInstance` | Hooks | Print access |
| `Print` / `Print.Page` | Components | Print content wrappers |
| `Progress` | Component | Progress bar |

> See [docs/feedback.md](./docs/feedback.md) for details.

### Providers
| API | Type | Description |
|-----|------|-------------|
| `ConfigContext` / `ConfigProvider` / `useConfig` | Context | App-wide configuration |
| `SyncStorageProvider` / `SyncStorageContext` / `useSyncStorage` | Provider | Configurable storage adapter |
| `LoggerProvider` / `LoggerContext` | Provider | Logger adapter |
| `ThemeProvider` / `useTheme` | Provider/Hook | Theme mode management |
| `ServiceClientProvider` / `ServiceClientContext` / `useServiceClient` | Provider | WebSocket service client |
| `SharedDataProvider` | Provider | Reactive shared data subscriptions |
| `SharedDataChangeEvent` | Event | Server-client data change event |
| `SystemProvider` | Provider | All-in-one provider composition |
| `I18nProvider` / `useI18n` | Provider/Hook | Internationalization |

> See [docs/providers.md](./docs/providers.md) for details.

### Hooks
| API | Type | Description |
|-----|------|-------------|
| `useLocalStorage` | Hook | localStorage-based storage |
| `useSyncConfig` | Hook | Reactive storage sync |
| `useLogger` | Hook | Logging with configurable adapter |
| `createControllableSignal` | Hook | Controlled/uncontrolled signal pattern |
| `createControllableStore` | Hook | Controlled/uncontrolled store pattern |
| `createIMEHandler` | Hook | IME composition handling |
| `createMountTransition` | Hook | Mount/unmount CSS transition |
| `useRouterLink` | Hook | Router navigation with modifier keys |

> See [docs/hooks.md](./docs/hooks.md) for details.

### Styles
| API | Type | Description |
|-----|------|-------------|
| `border` / `bg` / `text` | Tokens | Base design tokens |
| `ComponentSize` / `state` / `pad` / `gap` | Tokens | Control design tokens |
| `SemanticTheme` / `themeTokens` | Tokens | Theme color tokens |

> See [docs/styles.md](./docs/styles.md) for details.

### Directives
| API | Type | Description |
|-----|------|-------------|
| `ripple` | Directive | Material-design ripple effect |

> See [docs/styles.md](./docs/styles.md) for details.

### Helpers
| API | Type | Description |
|-----|------|-------------|
| `mergeStyles` | Function | Merge CSS style objects/strings |
| `createAppStructure` | Function | App navigation structure factory |
| `createSlot` | Function | Single-occupancy slot pattern |
| `createSlots` | Function | Multi-occupancy slot pattern |
| `startPointerDrag` | Function | Pointer capture drag helper |

> See [docs/helpers.md](./docs/helpers.md) for details.

### Features
| API | Type | Description |
|-----|------|-------------|
| `AddressSearchContent` | Component | Korean address search (Daum API) |
| `SharedDataSelect` | Component | Select with SharedData integration |
| `SharedDataSelectButton` | Component | Button select with SharedData |
| `SharedDataSelectList` | Component | List select with SharedData |
| `DataSelectButton` | Component | Generic dialog-based select button |
| `CrudSheet` | Component | Full CRUD data grid |
| `CrudDetail` | Component | CRUD detail view |
| `PermissionTable` | Component | Permission management table |

> See [docs/features.md](./docs/features.md) for details.

## Usage Examples

### Button with theme

```tsx
import { Button } from "@simplysm/solid";

<Button theme="primary" variant="solid" size="md" onClick={handleClick}>
  Save
</Button>
```

### Select with items

```tsx
import { Select } from "@simplysm/solid";

<Select
  items={users}
  value={selectedUser()}
  onValueChange={setSelectedUser}
  renderValue={(u) => u.name}
>
  <Select.ItemTemplate>
    {(user) => <>{user.name} ({user.email})</>}
  </Select.ItemTemplate>
</Select>
```

### Dialog (programmatic)

```tsx
import { useDialog } from "@simplysm/solid";

const dialog = useDialog();

const result = await dialog.show(
  MyDialogContent,
  { title: "Edit Item" },
  { header: "Edit", resizable: true, width: 600 },
);
```
