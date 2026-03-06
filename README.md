# Simplysm

A TypeScript full-stack framework monorepo.
Managed with pnpm workspaces, it provides SolidJS UI components, ORM, service communication, Excel processing, and more.

## Design Philosophy

- **Standard patterns first** -- Leverage idiomatic TypeScript/JavaScript/SolidJS patterns to minimize the learning curve.
- **Explicit and predictable code** -- Favor explicit code over implicit behavior.
- **Incremental learning** -- Each package is independently usable; learn and adopt only what you need.

## Packages

### Core

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/core-common`](packages/core-common) | neutral | Common utilities, custom types (`DateTime`, `DateOnly`, `Time`, `Uuid`, `LazyGcMap`), error classes |
| [`@simplysm/core-browser`](packages/core-browser) | browser | Browser-specific extensions |
| [`@simplysm/core-node`](packages/core-node) | node | Node.js utilities (filesystem, worker threads) |

### ORM

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/orm-common`](packages/orm-common) | neutral | ORM query builder, table schema definitions |
| [`@simplysm/orm-node`](packages/orm-node) | node | DB connectors (MySQL, MSSQL, PostgreSQL) |

### Service

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/service-common`](packages/service-common) | neutral | Service protocol, type definitions |
| [`@simplysm/service-client`](packages/service-client) | neutral | WebSocket client |
| [`@simplysm/service-server`](packages/service-server) | node | Fastify-based HTTP/WebSocket server |

### UI

| Package | Target | Description |
|---------|--------|-------------|
| [`@simplysm/solid`](packages/solid) | browser | SolidJS UI components + Tailwind CSS |

### Tools

| Package                                               | Target | Description |
|-------------------------------------------------------|--------|-------------|
| [`@simplysm/sd-cli`](packages/sd-cli)                 | node   | Build, lint, typecheck CLI tool |
| [`@simplysm/sd-claude`](packages/sd-claude)           | node   | Claude Code CLI — asset installer (auto-installs via postinstall) |
| [`@simplysm/lint`](packages/lint)                     | node   | Lint config (ESLint) |
| [`@simplysm/excel`](packages/excel)                   | neutral | Excel (.xlsx) read/write |
| [`@simplysm/storage`](packages/storage)               | node   | FTP/SFTP client |
| [`@simplysm/mcp-playwright`](packages/mcp-playwright) | node   | MCP server — multi-session Playwright proxy (`sd-mcp-playwright`) |

### Capacitor Plugins

| Package | Description |
|---------|-------------|
| [`@simplysm/capacitor-plugin-auto-update`](packages/capacitor-plugin-auto-update) | Auto update |
| [`@simplysm/capacitor-plugin-broadcast`](packages/capacitor-plugin-broadcast) | Broadcast |
| [`@simplysm/capacitor-plugin-file-system`](packages/capacitor-plugin-file-system) | File system |
| [`@simplysm/capacitor-plugin-usb-storage`](packages/capacitor-plugin-usb-storage) | USB storage |

### Demo Apps (private, not published)

| Package | Description |
|---------|-------------|
| [`solid-demo`](packages/solid-demo) | SolidJS component demo app (Vite client, `pnpm dev`) |
| [`solid-demo-server`](packages/solid-demo-server) | Server-side companion for the SolidJS demo app |

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
pnpm lint:fix
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
pnpm vitest --project=bank      # Bank integration tests (requires network)
pnpm vitest packages/core-common                                              # package tests
pnpm vitest packages/core-common/tests/DateTime.spec.ts --project=node       # single file
pnpm vitest -t "DateTime" --project=node                                      # filter by test name
```

## Architecture

### Dependency Layers

```
core-common (lowest level, common utilities)
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
