# Simplysm

A TypeScript full-stack framework monorepo.
Managed with pnpm workspaces, it provides SolidJS UI components, ORM, service communication, Excel processing, and more.

## Design Philosophy

- **Standard patterns first** -- Leverage idiomatic TypeScript/JavaScript/SolidJS patterns to minimize the learning curve.
- **Explicit and predictable code** -- Favor explicit code over implicit behavior.
- **Incremental adoption** -- Each package is independently usable; learn and adopt only what you need.

## Packages

### Core

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/core-common`](packages/core-common/README.md) | neutral | Common utilities, custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`), error classes |
| [`@simplysm/core-browser`](packages/core-browser/README.md) | browser | Browser-specific extensions |
| [`@simplysm/core-node`](packages/core-node/README.md) | node | Node.js utilities (filesystem, worker threads) |

### ORM

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/orm-common`](packages/orm-common/README.md) | neutral | ORM query builder, table schema definitions |
| [`@simplysm/orm-node`](packages/orm-node/README.md) | node | DB connectors (MySQL, MSSQL, PostgreSQL) |

### Service

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/service-common`](packages/service-common/README.md) | neutral | Service protocol, type definitions |
| [`@simplysm/service-client`](packages/service-client/README.md) | neutral | WebSocket client |
| [`@simplysm/service-server`](packages/service-server/README.md) | node | Fastify-based HTTP/WebSocket server |

### UI

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/solid`](packages/solid/README.md) | browser | SolidJS UI components + Tailwind CSS |

### Tools

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/sd-cli`](packages/sd-cli/README.md) | node | Build, lint, typecheck CLI tool |
| [`@simplysm/claude`](packages/claude/README.md) | - | Claude Code skills/agents (auto-installs via postinstall) |
| [`@simplysm/eslint-plugin`](packages/eslint-plugin/README.md) | node | Custom ESLint rules |
| [`@simplysm/excel`](packages/excel/README.md) | neutral | Excel (.xlsx) read/write |
| [`@simplysm/storage`](packages/storage/README.md) | node | FTP/SFTP client |

### Capacitor Plugins

| Package | Description |
|---------|-------------|
| [`@simplysm/capacitor-plugin-auto-update`](packages/capacitor-plugin-auto-update/README.md) | Auto update |
| [`@simplysm/capacitor-plugin-broadcast`](packages/capacitor-plugin-broadcast/README.md) | Broadcast |
| [`@simplysm/capacitor-plugin-file-system`](packages/capacitor-plugin-file-system/README.md) | File system |
| [`@simplysm/capacitor-plugin-usb-storage`](packages/capacitor-plugin-usb-storage/README.md) | USB storage |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
# Watch mode (library build + .d.ts generation, file change detection)
pnpm watch

# Dev mode (client: Vite dev server, server: build)
pnpm dev

# Specific package only
pnpm watch solid
pnpm build solid
```

### Build

```bash
pnpm build
```

### Lint & Typecheck

```bash
pnpm lint
pnpm lint --fix
pnpm typecheck
```

### Test

Tests are powered by [Vitest](https://vitest.dev/).

```bash
pnpm vitest                     # all
pnpm vitest --project=node      # Node.js environment
pnpm vitest --project=browser   # browser environment
pnpm vitest --project=solid     # SolidJS components
pnpm vitest --project=orm       # ORM integration tests (requires Docker DB)
pnpm vitest --project=service   # Service integration tests
```

## Architecture

### Dependency Layers

```
core-common (common utilities)
    ↑
core-browser / core-node (environment-specific extensions)
    ↑
orm-common / service-common (domain-specific common)
    ↑
orm-node / service-server / service-client (implementations)
    ↑
solid (UI components)
```

### Build Targets

| Target | Description |
|--------|-------------|
| `node` | Node.js only (no DOM) |
| `browser` | Browser only (includes DOM) |
| `neutral` | Node.js / browser shared |
| `client` | Vite dev server for development |

## Usage Examples

### ORM Table Definition

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");
```

### Service Communication

- `ServiceServer`: Fastify-based HTTP/WebSocket server
- `ServiceClient`: WebSocket client with RPC calls
- `ServiceProtocol`: Automatic chunking/merging for large messages

## License

[Apache-2.0](LICENSE)
