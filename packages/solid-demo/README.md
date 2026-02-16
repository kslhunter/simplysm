# @simplysm/solid-demo

Interactive demonstration of the `@simplysm/solid` component library. Showcases all form controls, layout components, data tables, dialogs, navigation, display elements, and feedback systems with live examples and working implementations.

## Overview

`solid-demo` is a SolidJS single-page application demonstrating real-world usage of every component in the `@simplysm/solid` library. It serves as both a visual reference and a testing ground for component behavior across different screen sizes and themes.

## Getting Started

Start the demo application:

```bash
pnpm dev
# http://localhost:40081 (port may vary)
```

The demo runs in Vite dev server mode with hot module replacement. Navigate between demo pages using the sidebar menu.

## Components Demonstrated

### Form Control
- **Button** -- Interactive buttons with Material Design ripple effect (sm, lg, xl sizes)
- **TextInput** -- Text fields with format masking and IME composition support
- **NumberInput** -- Number input with thousand separators
- **DatePicker / DateTimePicker / TimePicker** -- Date and time selection
- **DateRangePicker** -- Date range selection with period types
- **Textarea** -- Multi-line text input with auto-height adjustment
- **Select** -- Dropdown selection (single and multiple)
- **Combobox** -- Autocomplete search component
- **Checkbox / Radio** -- Individual toggle controls
- **CheckboxGroup / RadioGroup** -- Multi-item selection
- **ColorPicker** -- Color selection component
- **Invalid** -- Error state wrapper for form inputs
- **ThemeToggle** -- Dark/light/system mode toggle
- **RichTextEditor** -- Tiptap-based HTML editor
- **Numpad** -- Touch-friendly numeric keypad
- **StatePreset** -- Save/load screen state as presets

### Layout
- **FormGroup** -- Vertical and inline form field layout
- **FormTable** -- Table-based form layout
- **Sidebar** -- Responsive sidebar navigation (mobile overlay below 520px)
- **Topbar** -- Top navigation bar with menu support

### Display
- **Card** -- Container with shadow effect
- **Tag** -- Inline badge component
- **Alert** -- Block-level notice/alert
- **Icon** -- Tabler Icons wrapper
- **Progress** -- Progress indicator bar
- **Barcode** -- Barcode/QR code rendering
- **Echarts** -- Apache ECharts integration

### Data
- **Table** -- Basic HTML table with consistent styling
- **DataSheet** -- Advanced data table with sorting, pagination, selection, and tree expansion
- **List** -- Tree-view style list with keyboard navigation
- **Pagination** -- Page navigation component
- **Calendar** -- Calendar-style data display
- **Kanban** -- Kanban board layout

### Navigation
- **Tabs** -- Tab navigation component

### Disclosure
- **Collapse** -- Content collapse/expand animation
- **Dropdown** -- Positioned dropdown popup
- **Dialog** -- Modal dialog with drag/resize support

### Feedback
- **Notification** -- Toast notification system
- **Loading** -- Loading overlay (spinner or progress bar variants)
- **Print / usePrint** -- Browser printing and PDF generation

## Pages

- **Home** -- Overview and component library introduction
- **Login** -- Authentication page example
- **Form Controls** -- All form input components
- **Layout** -- Layout and structure components
- **Display** -- Display and visual components
- **Data** -- Data table and list components
- **Navigation** -- Tab and menu navigation
- **Disclosure** -- Dropdown, dialog, and collapse
- **Feedback** -- Notification, loading, and print
- **Service** -- API client and data sharing examples
- **Mobile Layout** -- Responsive design demonstration

## Features

- **Dark/Light Mode Toggle** -- Full theme switching support
- **Responsive Design** -- Mobile layout below 520px with sidebar overlay
- **Form Validation** -- Invalid component wrapper for error messaging
- **Form State Management** -- Preset save/load functionality
- **Real-time Interactions** -- Live component behavior demonstration
- **Service Integration** -- WebSocket client examples
- **Print/PDF Generation** -- Document generation demonstrations

## Dependencies

```json
{
  "@simplysm/solid": "workspace:*",
  "@solidjs/router": "^0.15.4",
  "@tabler/icons-solidjs": "^3.36.1",
  "clsx": "^2.1.1",
  "echarts": "^6.0.0",
  "solid-js": "^1.9.11"
}
```

## Configuration

The demo app is configured with `InitializeProvider` which automatically sets up:
- Configuration context
- Theme provider (dark/light/system)
- Notification system with banner
- Loading overlay
- Dialog support

See `src/App.tsx` for setup details.

## License

Apache-2.0
