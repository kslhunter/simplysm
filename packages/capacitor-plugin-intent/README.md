# @simplysm/capacitor-plugin-intent

Capacitor plugin for Android intent handling. Supports broadcast send/receive, launch intent retrieval, event listeners for new intents, and `startActivityForResult`. Designed for industrial device integration (barcode scanners, PDA devices, etc.).

- **Android**: Full intent support
- **Browser**: Web fallback for development

## Installation

```bash
npm install @simplysm/capacitor-plugin-intent
```

## API Overview

### Interfaces

| API | Type | Description |
|-----|------|-------------|
| `IntentResult` | Interface | Data received from a broadcast or launch intent |
| `StartActivityForResultOptions` | Interface | Options for starting an Android activity and awaiting its result |
| `StartActivityForResultResult` | Interface | Result returned from a started activity |
| `IntentPlugin` | Interface | Native plugin interface for intent operations |

### Classes

| API | Type | Description |
|-----|------|-------------|
| `Intent` | Class | Static API for broadcast send/receive, launch intents, and activity results |

## `IntentResult`

Data received from a broadcast or launch intent.

```typescript
interface IntentResult {
  action?: string;
  extras?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | The intent action string (e.g. `"com.example.SCAN_RESULT"`) |
| `extras` | `Record<string, unknown> \| undefined` | Key-value map of intent extras |

## `StartActivityForResultOptions`

Options for launching an Android activity and awaiting its result.

```typescript
interface StartActivityForResultOptions {
  action?: string;
  uri?: string;
  extras?: Record<string, unknown>;
  type?: string;
  packageName?: string;
  className?: string;
  flags?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | Intent action (e.g. `"android.intent.action.VIEW"`) |
| `uri` | `string \| undefined` | Data URI to pass to the intent |
| `extras` | `Record<string, unknown> \| undefined` | Extra key-value pairs to include |
| `type` | `string \| undefined` | MIME type (e.g. `"image/*"`) |
| `packageName` | `string \| undefined` | Target package name for an explicit intent |
| `className` | `string \| undefined` | Target Activity class name for an explicit intent |
| `flags` | `number \| undefined` | Intent flags bitmask |

## `StartActivityForResultResult`

Result returned when a launched activity finishes.

```typescript
interface StartActivityForResultResult {
  resultCode: number;
  data?: {
    action?: string;
    uri?: string;
    extras?: Record<string, unknown>;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resultCode` | `number` | Android result code (`RESULT_OK = -1`, `RESULT_CANCELED = 0`) |
| `data` | `{ action?: string; uri?: string; extras?: Record<string, unknown> } \| undefined` | Optional data returned by the activity, including its action, URI, and extras |

## `IntentPlugin`

Native plugin interface for intent operations. Use the `Intent` class for a simplified API.

```typescript
interface IntentPlugin {
  subscribe(
    options: { filters: string[] },
    callback: (result: IntentResult) => void,
  ): Promise<{ id: string }>;
  unsubscribe(options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<IntentResult>;
  addListener(
    eventName: "newIntent",
    listenerFunc: (data: IntentResult) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
  startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribe` | `(options: { filters: string[] }, callback: (result: IntentResult) => void) => Promise<{ id: string }>` | Register a broadcast receiver for the given action filters |
| `unsubscribe` | `(options: { id: string }) => Promise<void>` | Unregister a broadcast receiver by subscription ID |
| `unsubscribeAll` | `() => Promise<void>` | Unregister all broadcast receivers |
| `send` | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>` | Send a broadcast intent |
| `getLaunchIntent` | `() => Promise<IntentResult>` | Get the intent that launched the current activity |
| `addListener` | `(eventName: "newIntent", listenerFunc: (data: IntentResult) => void) => Promise<PluginListenerHandle>` | Listen for new intents delivered to the activity |
| `removeAllListeners` | `() => Promise<void>` | Remove all event listeners |
| `startActivityForResult` | `(options: StartActivityForResultOptions) => Promise<StartActivityForResultResult>` | Start an activity and await its result |

## `Intent`

Abstract class with static methods for Android intent operations. Designed for industrial devices such as barcode scanners and PDAs.

```typescript
abstract class Intent {
  static async subscribe(
    filters: string[],
    callback: (result: IntentResult) => void,
  ): Promise<() => Promise<void>>;
  static async unsubscribeAll(): Promise<void>;
  static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  static async getLaunchIntent(): Promise<IntentResult>;
  static async addListener(
    eventName: "newIntent",
    callback: (result: IntentResult) => void,
  ): Promise<PluginListenerHandle>;
  static async removeAllListeners(): Promise<void>;
  static async startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult>;
}
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `subscribe` | `static async subscribe(filters: string[], callback: (result: IntentResult) => void): Promise<() => Promise<void>>` | Register a broadcast receiver for the given action filters. Returns an async unsubscribe function. |
| `unsubscribeAll` | `static async unsubscribeAll(): Promise<void>` | Unregister all active broadcast receivers |
| `send` | `static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>` | Send a broadcast intent with the specified action and optional extras |
| `getLaunchIntent` | `static async getLaunchIntent(): Promise<IntentResult>` | Retrieve the intent that launched the current activity |
| `addListener` | `static async addListener(eventName: "newIntent", callback: (result: IntentResult) => void): Promise<PluginListenerHandle>` | Add a listener for new intents delivered to the activity via `onNewIntent`. Call `handle.remove()` to unregister. |
| `removeAllListeners` | `static async removeAllListeners(): Promise<void>` | Remove all registered event listeners |
| `startActivityForResult` | `static async startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>` | Start an Android activity and return its result when it finishes |

## Usage Examples

### Subscribe to barcode scanner broadcasts

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const unsubscribe = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    const barcode = result.extras?.["com.symbol.datawedge.data_string"];
    // handle barcode
  },
);

// Later, stop listening
await unsubscribe();
```

### Send a broadcast and start an activity for result

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

// Send a broadcast
await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});

// Start an activity for result
const result = await Intent.startActivityForResult({
  action: "com.example.PAY",
  extras: { amount: 1000 },
});
if (result.resultCode === -1) {
  // RESULT_OK - payment succeeded
}
```
