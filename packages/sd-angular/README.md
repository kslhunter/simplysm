# @simplysm/sd-angular

Angular 20 component library for building enterprise web applications. Provides a complete set of UI components, reactive signal utilities, layout primitives, overlay system, and opinionated feature modules for CRUD data views, shared data management, and permission handling.

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

## Documentation

| Category | File | Description |
| --- | --- | --- |
| Core Setup | [docs/core-setup.md](docs/core-setup.md) | `provideSdAngular`, `sdHmrBootstrapAsync`, `SdAngularConfigProvider`, `SdGlobalErrorHandlerPlugin` |
| Core Directives & Pipes | [docs/core-directives.md](docs/core-directives.md) | `SdEventsDirective`, `SdInvalidDirective`, `SdRippleDirective`, `SdRouterLinkDirective`, `SdShowEffectDirective`, `SdItemOfTemplateDirective`, `SdTypedTemplateDirective`, `FormatPipe`, event manager plugins |
| Core Signals | [docs/core-signals.md](docs/core-signals.md) | `$signal`, `$computed`, `$effect`, `$afterRenderEffect`, `$afterRenderComputed`, `$resource`, `$mark`, `$arr`, `$obj`, `$map`, `$set` |
| Core Providers | [docs/core-providers.md](docs/core-providers.md) | `SdThemeProvider`, `SdLocalStorageProvider`, `SdSystemConfigProvider`, `SdSystemLogProvider`, `SdSharedDataProvider`, `SdServiceClientFactoryProvider`, `SdAppStructureProvider`, `SdFileDialogProvider`, `SdNavigateWindowProvider`, `SdPrintProvider` |
| Core Utilities | [docs/core-utils.md](docs/core-utils.md) | Injection helpers, router signals, setup functions, manager classes, transform functions |
| UI: Form | [docs/ui-form.md](docs/ui-form.md) | `SdButtonControl`, `SdAnchorControl`, `SdTextfieldControl`, `SdTextareaControl`, `SdCheckboxControl`, `SdSelectControl`, `SdFormControl`, and more |
| UI: Data | [docs/ui-data.md](docs/ui-data.md) | `SdListControl`, `SdSheetControl`, `SdSheetColumnDirective` |
| UI: Layout | [docs/ui-layout.md](docs/ui-layout.md) | `SdDockContainerControl`, `SdFlexDirective`, `SdGridDirective`, `SdKanbanBoardControl`, `SdViewControl`, and more |
| UI: Navigation | [docs/ui-navigation.md](docs/ui-navigation.md) | `SdCollapseControl`, `SdPaginationControl`, `SdSidebarContainerControl`, `SdTabControl`, `SdTopbarControl`, and more |
| UI: Overlay | [docs/ui-overlay.md](docs/ui-overlay.md) | `SdBusyContainerControl`, `SdDropdownControl`, `SdModalProvider`, `SdToastProvider` |
| UI: Visual | [docs/ui-visual.md](docs/ui-visual.md) | `SdBarcodeControl`, `SdCalendarControl`, `SdEchartsControl`, `SdLabelControl`, `SdNoteControl`, `SdProgressControl` |
| Features | [docs/features.md](docs/features.md) | `AbsSdDataDetail`, `AbsSdDataSheet`, `SdSharedDataSelectControl`, `SdPermissionTableControl`, `SdThemeSelectorControl` |

## Architecture Overview

```
Core Layer
  provideSdAngular          -- framework bootstrap
  $signal / $computed / ... -- reactive signal utilities
  SdThemeProvider           -- theme management (compact / mobile / kiosk + dark mode)
  SdLocalStorageProvider    -- typed localStorage wrapper
  SdServiceClientFactory    -- WebSocket client management

UI Layer
  Form       -- buttons, inputs, selects, checkboxes, rich text editor
  Data       -- list, data sheet (grid) with sorting/pagination/selection
  Layout     -- dock, flex, grid, kanban, card, pane, view/tab
  Navigation -- sidebar, topbar, tabs, collapse, pagination
  Overlay    -- busy indicator, dropdown, modal, toast
  Visual     -- barcode, calendar, echarts, label, note, progress

Feature Layer
  AbsSdDataDetail          -- abstract CRUD detail form
  AbsSdDataSheet           -- abstract CRUD list/sheet
  SdSharedDataProvider     -- real-time shared reference data
  SdAppStructureProvider   -- menu tree and permission management
  SdPermissionTableControl -- permission editor
```

## Theming

Three built-in themes controlled via `SdThemeProvider`:

- `"compact"` -- desktop-optimized dense layout
- `"mobile"` -- touch-friendly mobile layout
- `"kiosk"` -- large-touch kiosk layout

Dark mode is toggled independently. Theme and dark mode persist to localStorage automatically.

```typescript
const theme = inject(SdThemeProvider);
theme.theme.set("mobile");
theme.dark.set(true);
```

## License

MIT
