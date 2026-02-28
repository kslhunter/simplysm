# @simplysm/solid-demo-server

Demo server for the `@simplysm/solid-demo` application. Provides example services (echo, health check, shared data) via `@simplysm/service-server`.

Development-only package. Not published to npm.

## Source Index

### Entry Point

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/main.ts` | `server` | Creates and starts the demo service server instance | - |

### services

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/services/echo-service.ts` | `EchoService` | Service that echoes back string and generic JSON messages | - |
| `src/services/health-service.ts` | `HealthStatus`, `HealthService` | Service providing health check and ping endpoints with status info | - |
| `src/services/shared-data-demo-service.ts` | `IDemoUser`, `IDemoCompany`, `SharedDataDemoService` | Service exposing in-memory demo user and company data | - |

## License

Apache-2.0
