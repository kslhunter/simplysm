# Wait Utilities

Imported as the `wait` namespace. Async timing utilities.

```typescript
import { wait } from "@simplysm/core-common";
```

## time

```typescript
function time(millisecond: number): Promise<void>;
```

Waits for the specified number of milliseconds.

---

## until

```typescript
function until(
  forwarder: () => boolean | Promise<boolean>,
  milliseconds?: number,
  maxCount?: number,
): Promise<void>;
```

Polls a condition at the given interval (default: 100ms) until it returns `true`. Returns immediately if the condition is `true` on the first call. Throws `TimeoutError` if `maxCount` attempts are exhausted.

---

## Usage Examples

```typescript
import { wait } from "@simplysm/core-common";

// Simple delay
await wait.time(1000); // wait 1 second

// Poll until condition is met
await wait.until(() => isReady, 100, 50);
// Checks every 100ms, up to 50 times (5 seconds total)

// With async condition
await wait.until(async () => {
  const status = await checkStatus();
  return status === "complete";
}, 500);
```
