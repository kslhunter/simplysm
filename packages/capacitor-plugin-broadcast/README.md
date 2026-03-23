# @simplysm/capacitor-plugin-broadcast

Capacitor Broadcast Plugin -- Android broadcast send/receive for industrial devices (barcode scanners, PDA, etc.). Provides subscription-based broadcast receiving, broadcast sending with extras, and launch intent retrieval.

## Installation

```bash
npm install @simplysm/capacitor-plugin-broadcast
```

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `Broadcast` | Abstract class | Static methods for subscribing to, sending, and managing Android broadcasts |
| `IBroadcastResult` | Interface | Broadcast result containing action and extras |
| `IBroadcastPlugin` | Interface | Low-level Capacitor plugin interface for broadcast operations |

## API Reference

### `IBroadcastResult`

Result object received from a broadcast or launch intent.

```typescript
export interface IBroadcastResult {
  action?: string;
  extras?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | The broadcast action string |
| `extras` | `Record<string, unknown> \| undefined` | Extra data attached to the broadcast |

### `IBroadcastPlugin`

Low-level Capacitor plugin interface. Use `Broadcast` instead for a simplified API.

```typescript
export interface IBroadcastPlugin {
  subscribe(
    options: { filters: string[] },
    callback: (result: IBroadcastResult) => void,
  ): Promise<{ id: string }>;
  unsubscribe(options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<IBroadcastResult>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribe` | `options: { filters: string[] }, callback` | `Promise<{ id: string }>` | Register a broadcast receiver with action filters |
| `unsubscribe` | `options: { id: string }` | `Promise<void>` | Remove a specific broadcast receiver by ID |
| `unsubscribeAll` | -- | `Promise<void>` | Remove all broadcast receivers |
| `send` | `options: { action, extras? }` | `Promise<void>` | Send a broadcast with action and optional extras |
| `getLaunchIntent` | -- | `Promise<IBroadcastResult>` | Get the intent that launched the app |

### `Broadcast`

Abstract class with static methods for Android broadcast send/receive. Designed for industrial device integration (barcode scanners, PDA, etc.).

```typescript
export abstract class Broadcast {
  static async subscribe(
    filters: string[],
    callback: (result: IBroadcastResult) => void,
  ): Promise<() => Promise<void>>;

  static async unsubscribeAll(): Promise<void>;

  static async send(options: {
    action: string;
    extras?: Record<string, unknown>;
  }): Promise<void>;

  static async getLaunchIntent(): Promise<IBroadcastResult>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribe` | `filters: string[], callback: (result: IBroadcastResult) => void` | `Promise<() => Promise<void>>` | Register a broadcast receiver; returns an unsubscribe function |
| `unsubscribeAll` | -- | `Promise<void>` | Remove all registered broadcast receivers |
| `send` | `options: { action: string; extras?: Record<string, unknown> }` | `Promise<void>` | Send a broadcast with action and optional extras |
| `getLaunchIntent` | -- | `Promise<IBroadcastResult>` | Retrieve the intent that launched the application |

## Usage Examples

### Subscribe to broadcasts from a barcode scanner

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log("Action:", result.action);
    console.log("Extras:", result.extras);
  },
);

// Later, unsubscribe
await unsubscribe();
```

### Send a broadcast to trigger a scan

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```
