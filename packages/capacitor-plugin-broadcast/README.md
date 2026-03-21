# @simplysm/capacitor-plugin-broadcast

Simplysm Package - Capacitor Broadcast Plugin. Provides Android Broadcast send/receive functionality for industrial device integration (barcode scanners, PDAs, etc.).

## Installation

```bash
npm install @simplysm/capacitor-plugin-broadcast
```

## API Overview

### Broadcast

| API | Type | Description |
|-----|------|-------------|
| `Broadcast` | class | Android Broadcast send/receive plugin (static methods) |
| `BroadcastPlugin` | interface | Low-level Capacitor plugin interface for broadcast |
| `BroadcastResult` | interface | Broadcast result data |

---

### `BroadcastResult`

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | Broadcast action |
| `extras` | `Record<string, unknown> \| undefined` | Extra data |

### `BroadcastPlugin`

| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribe` | `(options: { filters: string[] }, callback: (result: BroadcastResult) => void) => Promise<{ id: string }>` | Register broadcast receiver |
| `unsubscribe` | `(options: { id: string }) => Promise<void>` | Unsubscribe a specific broadcast receiver |
| `unsubscribeAll` | `() => Promise<void>` | Unsubscribe all broadcast receivers |
| `send` | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>` | Send broadcast |
| `getLaunchIntent` | `() => Promise<BroadcastResult>` | Get launch intent |
| `addListener` | `(eventName: "newIntent", listenerFunc: (data: BroadcastResult) => void) => Promise<PluginListenerHandle>` | Register listener for new intents |
| `removeAllListeners` | `() => Promise<void>` | Remove all event listeners |

### `Broadcast`

Abstract class with static methods for Android Broadcast send/receive.

| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribe` | `(filters: string[], callback: (result: BroadcastResult) => void) => Promise<() => Promise<void>>` | Register broadcast receiver; returns unsubscribe function |
| `unsubscribeAll` | `() => Promise<void>` | Unsubscribe all broadcast receivers |
| `send` | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>` | Send broadcast |
| `getLaunchIntent` | `() => Promise<BroadcastResult>` | Get launch intent |
| `addListener` | `(eventName: "newIntent", callback: (result: BroadcastResult) => void) => Promise<PluginListenerHandle>` | Register listener for events; returns handle (release with `handle.remove()`) |
| `removeAllListeners` | `() => Promise<void>` | Remove all event listeners |

## Usage Examples

### Subscribe to broadcasts

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const unsub = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    // handle result.action, result.extras
  }
);

// Unsubscribe
await unsub();
```

### Send a broadcast

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING"
  }
});
```
