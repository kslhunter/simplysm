# Legacy

## `handleV1Connection(socket, autoUpdateMethods, clientNameSetter?): void`

Handles V1 legacy WebSocket client connections. Only the `SdAutoUpdateService.getLastVersion` command is supported; all other requests receive an `UPGRADE_REQUIRED` error response.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `WebSocket` | The raw WebSocket connection |
| `autoUpdateMethods` | `{ getLastVersion: (platform: string) => Promise<any> }` | Auto-update method implementations |
| `clientNameSetter` | `(clientName: string \| undefined) => void` | Optional callback to set the legacy client name on the context |

### V1 Protocol

**Request format:**
```json
{
  "uuid": "request-id",
  "command": "SdAutoUpdateService.getLastVersion",
  "params": ["android"],
  "clientName": "my-app"
}
```

**Success response:**
```json
{
  "name": "response",
  "reqUuid": "request-id",
  "state": "success",
  "body": { "version": "1.2.3", "downloadPath": "/my-app/android/updates/1.2.3.apk" }
}
```

**Upgrade-required response (for unsupported commands):**
```json
{
  "name": "response",
  "reqUuid": "request-id",
  "state": "error",
  "body": { "message": "App upgrade is required.", "code": "UPGRADE_REQUIRED" }
}
```
