# @simplysm/capacitor-plugin-broadcast

Capacitor plugin for sending and receiving Android Broadcasts. Designed for integrating with industrial devices such as barcode scanners and PDAs.

## Installation

```bash
npm install @simplysm/capacitor-plugin-broadcast
npx cap sync
```

### Requirements

- `@capacitor/core` ^7.4.4

### Platform Support

| Platform | Supported |
|----------|-----------|
| Android  | Yes       |
| Web      | Stub only (shows alert) |

## API

### `Broadcast`

Static utility class for sending and receiving Android Broadcasts.

#### `Broadcast.subscribe(filters, callback)`

Registers a broadcast receiver for the specified intent filters. Returns an unsubscribe function.

| Parameter  | Type                                     | Description                         |
|------------|------------------------------------------|-------------------------------------|
| `filters`  | `string[]`                               | Intent action strings to listen for |
| `callback` | `(result: IBroadcastResult) => void`     | Called when a matching broadcast is received |

**Returns:** `Promise<() => Promise<void>>` -- an async function that unregisters this receiver when called.

```ts
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const unsub = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log(result.action);
    console.log(result.extras);
  },
);

// Later, unsubscribe
await unsub();
```

#### `Broadcast.unsubscribeAll()`

Unregisters all active broadcast receivers at once.

```ts
await Broadcast.unsubscribeAll();
```

#### `Broadcast.send(options)`

Sends a broadcast intent.

| Parameter        | Type                          | Description                  |
|------------------|-------------------------------|------------------------------|
| `options.action` | `string`                      | Intent action string         |
| `options.extras` | `Record<string, unknown>` (optional) | Extra data to include in the intent |

```ts
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

#### `Broadcast.getLaunchIntent()`

Retrieves the intent that launched the app.

**Returns:** `Promise<IBroadcastResult>`

```ts
const intent = await Broadcast.getLaunchIntent();
console.log(intent.action);
console.log(intent.extras);
```

### `IBroadcastResult`

Result object returned by `subscribe` callbacks and `getLaunchIntent`.

| Property  | Type                          | Description        |
|-----------|-------------------------------|--------------------|
| `action`  | `string` (optional)           | Broadcast action   |
| `extras`  | `Record<string, unknown>` (optional) | Extra data |

### `IBroadcastPlugin`

Low-level plugin interface registered via `registerPlugin`. Use the `Broadcast` class instead for a simpler API.

| Method             | Signature                                                                                  |
|--------------------|--------------------------------------------------------------------------------------------|
| `subscribe`        | `(options: { filters: string[] }, callback: (result: IBroadcastResult) => void) => Promise<{ id: string }>` |
| `unsubscribe`      | `(options: { id: string }) => Promise<void>`                                               |
| `unsubscribeAll`   | `() => Promise<void>`                                                                      |
| `send`             | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>`         |
| `getLaunchIntent`  | `() => Promise<IBroadcastResult>`                                                          |
