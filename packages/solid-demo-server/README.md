# @simplysm/solid-demo-server

A demo server for the SolidJS demo application. Built with `@simplysm/service-server` and provides example services for testing WebSocket communication and shared data patterns.

This server is designed to work alongside `@simplysm/solid-demo` (the client) and demonstrates common service patterns like echo services, health checks, and shared data management.

## Installation

```bash
npm install @simplysm/solid-demo-server
# or
pnpm add @simplysm/solid-demo-server
```

## Running the Server

The server is configured to run on port `40081` by default.

**In watch mode (development):**
```bash
pnpm watch
```

The server runtime worker will proxy requests to the server. Direct `server.listen()` is not called in watch mode (`env.DEV`).

**In production mode:**
```bash
pnpm build
pnpm start
```

In production, the server directly calls `server.listen()` and serves static files.

## Services

The demo server provides three example services that can be called from the client:

### EchoService

A simple echo service for basic message passing tests.

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `echo(message)` | `string` | `string` | Echo back the input message |
| `echoJson<T>(data)` | `T` | `T` | Echo back JSON data of any type |

**Usage example:**
```typescript
const echoService = client.getService<typeof EchoService>("EchoService");
const result = await echoService.echo("Hello");
const data = await echoService.echoJson({ key: "value" });
```

### HealthService

A health check service providing server status and version information.

**Exported types:**

```typescript
interface HealthStatus {
  status: "ok" | "error";
  timestamp: number;
  version?: string;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `check()` | - | `HealthStatus` | Returns server health status with timestamp and version |
| `ping()` | - | `string` | Returns "pong" (simple connectivity check) |

**Usage example:**
```typescript
const healthService = client.getService<typeof HealthService>("HealthService");
const status = await healthService.check();
console.log(status.status); // "ok"
console.log(status.version); // e.g., "13.0.0-beta.19"
```

### SharedDataDemoService

A service demonstrating shared data patterns, containing sample user and company data.

**Exported types:**

```typescript
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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getUsers(changeKeys?)` | `number[]` (optional) | `IDemoUser[]` | Get all users, or filtered by IDs if provided |
| `getCompanies(changeKeys?)` | `number[]` (optional) | `IDemoCompany[]` | Get all companies, or filtered by IDs if provided |

**Usage example:**
```typescript
const sharedDataService = client.getService<typeof SharedDataDemoService>("SharedDataDemoService");

// Get all users
const allUsers = await sharedDataService.getUsers();

// Get specific users by ID
const filteredUsers = await sharedDataService.getUsers([1, 3]);

// Get all companies
const companies = await sharedDataService.getCompanies();
```

## Architecture

The server is built with the following structure:

```
src/
  ├── main.ts               # Server bootstrap and configuration
  └── services/
      ├── index.ts          # Service re-exports
      ├── echo-service.ts   # EchoService definition
      ├── health-service.ts # HealthService definition
      └── shared-data-demo-service.ts  # SharedDataDemoService definition
```

The main server instance (`server`) is exported from `main.ts` and configured with:
- Port: `40081`
- Root path: `process.cwd()`
- Services: `EchoService`, `HealthService`, `SharedDataDemoService`

## Configuration

### Server Options

The server is configured through `main.ts`:

```typescript
const server = createServiceServer({
  rootPath: process.cwd(),
  port: 40081,
  services: [EchoService, HealthService, SharedDataDemoService],
});
```

To modify the server configuration, edit `src/main.ts`.

## Development

This package is private and used internally for demo purposes. It's not published to npm.

### Running Tests

Tests are run through the monorepo test commands:

```bash
# Browser integration tests
pnpm vitest --project=browser

# Service integration tests
pnpm vitest --project=service
```

### Building

```bash
# Build for production
pnpm build

# Watch mode for development
pnpm watch
```

## Related Packages

- `@simplysm/service-server`: Core server implementation
- `@simplysm/service-common`: Shared service types and protocol
- `@simplysm/solid-demo`: Client application that communicates with this server
- `@simplysm/service-client`: Client library for connecting to this server

## License

Apache-2.0
