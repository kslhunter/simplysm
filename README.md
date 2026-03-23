# Simplysm

A Yarn 4 monorepo containing 21 packages for building full-stack TypeScript applications with Angular, ORM, service communication, and mobile plugins. Published to npm as `@simplysm/*`.

## Packages

### Core

| Package | Description |
|---------|-------------|
| [`@simplysm/sd-core-common`](./packages/sd-core-common) | Core utilities (common) - date/time, errors, string/object/number utils, decorators, extensions |
| [`@simplysm/sd-core-browser`](./packages/sd-core-browser) | Core utilities (browser) - DOM element helpers, Blob extensions |
| [`@simplysm/sd-core-node`](./packages/sd-core-node) | Core utilities (node) - file system, logging, process, path, worker management |

### UI

| Package | Description |
|---------|-------------|
| [`@simplysm/sd-angular`](./packages/sd-angular) | Angular component library - 90+ UI components, directives, providers, and reactive signal utilities |

### Service

| Package | Description |
|---------|-------------|
| [`@simplysm/sd-service-common`](./packages/sd-service-common) | Service communication protocol types and service interfaces |
| [`@simplysm/sd-service-client`](./packages/sd-service-client) | Service client - WebSocket-based RPC, file upload/download, event system |
| [`@simplysm/sd-service-server`](./packages/sd-service-server) | Service server - Fastify-based server with JWT auth, ORM, SMTP, and WebSocket support |

### ORM

| Package | Description |
|---------|-------------|
| [`@simplysm/sd-orm-common`](./packages/sd-orm-common) | ORM common - query builder, queryable, decorators, type definitions |
| [`@simplysm/sd-orm-common-ext`](./packages/sd-orm-common-ext) | ORM extensions - system models (User, Authentication, SystemLog, etc.) |
| [`@simplysm/sd-orm-node`](./packages/sd-orm-node) | ORM node implementations - MySQL, MSSQL, SQLite connections |

### Tools

| Package | Description |
|---------|-------------|
| [`@simplysm/sd-cli`](./packages/sd-cli) | CLI build tool - watch, build, check, publish commands for the monorepo |
| [`@simplysm/eslint-plugin`](./packages/eslint-plugin) | ESLint plugin with 9 custom rules for Simplysm projects |
| [`@simplysm/sd-excel`](./packages/sd-excel) | Excel module - read/write .xlsx files with cell styling, formulas, and images |
| [`@simplysm/sd-storage`](./packages/sd-storage) | Storage module - FTP/SFTP file operations |

### Mobile - Capacitor

| Package | Description |
|---------|-------------|
| [`@simplysm/capacitor-plugin-auto-update`](./packages/capacitor-plugin-auto-update) | Capacitor plugin - APK installation and OTA auto-update |
| [`@simplysm/capacitor-plugin-broadcast`](./packages/capacitor-plugin-broadcast) | Capacitor plugin - Android broadcast send/receive for industrial devices |
| [`@simplysm/capacitor-plugin-file-system`](./packages/capacitor-plugin-file-system) | Capacitor plugin - Full file system access with permission management |
| [`@simplysm/capacitor-plugin-usb-storage`](./packages/capacitor-plugin-usb-storage) | Capacitor plugin - USB mass storage device interaction |

### Mobile - Cordova (Legacy)

| Package | Description |
|---------|-------------|
| [`@simplysm/cordova-plugin-auto-update`](./packages/cordova-plugin-auto-update) | Cordova plugin (legacy) - APK installation and OTA auto-update |
| [`@simplysm/cordova-plugin-file-system`](./packages/cordova-plugin-file-system) | Cordova plugin (legacy) - File system access |
| [`@simplysm/cordova-plugin-usb-storage`](./packages/cordova-plugin-usb-storage) | Cordova plugin (legacy) - USB storage access |
