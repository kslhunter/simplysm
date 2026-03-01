# @simplysm/solid-demo

An interactive demo application for the `@simplysm/solid` SolidJS component library. It showcases all available components with live, runnable examples organized by category.

## Overview

This is a private application package (not published to npm). It serves as a visual reference and testing ground for the `@simplysm/solid` UI component library.

The app uses `@solidjs/router` with hash-based routing, a sidebar navigation layout, and supports light/dark theme switching.

## How to Run

From the monorepo root:

```bash
pnpm --filter @simplysm/solid-demo dev
```

The app starts a local development server. Open the URL shown in the terminal (typically `http://localhost:5173`).

## Application Structure

The app has the following top-level routes:

| Route | Description |
|---|---|
| `/login` | Login page (demo only, navigates to `/home` on submit) |
| `/home` | Main layout with sidebar navigation |
| `/mobile-layout-demo` | Standalone mobile layout demo |

All component demo pages are nested under `/home` and accessible via the sidebar.

## Demonstrated Components

### Form Control

| Page | Component(s) Demonstrated |
|---|---|
| Button | `Button` |
| Select | `Select` |
| Combobox | `Combobox` |
| Field | `TextInput`, `FormField` |
| ColorPicker | `ColorPicker` |
| Checkbox & Radio | `Checkbox`, `Radio` |
| CheckboxGroup & RadioGroup | `CheckboxGroup`, `RadioGroup` |
| DateRangePicker | `DateRangePicker` |
| RichTextEditor | `RichTextEditor` |
| Numpad | `Numpad` |
| StatePreset | `StatePreset` |
| ThemeToggle | `ThemeToggle` |

### Layout

| Page | Component(s) Demonstrated |
|---|---|
| Sidebar | `Sidebar` |
| Topbar | `Topbar` |
| FormGroup | `FormGroup` |
| FormTable | `FormTable` |

### Data

| Page | Component(s) Demonstrated |
|---|---|
| List | `List` |
| Table | `Table` |
| Pagination | `Pagination` |
| DataSheet | `DataSheet` |
| DataSheet (Full) | `DataSheet` (full-screen variant) |
| Kanban | `Kanban` |
| Calendar | `Calendar` |
| PermissionTable | `PermissionTable` |
| CrudSheet | `CrudSheet` |

### Disclosure

| Page | Component(s) Demonstrated |
|---|---|
| Collapse | `Collapse` |
| Dropdown | `Dropdown` |
| Dialog | `Dialog` |
| Tabs | `Tabs` |

### Display

| Page | Component(s) Demonstrated |
|---|---|
| Card | `Card` |
| Icon | `Icon` |
| Tag | `Tag` |
| Alert | `Alert` |
| Link | `Link` |
| Barcode | `Barcode` |
| Echarts | `Echarts` (Apache ECharts integration) |

### Feedback

| Page | Component(s) Demonstrated |
|---|---|
| Notification | `Notification` |
| Busy | `Busy` (loading overlay) |
| Progress | `Progress` |
| Print | `Print` |

### Service

| Page | Component(s) Demonstrated |
|---|---|
| ServiceClient | `ServiceClient` usage |
| SharedData | Shared data pattern with `@simplysm/solid` |

## Key Dependencies

- `@simplysm/solid` — the UI component library being demonstrated
- `@simplysm/core-common` — common utilities
- `@solidjs/router` — client-side routing
- `@tabler/icons-solidjs` — icon set
- `echarts` — charting library (used in the Echarts demo page)
- `tailwindcss` — utility-first CSS (dev dependency)
