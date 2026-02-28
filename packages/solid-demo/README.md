# @simplysm/solid-demo

Simplysm package - SolidJS library demo

Development-only package. Not published to npm.

## Source Index

### App Shell

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/App.tsx` | `App` | Root application component wrapping system, dialog, and print providers | - |
| `src/appStructure.ts` | `AppStructureProvider`, `useAppStructure` | Application navigation structure definition with all demo routes | - |
| `src/main.tsx` | _(entry)_ | Application entry point; renders the router and route tree | - |

### Pages — Root

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/Home.tsx` | `Home` | Home layout shell wrapping the sidebar navigation | - |
| `src/pages/LoginPage.tsx` | `LoginPage` | Login page with credential form | - |
| `src/pages/NotFoundPage.tsx` | `NotFoundPage` | 404 fallback page | - |

### Pages — Main

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/main/MainPage.tsx` | `MainPage` | Landing page shown after login | - |

### Pages — Form Control

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/form-control/ButtonPage.tsx` | `ButtonPage` | Demo for button variants and states | - |
| `src/pages/form-control/SelectPage.tsx` | `SelectPage` | Demo for select dropdown component | - |
| `src/pages/form-control/ComboboxPage.tsx` | `ComboboxPage` | Demo for combobox with search and async options | - |
| `src/pages/form-control/FieldPage.tsx` | `FieldPage` | Demo for form field with label and validation | - |
| `src/pages/form-control/ColorPickerPage.tsx` | `ColorPickerPage` | Demo for color picker control | - |
| `src/pages/form-control/CheckBoxRadioPage.tsx` | `CheckboxRadioPage` | Demo for checkbox and radio button components | - |
| `src/pages/form-control/CheckBoxRadioGroupPage.tsx` | `CheckboxRadioGroupPage` | Demo for checkbox group and radio group components | - |
| `src/pages/form-control/DateRangePickerPage.tsx` | `DateRangePickerPage` | Demo for date range picker control | - |
| `src/pages/form-control/RichTextEditorPage.tsx` | `RichTextEditorPage` | Demo for rich text editor component | - |
| `src/pages/form-control/NumpadPage.tsx` | `NumpadPage` | Demo for numeric keypad input | - |
| `src/pages/form-control/StatePresetPage.tsx` | `StatePresetPage` | Demo for state preset selector | - |
| `src/pages/form-control/ThemeTogglePage.tsx` | `ThemeTogglePage` | Demo for light/dark theme toggle | - |

### Pages — Layout

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/layout/SidebarPage.tsx` | `SidebarPage` | Demo for sidebar navigation layout | - |
| `src/pages/layout/TopbarPage.tsx` | `TopbarPage` | Demo for top bar navigation layout | - |
| `src/pages/layout/FormGroupPage.tsx` | `FormGroupPage` | Demo for form group layout component | - |
| `src/pages/layout/FormTablePage.tsx` | `FormTablePage` | Demo for form table layout component | - |

### Pages — Data

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/data/ListPage.tsx` | `ListPage` | Demo for list component with items | - |
| `src/pages/data/TablePage.tsx` | `TablePage` | Demo for data table component | - |
| `src/pages/data/PaginationPage.tsx` | `PaginationPage` | Demo for pagination controls | - |
| `src/pages/data/SheetPage.tsx` | `SheetPage` | Demo for data sheet (spreadsheet-like) component | - |
| `src/pages/data/SheetFullPage.tsx` | `SheetFullPage` | Demo for full-page data sheet variant | - |
| `src/pages/data/KanbanPage.tsx` | `KanbanPage` | Demo for kanban board component | - |
| `src/pages/data/CalendarPage.tsx` | `CalendarPage` | Demo for calendar component | - |
| `src/pages/data/PermissionTablePage.tsx` | `PermissionTablePage` | Demo for permission matrix table | - |
| `src/pages/data/CrudSheetPage.tsx` | `CrudSheetPage` | Demo for CRUD-enabled data sheet | - |

### Pages — Disclosure

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/disclosure/CollapsePage.tsx` | `CollapsePage` | Demo for collapsible panel component | - |
| `src/pages/disclosure/DropdownPage.tsx` | `DropdownPage` | Demo for dropdown menu component | - |
| `src/pages/disclosure/DialogPage.tsx` | `ModalPage` | Demo for dialog (modal) component | - |
| `src/pages/disclosure/TabPage.tsx` | `TabPage` | Demo for tab navigation component | - |

### Pages — Display

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/display/CardPage.tsx` | `CardPage` | Demo for card container component | - |
| `src/pages/display/IconPage.tsx` | `IconPage` | Demo for icon display and search | - |
| `src/pages/display/TagPage.tsx` | `LabelPage` | Demo for tag/label component | - |
| `src/pages/display/AlertPage.tsx` | `NotePage` | Demo for alert/note component | - |
| `src/pages/display/LinkPage.tsx` | `LinkPage` | Demo for link component | - |
| `src/pages/display/BarcodePage.tsx` | `BarcodePage` | Demo for barcode rendering component | - |
| `src/pages/display/EchartsPage.tsx` | `EchartsPage` | Demo for ECharts integration | - |

### Pages — Feedback

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/feedback/NotificationPage.tsx` | `NotificationPage` | Demo for toast notification system | - |
| `src/pages/feedback/BusyPage.tsx` | `BusyPage` | Demo for busy/loading indicator | - |
| `src/pages/feedback/ProgressPage.tsx` | `ProgressPage` | Demo for progress bar component | - |
| `src/pages/feedback/PrintPage.tsx` | `PrintPage` | Demo for print layout and printing support | - |

### Pages — Service

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/service/ServiceClientPage.tsx` | `ServiceClientPage` | Demo for service client communication | - |
| `src/pages/service/SharedDataPage.tsx` | `SharedDataPage` | Demo for shared data synchronization via service | - |

### Pages — Mobile

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/pages/mobile/MobileLayoutDemoPage.tsx` | `MobileLayoutDemoPage` | Demo for mobile-specific layout components | - |

## License

Apache-2.0
