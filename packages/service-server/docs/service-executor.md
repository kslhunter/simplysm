# Service Executor

## `executeServiceMethod`

Executes a service method with full validation and authentication checking.

```typescript
export async function executeServiceMethod(
  server: ServiceServer,
  def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  },
): Promise<unknown>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `server` | `ServiceServer` | The server instance (used to find service definitions and check auth config) |
| `def.serviceName` | `string` | Service name to look up |
| `def.methodName` | `string` | Method name to invoke |
| `def.params` | `unknown[]` | Method parameters |
| `def.socket` | `ServiceSocket?` | WebSocket connection (for WebSocket requests) |
| `def.http` | `{ clientName: string; authTokenPayload?: AuthTokenPayload }?` | HTTP context (for HTTP requests) |

**Returns:** `Promise<unknown>` -- The method return value.

**Execution flow:**
1. Finds the service definition by name (throws if not found)
2. Validates client name for path traversal attacks
3. Creates a `ServiceContext`
4. Calls the factory to create the method object
5. Looks up the method by name (throws if not a function)
6. Checks authentication:
   - Method-level `auth()` permissions take precedence over service-level
   - If `server.options.auth === undefined` and auth is required, throws configuration error
   - If `server.options.auth === false`, skips all auth checks
   - Otherwise, verifies `authTokenPayload` exists and has required roles
7. Invokes the method with parameters
