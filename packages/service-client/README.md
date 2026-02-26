# @simplysm/service-client

Simplysm package - Service module (client)

## Installation

pnpm add @simplysm/service-client

## Source Index

### Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types/connection-config.ts` | `ServiceConnectionConfig` | Host, port, SSL, and reconnect options for a service connection | - |
| `src/types/progress.types.ts` | `ServiceProgress`, `ServiceProgressState` | Callbacks and state shape for tracking request/response progress | - |

### Transport

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/transport/socket-provider.ts` | `SocketProviderEvents`, `SocketProvider`, `createSocketProvider` | WebSocket wrapper with heartbeat, auto-reconnect, and ping/pong | - |
| `src/transport/service-transport.ts` | `ServiceTransportEvents`, `ServiceTransport`, `createServiceTransport` | Sends protocol messages over a socket and matches responses by UUID | - |

### Protocol

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/protocol/client-protocol-wrapper.ts` | `ClientProtocolWrapper`, `createClientProtocolWrapper` | Encodes/decodes protocol messages, offloading large payloads to a Web Worker | - |

### Features

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/features/event-client.ts` | `EventClient`, `createEventClient` | Registers, removes, and re-registers server-side event listeners | - |
| `src/features/file-client.ts` | `FileClient`, `createFileClient` | Downloads files via fetch and uploads files via multipart form-data | - |
| `src/features/orm/orm-connect-config.ts` | `OrmConnectConfig` | Config type pairing a DbContextDef with connection options and DB name | - |
| `src/features/orm/orm-client-connector.ts` | `OrmClientConnector`, `createOrmClientConnector` | Opens a remote ORM DB context with or without a transaction | - |
| `src/features/orm/orm-client-db-context-executor.ts` | `OrmClientDbContextExecutor` | DbContextExecutor that delegates all DB operations to the server OrmService | - |

### Main

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/service-client.ts` | `ServiceClient`, `RemoteService`, `createServiceClient` | Top-level client that composes socket, transport, events, and file features | - |

## License

Apache-2.0
