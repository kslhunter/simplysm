# @simplysm/capacitor-plugin-broadcast

Capacitor plugin for sending and receiving Android Broadcasts. Designed for integrating with industrial devices such as barcode scanners and PDAs.

> **Android only** — iOS does not support the Broadcast concept.

## Installation

```bash
yarn add @simplysm/capacitor-plugin-broadcast
npx cap sync
```

## API

### Broadcast

Abstract static class for Android Broadcast send/receive operations.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";
```

#### `Broadcast.subscribe(filters: string[], callback: (result: IBroadcastResult) => void): Promise<() => Promise<void>>`

Registers a Broadcast receiver for the specified intent filters. Returns an unsubscribe function.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log("Action:", result.action);
    console.log("Extras:", result.extras);
  },
);

// Unsubscribe when done
await unsubscribe();
```

#### `Broadcast.unsubscribeAll(): Promise<void>`

Removes all registered Broadcast receivers.

```typescript
await Broadcast.unsubscribeAll();
```

#### `Broadcast.send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>`

Sends a Broadcast with the specified action and optional extras.

```typescript
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

#### `Broadcast.getLaunchIntent(): Promise<IBroadcastResult>`

Retrieves the Intent that launched the app.

```typescript
const launchIntent = await Broadcast.getLaunchIntent();
console.log(launchIntent.action);
console.log(launchIntent.extras);
```

---

### Example: Zebra DataWedge Integration

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// Listen for barcode scan results
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    const barcode = result.extras?.["com.symbol.datawedge.data_string"];
    if (barcode) {
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

## Types

### IBroadcastResult

```typescript
import { IBroadcastResult } from "@simplysm/capacitor-plugin-broadcast";
```

```typescript
interface IBroadcastResult {
  /** Broadcast action */
  action?: string;
  /** Extra data */
  extras?: Record<string, unknown>;
}
```

### IBroadcastPlugin

Raw Capacitor plugin interface. Typically used internally by `Broadcast`.

```typescript
import { IBroadcastPlugin } from "@simplysm/capacitor-plugin-broadcast";
```

```typescript
interface IBroadcastPlugin {
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
