# Async Queues

Two `EventEmitter`-based queues for controlling async function execution.

## SdAsyncFnDebounceQueue

Debounces rapid function submissions. Only the **last** submitted function runs. If a new function is submitted while the previous one is still running, it replaces the pending function and executes after the current one completes.

### Constructor

```ts
new SdAsyncFnDebounceQueue(delay?: number)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `delay` | `number` | `undefined` | Delay in milliseconds before executing after the last `run()` call. |

### Methods

| Method | Description |
|---|---|
| `run(fn)` | Submit a function. Previous pending (not yet started) functions are discarded. |

### Events

| Event | Payload | Description |
|---|---|---|
| `"error"` | `SdError` | Emitted when a queued function throws. |

### Example

```ts
import { SdAsyncFnDebounceQueue } from "@simplysm/sd-core-common";

const queue = new SdAsyncFnDebounceQueue(300);
queue.on("error", (err) => console.error(err));

// Only the last call within 300ms actually executes
queue.run(async () => { /* fetch data for input "a" */ });
queue.run(async () => { /* fetch data for input "ab" */ });
queue.run(async () => { /* fetch data for input "abc" -- this one runs */ });
```

---

## SdAsyncFnSerialQueue

Executes queued functions **one at a time**, in FIFO order. Each function waits for the previous one to complete before starting.

### Constructor

```ts
new SdAsyncFnSerialQueue(gap?: number)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `gap` | `number` | `0` | Delay in milliseconds between consecutive function executions. |

### Methods

| Method | Description |
|---|---|
| `run(fn)` | Enqueue a function for serial execution. |

### Events

| Event | Payload | Description |
|---|---|---|
| `"error"` | `SdError` | Emitted when a queued function throws. Processing continues with the next item. |

### Example

```ts
import { SdAsyncFnSerialQueue } from "@simplysm/sd-core-common";

const queue = new SdAsyncFnSerialQueue(100); // 100ms gap between tasks
queue.on("error", (err) => console.error(err));

queue.run(async () => { /* task 1 */ });
queue.run(async () => { /* task 2 -- starts after task 1 + 100ms gap */ });
queue.run(async () => { /* task 3 -- starts after task 2 + 100ms gap */ });
```
