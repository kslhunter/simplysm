# @simplysm/service-common

Simplysm package - Service module (common)

## Installation

pnpm add @simplysm/service-common

## Source Index

### Protocol

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/protocol/protocol.types.ts` | `PROTOCOL_CONFIG`, `ServiceMessage`, `ServiceServerMessage`, `ServiceServerRawMessage`, `ServiceClientMessage`, `ServiceReloadMessage`, `ServiceProgressMessage`, `ServiceErrorMessage`, `ServiceAuthMessage`, `ServiceRequestMessage`, `ServiceResponseMessage`, `ServiceAddEventListenerMessage`, `ServiceRemoveEventListenerMessage`, `ServiceGetEventListenerInfosMessage`, `ServiceEmitEventMessage`, `ServiceEventMessage` | Protocol constants and all WebSocket message type definitions | - |
| `src/protocol/service-protocol.ts` | `ServiceProtocol`, `ServiceMessageDecodeResult`, `createServiceProtocol` | Factory and types for encoding/decoding chunked service messages | `service-protocol.spec.ts` |

### Service Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/service-types/orm-service.types.ts` | `OrmService`, `DbConnOptions` | Service interface for ORM database connection and query execution | - |
| `src/service-types/auto-update-service.types.ts` | `AutoUpdateService` | Service interface for retrieving the latest client application version | - |

### Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types.ts` | `ServiceUploadResult` | Result type describing a file uploaded to the server | - |

### Define

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/define-event.ts` | `ServiceEventDef`, `defineEvent` | Helper to define typed service events with info and data shapes | `define-event.spec.ts` |

## License

Apache-2.0
