# @simplysm/capacitor-plugin-broadcast

Capacitor plugin for sending and receiving Android Broadcasts. Designed for industrial device integration such as barcode scanners, PDAs, and other hardware that communicates via Android Intent broadcasts.

> **Platform support:** Android only. A web stub is provided that logs warnings and returns no-op results.

## Installation

```bash
npm install @simplysm/capacitor-plugin-broadcast
npx cap sync
```

## API

### `Broadcast` class

Static utility class that wraps the native Capacitor plugin. All methods are `async`.

---

#### `Broadcast.subscribe(filters, callback)`

Register a broadcast receiver for the specified intent actions.

| Parameter  | Type                                  | Description                          |
| ---------- | ------------------------------------- | ------------------------------------ |
| `filters`  | `string[]`                            | Array of intent action strings to listen for |
| `callback` | `(result: BroadcastResult) => void`   | Called each time a matching broadcast is received |

**Returns:** `Promise<() => Promise<void>>` -- an unsubscribe function. Call it to stop receiving broadcasts from this subscription.

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

---

#### `Broadcast.unsubscribeAll()`

Unsubscribe all active broadcast receivers at once.

**Returns:** `Promise<void>`

```ts
await Broadcast.unsubscribeAll();
```

---

#### `Broadcast.send(options)`

Send an Android broadcast intent.

| Parameter         | Type                          | Description                  |
| ----------------- | ----------------------------- | ---------------------------- |
| `options.action`  | `string`                      | The intent action string     |
| `options.extras`  | `Record<string, unknown>` (optional) | Key-value extras to attach to the intent |

**Returns:** `Promise<void>`

```ts
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

Supported extras value types: `string`, `number`, `boolean`, `string[]`, and nested objects (converted to Android `Bundle`).

---

#### `Broadcast.getLaunchIntent()`

Retrieve the intent that launched the current activity.

**Returns:** `Promise<BroadcastResult>`

```ts
const intent = await Broadcast.getLaunchIntent();
console.log(intent.action, intent.extras);
```

---

#### `Broadcast.addListener(eventName, callback)`

Register a listener for events emitted by the plugin.

| Parameter   | Type                                | Description              |
| ----------- | ----------------------------------- | ------------------------ |
| `eventName` | `"newIntent"`                       | Event name               |
| `callback`  | `(result: BroadcastResult) => void` | Called when the event fires |

**Returns:** `Promise<PluginListenerHandle>` -- call `handle.remove()` to unregister.

The `"newIntent"` event fires when the app receives a new intent while it is already running (e.g., via `onNewIntent` on Android).

```ts
const handle = await Broadcast.addListener("newIntent", (data) => {
  console.log("New intent:", data.action, data.extras);
});

// Later, remove the listener
await handle.remove();
```

---

#### `Broadcast.removeAllListeners()`

Remove all event listeners registered via `addListener`.

**Returns:** `Promise<void>`

```ts
await Broadcast.removeAllListeners();
```

---

### `BroadcastResult` interface

Returned by `subscribe` callbacks, `getLaunchIntent`, and `addListener` callbacks.

| Property  | Type                          | Description              |
| --------- | ----------------------------- | ------------------------ |
| `action`  | `string \| undefined`         | The broadcast action string |
| `extras`  | `Record<string, unknown> \| undefined` | Extra data from the intent |

### `BroadcastPlugin` interface

Low-level Capacitor plugin interface. Use the `Broadcast` class instead for a simpler API with automatic subscription management.
