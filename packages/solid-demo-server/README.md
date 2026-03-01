# @simplysm/solid-demo-server

Backend server for the `@simplysm/solid-demo` application. It is a private, non-published package used exclusively to support the SolidJS demo frontend.

## Overview

The demo server is built on `@simplysm/service-server` and exposes three services over WebSocket. It runs on port **40081** and, in production mode, also serves static files from its own `dist/` directory.

In development (watch) mode the Server Runtime Worker starts the proxy first and then calls `listen()`. In production the server calls `listen()` directly on startup.

## How to Run

From the repository root, use the standard Simplysm dev/build workflow:

```bash
# Development (watch mode)
pnpm sd-cli dev

# Production build then run
pnpm sd-cli build
node packages/solid-demo-server/dist/main.js
```

The server listens on `ws://localhost:40081`.

## Services

### EchoService

Namespace: `Echo`

A simple round-trip service used to verify that the WebSocket connection and serialization pipeline work correctly.

| Method | Signature | Description |
|--------|-----------|-------------|
| `echo` | `(message: string): string` | Returns the message unchanged. |
| `echoJson` | `<T>(data: T): T` | Returns the JSON-serializable value unchanged. |

### HealthService

Namespace: `Health`

Reports the current health state of the server process.

#### Types

```ts
interface HealthStatus {
  status: "ok" | "error";
  timestamp: number;   // Unix timestamp in milliseconds
  version?: string;    // Value of env.VER, if set
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `check` | `(): HealthStatus` | Returns server status, current timestamp, and optional version. |
| `ping` | `(): string` | Returns `"pong"`. Lightweight liveness check. |

### SharedDataDemoService

Namespace: `SharedDataDemo`

Provides static in-memory datasets that demonstrate how the frontend fetches and displays shared data (e.g., with `useSharedData`).

#### Types

```ts
interface IDemoUser {
  id: number;
  name: string;
  department: string;
}

interface IDemoCompany {
  id: number;
  name: string;
  ceo: string;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `getUsers` | `(changeKeys?: number[]): IDemoUser[]` | Returns all users, or only those whose `id` is in `changeKeys`. |
| `getCompanies` | `(changeKeys?: number[]): IDemoCompany[]` | Returns all companies, or only those whose `id` is in `changeKeys`. |

Seed data:

- **Users** (5 records): John Doe, Jane Smith, Bob Wilson, Alice Johnson, Charlie Brown — across Development, Design, and Planning departments.
- **Companies** (3 records): Simplysm, Technology, Innovation.
