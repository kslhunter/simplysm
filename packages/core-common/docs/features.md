# Features

Async control primitives: type-safe event emitter, debounce queue, and serial queue.

## EventEmitter

```typescript
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  on<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void;
  off<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void;
  emit<K extends keyof TEvents & string>(type: K, ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]): void;
  listenerCount<K extends keyof TEvents & string>(type: K): number;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

A type-safe event emitter that works in both browsers and Node.js. Internally implemented using `EventTarget`. Duplicate registration of the same listener to the same event is ignored.

Use `void` as the event data type for events that carry no data -- `emit("done")` is called without arguments.

---

## DebounceQueue

```typescript
class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);
  run(fn: () => void | Promise<void>): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

When called multiple times within a short time, only the last request is executed. Previous requests are replaced. If `delay` is omitted, executes on the next event loop tick.

Requests added during execution are processed immediately after the current execution completes (no debounce delay for mid-execution arrivals). Errors are emitted as `"error"` events; if no listener is registered, they are logged.

---

## SerialQueue

```typescript
class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);
  run(fn: () => void | Promise<void>): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

Functions added to the queue are executed sequentially -- the next task starts only after the previous one completes. Subsequent tasks continue even if an error occurs. The optional `gap` parameter adds a delay between each task. Errors are emitted as `"error"` events.

---

## Usage Examples

```typescript
import { EventEmitter, DebounceQueue, SerialQueue } from "@simplysm/core-common";

// EventEmitter
interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyEmitter extends EventEmitter<MyEvents> {}

const emitter = new MyEmitter();
emitter.on("data", (data) => { /* data: string */ });
emitter.emit("data", "hello");
emitter.emit("done"); // void type, no arguments

// DebounceQueue
using queue = new DebounceQueue(300); // 300ms delay
queue.on("error", (err) => { /* handle error */ });
queue.run(() => { /* ignored */ });
queue.run(() => { /* ignored */ });
queue.run(() => { /* executed after 300ms */ });

// SerialQueue
using serial = new SerialQueue();
serial.on("error", (err) => { /* handle error */ });
serial.run(async () => { await fetch("/api/1"); });
serial.run(async () => { await fetch("/api/2"); }); // runs after 1 completes
serial.run(async () => { await fetch("/api/3"); }); // runs after 2 completes
```
