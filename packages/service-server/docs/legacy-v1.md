# Legacy V1

## `handleV1Connection`

Handles V1 legacy WebSocket connections. Only supports the `SdAutoUpdateService.getLastVersion` command. All other requests return an upgrade-required error.

```typescript
export function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `WebSocket` (from `ws`) | Raw WebSocket connection |
| `autoUpdateMethods` | `{ getLastVersion: (platform: string) => Promise<any> }` | Auto-update method implementations |
| `clientNameSetter` | `((clientName: string \| undefined) => void)?` | Callback to set the legacy client name on the context |

V1 protocol:
- Sends `{ name: "connected" }` on connection
- Expects JSON messages with `{ uuid, command, params, clientName? }` format
- Responds with `{ name: "response", reqUuid, state: "success"|"error", body }` format
- Only `SdAutoUpdateService.getLastVersion` is supported; all other commands return `UPGRADE_REQUIRED` error
