# @simplysm/capacitor-plugin-broadcast

A Capacitor plugin for sending and receiving Android Broadcast Intents. It is primarily designed for integration with industrial Android devices such as barcode scanners and PDAs.

It provides features including BroadcastReceiver registration/unregistration, Intent sending, app launch Intent retrieval, and new Intent reception listeners.

## Installation

```bash
npm install @simplysm/capacitor-plugin-broadcast
npx cap sync
```

## Supported Platforms

| Platform | Supported | Notes |
|--------|----------|------|
| Android | Yes | Native BroadcastReceiver implementation |
| iOS | No | Not supported |
| Web | Partial | Stub implementation (outputs warning messages, no actual functionality) |

## Main Modules

### `Broadcast` Class

A wrapper class consisting only of static methods. Access the native plugin through this class instead of using it directly.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";
```

| Method | Signature | Return Type | Description |
|--------|-----------|----------|------|
| `subscribe` | `(filters: string[], callback: (result: IBroadcastResult) => void)` | `Promise<() => Promise<void>>` | Registers a Broadcast receiver and returns an unsubscribe function |
| `unsubscribeAll` | `()` | `Promise<void>` | Unregisters all registered Broadcast receivers |
| `send` | `(options: { action: string; extras?: Record<string, unknown> })` | `Promise<void>` | Sends a Broadcast Intent |
| `getLaunchIntent` | `()` | `Promise<IBroadcastResult>` | Retrieves the Intent information that launched the app |
| `addNewIntentListener` | `(callback: (result: IBroadcastResult) => void)` | `Promise<PluginListenerHandle>` | Registers a listener for new Intents received while the app is running |

### `IBroadcastResult` Interface

An interface representing Broadcast reception results or Intent information.

| Property | Type | Description |
|------|------|------|
| `action` | `string \| undefined` | Broadcast action string |
| `extras` | `Record<string, unknown> \| undefined` | Additional data included in the Intent |

### `IBroadcastPlugin` Interface

The low-level Capacitor plugin interface. In most cases, use the `Broadcast` wrapper class instead of this interface directly. It is exported for advanced use cases such as custom plugin registration.

| Method | Signature | Return Type | Description |
|--------|-----------|----------|------|
| `subscribe` | `(options: { filters: string[] }, callback: (result: IBroadcastResult) => void)` | `Promise<{ id: string }>` | Register a BroadcastReceiver with intent filters |
| `unsubscribe` | `(options: { id: string })` | `Promise<void>` | Unregister a specific BroadcastReceiver by ID |
| `unsubscribeAll` | `()` | `Promise<void>` | Unregister all BroadcastReceivers |
| `send` | `(options: { action: string; extras?: Record<string, unknown> })` | `Promise<void>` | Send a Broadcast Intent |
| `getLaunchIntent` | `()` | `Promise<IBroadcastResult>` | Retrieve the launch Intent |
| `addListener` | `(eventName: "onNewIntent", listenerFunc: (data: IBroadcastResult) => void)` | `Promise<PluginListenerHandle>` | Listen for new Intents while the app is running |

```typescript
import type { IBroadcastPlugin, IBroadcastResult } from "@simplysm/capacitor-plugin-broadcast";
```

## Usage Examples

### Receiving Broadcasts

Registers a Broadcast receiver for specific actions. `subscribe` returns an unsubscribe function that can be called to remove the receiver.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// Register Broadcast receiver
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log("Action:", result.action);
    console.log("Extras:", result.extras);
  },
);

// Unsubscribe receiver
await unsubscribe();
```

You can also filter multiple actions simultaneously.

```typescript
const unsubscribe = await Broadcast.subscribe(
  [
    "com.symbol.datawedge.api.RESULT_ACTION",
    "com.symbol.datawedge.api.NOTIFICATION_ACTION",
  ],
  (result) => {
    switch (result.action) {
      case "com.symbol.datawedge.api.RESULT_ACTION":
        // Handle result
        break;
      case "com.symbol.datawedge.api.NOTIFICATION_ACTION":
        // Handle notification
        break;
    }
  },
);
```

### Unsubscribe All Receivers

Unregisters all registered Broadcast receivers at once. Use this for cleanup when the app exits or during screen transitions.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.unsubscribeAll();
```

### Sending Broadcasts

Sends a Broadcast Intent to other apps or the system. You can include additional data as key-value pairs in `extras`.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

`extras` can contain various types of values.

```typescript
await Broadcast.send({
  action: "com.example.MY_ACTION",
  extras: {
    stringValue: "hello",
    numberValue: 42,
    booleanValue: true,
    arrayValue: ["item1", "item2"],
    nestedValue: {
      key: "value",
    },
  },
});
```

### Retrieving Launch Intent

If the app was started through an Intent from another app, you can retrieve that Intent information.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const launchIntent = await Broadcast.getLaunchIntent();
if (launchIntent.action != null) {
  console.log("Launch Action:", launchIntent.action);
  console.log("Launch Extras:", launchIntent.extras);
}
```

### New Intent Listener

Detects when a new Intent is received while the app is already running. Remove the listener using the `remove()` method of the returned `PluginListenerHandle`.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const handle = await Broadcast.addNewIntentListener((result) => {
  console.log("New Intent received:", result.action);
  console.log("Extras:", result.extras);
});

// Remove listener
await handle.remove();
```

### DataWedge Integration Example (Zebra Devices)

A real-world usage pattern for integrating with industrial barcode scanners (Zebra DataWedge).

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// Register barcode scan result receiver
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    const barcode = result.extras?.["com.symbol.datawedge.data_string"];
    if (barcode != null) {
      console.log("Scanned barcode:", barcode);
    }
  },
);

// Trigger soft scan
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

## Supported Extras Types

The types of values that can be included in `extras` when calling `send()`, and the types they are converted to when received, are as follows.

### When Sending (TypeScript -> Android Intent)

| TypeScript Type | Android Intent Type |
|----------------|-------------------|
| `string` | `String` |
| `number` (integer) | `Integer` |
| `number` (decimal) | `Double` |
| `boolean` | `Boolean` |
| `string[]` | `String[]` |
| Nested object | `Bundle` |

### When Receiving (Android Intent -> TypeScript)

| Android Type | TypeScript Type |
|-------------|----------------|
| `String` | `string` |
| `Integer` | `number` |
| `Long` | `number` |
| `Double` | `number` |
| `Float` | `number` |
| `Boolean` | `boolean` |
| `Bundle` | Nested object |
| `String[]` | `string[]` |
| `int[]` | `number[]` |
| `Parcelable` | `string` (toString) |

## Lifecycle Management

- The plugin automatically unregisters all BroadcastReceivers when the Activity is destroyed (`handleOnDestroy`).
- On Android 13 (API 33, Tiramisu) and above, receivers are registered using the `RECEIVER_EXPORTED` flag.
- To prevent memory leaks, it is recommended to unregister receivers that are no longer needed using the returned unsubscribe function or `unsubscribeAll()`.

## Dependencies

### Peer Dependencies

| Package | Version |
|--------|------|
| `@capacitor/core` | `^7.4.4` |

## License

MIT
