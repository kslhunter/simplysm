# @simplysm/capacitor-plugin-broadcast

Simplysm Package - Capacitor Broadcast Plugin

A Capacitor plugin for sending and receiving Android broadcasts. Designed for industrial device integration (barcode scanners, PDAs, etc.).

## Installation

```bash
pnpm add @simplysm/capacitor-plugin-broadcast
```

## Main Modules

### Broadcast

A static class for sending and receiving Android broadcasts.

#### `Broadcast.subscribe(filters, callback)`

Registers a broadcast receiver for the given action filters. Returns an async unsubscribe function.

```ts
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const unsub = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log(result.action);
    console.log(result.extras);
  }
);

// Unsubscribe when done
await unsub();
```

| Parameter  | Type                                    | Description                              |
| ---------- | --------------------------------------- | ---------------------------------------- |
| `filters`  | `string[]`                              | List of broadcast action strings to listen for |
| `callback` | `(result: IBroadcastResult) => void`    | Called each time a matching broadcast is received |

Returns: `Promise<() => Promise<void>>` — an async function that unsubscribes the receiver.

#### `Broadcast.unsubscribeAll()`

Unsubscribes all currently registered broadcast receivers.

```ts
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.unsubscribeAll();
```

#### `Broadcast.send(options)`

Sends an Android broadcast intent.

```ts
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

| Parameter        | Type                          | Description                         |
| ---------------- | ----------------------------- | ----------------------------------- |
| `options.action` | `string`                      | The broadcast action string to send |
| `options.extras` | `Record<string, unknown>` (optional) | Extra data to include in the intent |

#### `Broadcast.getLaunchIntent()`

Returns the intent that launched the app, if available.

```ts
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const intent = await Broadcast.getLaunchIntent();
console.log(intent.action);
console.log(intent.extras);
```

Returns: `Promise<IBroadcastResult>`

#### `Broadcast.addNewIntentListener(callback)`

Registers a listener for new intents received while the app is running. Returns a `PluginListenerHandle` which can be released by calling `.remove()`.

```ts
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const handle = await Broadcast.addNewIntentListener((result) => {
  console.log(result.action);
  console.log(result.extras);
});

// Remove listener when done
await handle.remove();
```

| Parameter  | Type                                    | Description                              |
| ---------- | --------------------------------------- | ---------------------------------------- |
| `callback` | `(result: IBroadcastResult) => void`    | Called when a new intent is received     |

Returns: `Promise<PluginListenerHandle>`

## Types

### `IBroadcastResult`

Represents the data received from a broadcast intent.

```ts
import type { IBroadcastResult } from "@simplysm/capacitor-plugin-broadcast";
```

| Field     | Type                          | Description           |
| --------- | ----------------------------- | --------------------- |
| `action`  | `string` (optional)           | The broadcast action  |
| `extras`  | `Record<string, unknown>` (optional) | Extra intent data     |

### `IBroadcastPlugin`

The low-level Capacitor plugin interface. Use the `Broadcast` class instead of this interface directly.

```ts
import type { IBroadcastPlugin } from "@simplysm/capacitor-plugin-broadcast";
```

| Method              | Signature                                                                                              | Description                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| `subscribe`         | `(options: { filters: string[] }, callback: (result: IBroadcastResult) => void) => Promise<{ id: string }>` | Register a broadcast receiver                |
| `unsubscribe`       | `(options: { id: string }) => Promise<void>`                                                           | Unsubscribe a specific receiver by ID        |
| `unsubscribeAll`    | `() => Promise<void>`                                                                                  | Unsubscribe all receivers                    |
| `send`              | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>`                     | Send a broadcast                             |
| `getLaunchIntent`   | `() => Promise<IBroadcastResult>`                                                                      | Get the launch intent                        |
| `addListener`       | `(eventName: "onNewIntent", listenerFunc: (data: IBroadcastResult) => void) => Promise<PluginListenerHandle>` | Listen for new intents while app is running  |
