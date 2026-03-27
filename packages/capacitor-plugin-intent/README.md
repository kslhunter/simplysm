# @simplysm/capacitor-plugin-intent

Capacitor Intent Plugin -- Android intent send/receive for industrial devices (barcode scanners, PDA, etc.). Provides subscription-based intent receiving, intent sending with extras, launch intent retrieval, and startActivityForResult support.

## Installation

```bash
npm install @simplysm/capacitor-plugin-intent
```

**Peer dependencies:**

- `@capacitor/core` ^7.4.4

## API Overview

| API | Type | Description |
|-----|------|-------------|
| `Intent` | Abstract class | Static methods for subscribing to, sending, and managing Android intents |
| `IIntentResult` | Interface | Intent result containing action and extras |
| `IStartActivityForResultOptions` | Interface | Options for starting an activity for result |
| `IActivityResult` | Interface | Activity result containing resultCode, data, and extras |
| `IIntentPlugin` | Interface | Low-level Capacitor plugin interface for intent operations |

## API Reference

### `IIntentResult`

Result object received from an intent or launch intent.

```typescript
export interface IIntentResult {
  /** Intent action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | The intent action string |
| `extras` | `Record<string, unknown> \| undefined` | Extra data attached to the intent |

### `IStartActivityForResultOptions`

Options for starting an activity and receiving its result.

```typescript
export interface IStartActivityForResultOptions {
  /** Intent action */
  action: string;
  /** Data URI */
  uri?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
  /** Target package name */
  package?: string;
  /** Target component class name */
  component?: string;
  /** MIME type */
  type?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string` | Intent action (required) |
| `uri` | `string \| undefined` | Data URI |
| `extras` | `Record<string, unknown> \| undefined` | Extra data to include in the intent |
| `package` | `string \| undefined` | Target package name |
| `component` | `string \| undefined` | Target component class name (requires `package`) |
| `type` | `string \| undefined` | MIME type |

### `IActivityResult`

Result returned from a started activity.

```typescript
export interface IActivityResult {
  /** Activity result code (RESULT_OK = -1, RESULT_CANCELED = 0) */
  resultCode: number;
  /** Result data URI */
  data?: string;
  /** Result extras */
  extras?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resultCode` | `number` | Activity result code (`RESULT_OK = -1`, `RESULT_CANCELED = 0`) |
| `data` | `string \| undefined` | Result data URI |
| `extras` | `Record<string, unknown> \| undefined` | Result extras |

### `IIntentPlugin`

Low-level Capacitor plugin interface. Use `Intent` instead for a simplified API.

```typescript
export interface IIntentPlugin {
  subscribe(
    options: { filters: string[] },
    callback: (result: IIntentResult) => void,
  ): Promise<{ id: string }>;
  unsubscribe(options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<IIntentResult>;
  startActivityForResult(options: IStartActivityForResultOptions): Promise<IActivityResult>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribe` | `options: { filters: string[] }, callback` | `Promise<{ id: string }>` | Register an intent receiver with action filters |
| `unsubscribe` | `options: { id: string }` | `Promise<void>` | Remove a specific intent receiver by ID |
| `unsubscribeAll` | -- | `Promise<void>` | Remove all intent receivers |
| `send` | `options: { action, extras? }` | `Promise<void>` | Send an intent with action and optional extras |
| `getLaunchIntent` | -- | `Promise<IIntentResult>` | Get the intent that launched the app |
| `startActivityForResult` | `options: IStartActivityForResultOptions` | `Promise<IActivityResult>` | Start an activity and receive its result |

### `Intent`

Abstract class with static methods for Android intent send/receive. Designed for industrial device integration (barcode scanners, PDA, etc.).

```typescript
export abstract class Intent {
  static async subscribe(
    filters: string[],
    callback: (result: IIntentResult) => void,
  ): Promise<() => Promise<void>>;

  static async unsubscribeAll(): Promise<void>;

  static async send(options: {
    action: string;
    extras?: Record<string, unknown>;
  }): Promise<void>;

  static async getLaunchIntent(): Promise<IIntentResult>;

  static async startActivityForResult(
    options: IStartActivityForResultOptions,
  ): Promise<IActivityResult>;
}
```

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribe` | `filters: string[], callback: (result: IIntentResult) => void` | `Promise<() => Promise<void>>` | Register an intent receiver; returns an unsubscribe function |
| `unsubscribeAll` | -- | `Promise<void>` | Remove all registered intent receivers |
| `send` | `options: { action: string; extras?: Record<string, unknown> }` | `Promise<void>` | Send an intent with action and optional extras |
| `getLaunchIntent` | -- | `Promise<IIntentResult>` | Retrieve the intent that launched the application |
| `startActivityForResult` | `options: IStartActivityForResultOptions` | `Promise<IActivityResult>` | Start an activity and receive its result |

## Usage Examples

### Subscribe to intents from a barcode scanner

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const unsubscribe = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log("Action:", result.action);
    console.log("Extras:", result.extras);
  },
);

// Later, unsubscribe
await unsubscribe();
```

### Send an intent to trigger a scan

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

### Start an activity for result

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const result = await Intent.startActivityForResult({
  action: "android.intent.action.GET_CONTENT",
  type: "image/*",
});

if (result.resultCode === -1) {
  // RESULT_OK
  console.log("Selected:", result.data);
}
```
