# SIMPLYSM

Signal-based Angular UI framework and enterprise-grade full-stack platform.

## Overview

SIMPLYSM is an integrated development platform consisting of an **Angular 20+ Signal-based** UI framework, a **Fastify 5.x** backend, an ORM, and mobile plugins. It is designed for enterprise admin UIs, business systems, and large-scale feature-based projects.

## Dependencies

- **Angular**: 20.x
- **TypeScript**: 5.8.x
- **Node.js**: 20.x
- **Yarn**: 4.12.0

## Installation

```bash
# Clone the repository
git clone https://github.com/kslhunter/simplysm.git

# Install dependencies
yarn install
```

### Installing individual packages

```bash
# UI framework
npm install @simplysm/sd-angular

# Backend server
npm install @simplysm/sd-service-server

# ORM (with the required DB driver)
npm install @simplysm/sd-orm-node mysql2
```

## Package Structure

### Core Packages

| Package                     | Description                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `@simplysm/sd-core-common`  | Base utilities (XML, YAML, ZIP, reflection, custom types: DateTime, DateOnly, Time, Uuid) |
| `@simplysm/sd-core-browser` | Browser environment utilities                                                             |
| `@simplysm/sd-core-node`    | Node.js environment utilities (filesystem, workers)                                       |

### UI Framework

| Package                       | Description                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@simplysm/sd-angular`        | Signal-based Angular UI components (forms, layouts, data, navigation, overlays, visuals, barcode, QR, charts, PDF, rich text editor) |
| `@simplysm/sd-service-client` | WebSocket client for service communication                                                                                           |

### Backend

| Package                       | Description                                                    |
| ----------------------------- | -------------------------------------------------------------- |
| `@simplysm/sd-service-server` | Fastify REST/WebSocket server (JWT auth, email via nodemailer) |
| `@simplysm/sd-service-common` | Shared service types and protocol definitions                  |
| `@simplysm/sd-storage`        | FTP/SFTP storage module                                        |

### Database

| Package                   | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| `@simplysm/sd-orm-common` | ORM contracts and query builder                                 |
| `@simplysm/sd-orm-node`   | Node.js ORM implementation (SQLite3, MySQL2, MSSQL via Tedious) |

### Utilities

| Package                   | Description                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `@simplysm/sd-excel`      | Excel file processing (XLSX export/import)                                                               |
| `@simplysm/sd-cli`        | Build CLI (watch, build, publish, lint orchestration for Library, Angular, Electron, Cordova, Capacitor) |
| `@simplysm/eslint-plugin` | Custom ESLint rules (including sd-control attribute validation)                                          |

### Mobile Plugins

**Capacitor** (iOS/Android):

- `@simplysm/capacitor-plugin-auto-update` - OTA updates
- `@simplysm/capacitor-plugin-broadcast` - Intent broadcast (Android only)
- `@simplysm/capacitor-plugin-file-system` - File system access
- `@simplysm/capacitor-plugin-usb-storage` - USB storage access

**Cordova** (deprecated — migrating to Capacitor):

- `@simplysm/cordova-plugin-auto-update` _(deprecated)_
- `@simplysm/cordova-plugin-file-system` _(deprecated)_
- `@simplysm/cordova-plugin-usb-storage` _(deprecated)_

> **Note:** `@simplysm/sd-orm-common-ext` is also **deprecated** and must not be used.

## Package Dependency Structure

```
sd-core-common (base: utilities, reflection, xml, yaml, zip)
├── sd-core-browser → sd-angular (UI framework)
├── sd-core-node → sd-orm-node, sd-service-server
├── sd-orm-common → sd-orm-node, sd-service-common
├── sd-service-common → sd-service-server, sd-service-client
└── sd-excel, sd-storage (standalone utilities)
```

## Development

```bash
# Development mode (watch)
yarn watch

# Production build
yarn build

# Publish to npm
yarn publish

# Auto-fix lint errors
yarn eslint:fix

# Reinstall dependencies
yarn reinstall

# Run all tests
vitest

# Run specific test file
vitest run <pattern>
```

The build system uses `sd-cli` (custom CLI tool). All commands run via `tsx` with 8 GB memory allocated.

## sd-angular Usage

### Initial Setup

```typescript
import { provideSdAngular } from "@simplysm/sd-angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({
      defaultTheme: "compact",
      defaultDark: false,
    }),
  ],
});
```

### Component Usage

```html
<sd-form>
  <sd-textfield label="Name" />
  <sd-select label="Type" [items]="types" />
  <sd-button (click)="save()">Save</sd-button>
</sd-form>

<sd-sheet [items]="rows" (itemSelect)="onSelect($event)" />
```

### Themes

Three layout themes are available: `compact`, `mobile`, `kiosk`. Dark mode is a separate boolean toggle independent of the theme.

```html
<sd-theme-selector></sd-theme-selector>
```

### Icons

Uses `@ng-icons/tabler-icons` from the `ng-icons` package (not FontAwesome).
Browse available icons at [Tabler Icons](https://ng-icons.github.io/ng-icons/#/browse-icons?iconset=tablerTools).

## Code Conventions

- **State management**: Angular Signals only (no RxJS for state; RxJS is used for HTTP/WebSocket).
- **Icon library**: `@ng-icons/tabler-icons` (not FontAwesome).
- **Async functions**: Do not add an `Async` suffix — async is the default. Use `Sync` suffix only when a synchronous counterpart exists.
- **Package manager**: Yarn 4.12.0 (workspaces).
- **npm scope**: All packages use the `@simplysm/` scope.

## Migration Notes

### 12.15.x → 12.16.x

- Most ESLint errors can be auto-fixed with `yarn eslint:fix`.
- **Icon system change**: FontAwesome → ng-icons (`@ng-icons/tabler-icons`).
  - [Browse Tabler Icons](https://ng-icons.github.io/ng-icons/#/browse-icons?iconset=tablerTools)
  - Existing FontAwesome usage remains functional; only the `[icon]` attribute on sd-angular controls needs updating.
- **Cordova plugins deprecated**: All three Cordova plugins are now deprecated. Use the equivalent Capacitor plugins instead.

### 12.14.x → 12.15.x

- `sd-dock-container` and `sd-dock` controls restored.
- Layout controls (directives) changed: `sd-flex`, `sd-form-*`, `sd-grid`, `sd-card`, `sd-pane`, `sd-table`.
  - Can be used as tags, attributes, or class-based.
  - Some controls changed to directives (import updates required).
- ESLint rules added for sd-control attributes.
  - Auto-fixable with `yarn eslint:fix`.

## License

MIT

## Contributing

Issues and PRs are welcome at [GitHub](https://github.com/kslhunter/simplysm).
