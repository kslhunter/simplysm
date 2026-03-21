# @simplysm/capacitor-plugin-broadcast

Capacitor Broadcast Plugin -- send and receive Android broadcast intents for industrial device integration (barcode scanners, PDAs, etc.).

## Installation

```bash
npm install @simplysm/capacitor-plugin-broadcast
```

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `BroadcastResult` | interface | Broadcast result containing `action` and `extras` |

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `BroadcastPlugin` | interface | Low-level Capacitor plugin interface for broadcast operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `Broadcast` | abstract class | Android broadcast send/receive operations |

## `BroadcastResult`

```typescript
interface BroadcastResult {
  /** Broadcast action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}
```

## `BroadcastPlugin`

```typescript
interface BroadcastPlugin {
  subscribe(
    options: { filters: string[] },
    callback: (result: BroadcastResult) => void,
  ): Promise<{ id: string }>;
  unsubscribe(options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<BroadcastResult>;
  addListener(
    eventName: "newIntent",
    listenerFunc: (data: BroadcastResult) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}
```

Low-level Capacitor plugin interface. Use `Broadcast` static methods instead of calling this directly.

## `Broadcast`

```typescript
abstract class Broadcast {
  static async subscribe(
    filters: string[],
    callback: (result: BroadcastResult) => void,
  ): Promise<() => Promise<void>>;

  static async unsubscribeAll(): Promise<void>;

  static async send(options: {
    action: string;
    extras?: Record<string, unknown>;
  }): Promise<void>;

  static async getLaunchIntent(): Promise<BroadcastResult>;

  static async addListener(
    eventName: "newIntent",
    callback: (result: BroadcastResult) => void,
  ): Promise<PluginListenerHandle>;

  static async removeAllListeners(): Promise<void>;
}
```

## Usage Examples

### Subscribe to broadcasts

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const unsub = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    // handle result.action, result.extras
  },
);

// Later: unsubscribe
await unsub();
```

### Send a broadcast

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

### Listen for new intents

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const handle = await Broadcast.addListener("newIntent", (result) => {
  // handle intent
});

// Later: remove listener
await handle.remove();
```
