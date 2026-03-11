# @simplysm/solid

> Simplysm package - SolidJS library

A comprehensive, enterprise-grade UI component library built on SolidJS and Tailwind CSS. Provides a full suite of form controls, data display components, layout primitives, feedback systems, and high-level CRUD abstractions for building business applications.

Key features:
- **Controlled component pattern** — `value`/`onValueChange` across all form controls
- **Compound component API** — `Select.Item`, `DataSheet.Column`, `Tabs.Tab`, etc.
- **Built-in validation** — `required`, `validate`, `lazyValidation` on every form control
- **5-level sizing** — `"xs" | "sm" | "md" | "lg" | "xl"` on all interactive components
- **Semantic theming** — `"base" | "primary" | "success" | "warning" | "danger"` color system
- **Light/Dark mode** — via `ThemeProvider` with system preference detection
- **i18n** — built-in internationalization via `I18nProvider`
- **CRUD abstractions** — `CrudSheet` and `CrudDetail` for rapid data management UIs

## Documentation

| Category | Description |
|----------|-------------|
| [Form Controls](docs/form-controls.md) | Input components — Button, TextInput, NumberInput, DatePicker, TimePicker, Textarea, Select, Combobox, Checkbox, Radio, ColorPicker, DateRangePicker, RichTextEditor, Numpad, StatePreset, ThemeToggle |
| [Layout](docs/layout.md) | Layout primitives — FormGroup, FormTable, Sidebar, Topbar |
| [Data](docs/data.md) | Data display — Table, List, Pagination, DataSheet, Calendar, Kanban |
| [Display](docs/display.md) | Display components — Card, Icon, Tag, Link, Alert, Barcode, Echarts, Progress |
| [Disclosure](docs/disclosure.md) | Disclosure components — Collapse, Dropdown, Dialog, Tabs |
| [Feedback](docs/feedback.md) | Feedback systems — Notification, Busy overlay, Print |
| [Providers](docs/providers.md) | Context providers — Config, Theme, I18n, SyncStorage, Logger, ServiceClient, SharedData, System |
| [Hooks](docs/hooks.md) | Hooks and primitives — useLocalStorage, useSyncConfig, useLogger, createControllableSignal, createMountTransition, etc. |
| [Helpers](docs/helpers.md) | Utilities — mergeStyles, createAppStructure, createSlot, createSlots, ripple directive, style constants |
| [Features](docs/features.md) | High-level components — CrudSheet, CrudDetail, SharedDataSelect, DataSelectButton, AddressSearch, PermissionTable |
