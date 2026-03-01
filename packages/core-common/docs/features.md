# Features

Async coordination and event primitives provided by `@simplysm/core-common`.

---

## `DebounceQueue`

When called multiple times in rapid succession, only the last request is executed after the delay. Extends `EventEmitter`.

```typescript
import { DebounceQueue } from "@simplysm/core-common";

const queue = new DebounceQueue(300); // 300ms delay
queue.on("error", (err) => console.error(err));

queue.run(() => console.log("1")); // ignored
queue.run(() => console.log("2")); // ignored
queue.run(() => console.log("3")); // executed after 300ms

queue.dispose(); // cancel pending tasks
// Or: using queue = new DebounceQueue(300);
```

| Member | Description |
|--------|-------------|
| `new DebounceQueue(delay?)` | `delay` in ms. Omit for immediate (next event loop) |
| `.run(fn)` | Schedules `fn`. Replaces any previously queued function |
| `.dispose()` | Cancels pending tasks and clears timer. Supports `using` |
| `on("error", handler)` | Handles errors from the queued function |

---

## `SerialQueue`

Functions added to the queue are executed sequentially. The next task starts only after the current one completes. Extends `EventEmitter`.

```typescript
import { SerialQueue } from "@simplysm/core-common";

const queue = new SerialQueue(50); // 50ms gap between tasks
queue.on("error", (err) => console.error(err));

queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // waits for /api/1
queue.run(async () => { await fetch("/api/3"); }); // waits for /api/2

queue.dispose(); // clears pending queue (current task still completes)
// Or: using queue = new SerialQueue();
```

| Member | Description |
|--------|-------------|
| `new SerialQueue(gap?)` | `gap` in ms between tasks (default: 0) |
| `.run(fn)` | Adds `fn` to the queue |
| `.dispose()` | Clears pending queue. Supports `using` |
| `on("error", handler)` | Handles per-task errors |

---

## `EventEmitter<TEvents>`

Type-safe event emitter backed by `EventTarget`. Usable in both browser and Node.js.

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyEmitter extends EventEmitter<MyEvents> {}

const emitter = new MyEmitter();
emitter.on("data", (data) => console.log(data));
emitter.emit("data", "hello");
emitter.emit("done");              // void event: no argument needed
emitter.off("data", handler);
emitter.listenerCount("data");     // number
emitter.dispose();                 // remove all listeners
// Or: using emitter = new MyEmitter();
```

| Member | Description |
|--------|-------------|
| `.on(type, listener)` | Register listener. Duplicate registration of the same listener is ignored |
| `.off(type, listener)` | Remove listener |
| `.emit(type, data?)` | Dispatch event. `void` typed events take no data argument |
| `.listenerCount(type)` | Number of listeners for event type |
| `.dispose()` | Remove all listeners. Supports `using` |
