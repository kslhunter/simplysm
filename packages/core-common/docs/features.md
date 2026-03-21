# Features

Feature classes for async control flow and event handling.

Source: `src/features/*.ts`

---

## `EventEmitter`

Type-safe event emitter that can be used in both browsers and Node.js. Internally implemented using `EventTarget`. Supports the `using` statement (`Symbol.dispose`).

```typescript
export class EventEmitter<
  TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>,
> {
  /**
   * Register an event listener
   * @note Duplicate registration of the same listener to the same event is ignored
   */
  on<TEventName extends keyof TEvents & string>(
    type: TEventName,
    listener: (data: TEvents[TEventName]) => void,
  ): void;

  /** Remove an event listener */
  off<TEventName extends keyof TEvents & string>(
    type: TEventName,
    listener: (data: TEvents[TEventName]) => void,
  ): void;

  /**
   * Emit an event
   * @param args Event data (omitted if void type)
   */
  emit<TEventName extends keyof TEvents & string>(
    type: TEventName,
    ...args: TEvents[TEventName] extends void ? [] : [data: TEvents[TEventName]]
  ): void;

  /** Return the number of listeners for a specific event */
  listenerCount<TEventName extends keyof TEvents & string>(type: TEventName): number;

  /** Remove all event listeners */
  dispose(): void;

  [Symbol.dispose](): void;
}
```

**Example:**

```typescript
interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyEmitter extends EventEmitter<MyEvents> {}

const emitter = new MyEmitter();
emitter.on("data", (data) => console.log(data)); // data: string
emitter.emit("data", "hello");
emitter.emit("done"); // void type is called without arguments
```

---

## `DebounceQueue`

Asynchronous debounce queue. When called multiple times within a short time, only the last request is executed and previous requests are ignored. Extends `EventEmitter<{ error: SdError }>`. Supports the `using` statement.

Requests added during execution are processed immediately after the current execution completes without debounce delay.

```typescript
export class DebounceQueue extends EventEmitter<{ error: SdError }> {
  /**
   * @param _delay Debounce delay time (milliseconds). If omitted, executes immediately (next event loop)
   */
  constructor(delay?: number);

  /** Clean up pending tasks and timers */
  dispose(): void;

  [Symbol.dispose](): void;

  /**
   * Add a function to the queue
   * If there was a previously added function, it will be replaced
   */
  run(fn: () => void | Promise<void>): void;
}
```

**Error handling:** If there are `"error"` event listeners, errors are emitted as events. Otherwise, errors are logged via `consola`.

**Example:**

```typescript
const queue = new DebounceQueue(300); // 300ms delay
queue.run(() => console.log("1")); // ignored
queue.run(() => console.log("2")); // ignored
queue.run(() => console.log("3")); // executed after 300ms

queue.on("error", (err) => console.error(err));
```

---

## `SerialQueue`

Asynchronous serial queue. Functions added to the queue are executed sequentially. The next task starts only after one task completes. Subsequent tasks continue to execute even if an error occurs. Extends `EventEmitter<{ error: SdError }>`. Supports the `using` statement.

```typescript
export class SerialQueue extends EventEmitter<{ error: SdError }> {
  /**
   * @param gap Gap between each task (ms). Default: 0
   */
  constructor(gap?: number);

  /** Clear pending queue (currently executing task will complete) */
  dispose(): void;

  [Symbol.dispose](): void;

  /** Add a function to the queue and execute it */
  run(fn: () => void | Promise<void>): void;
}
```

**Error handling:** Same as `DebounceQueue` — emitted as event if listeners exist, otherwise logged.

**Example:**

```typescript
const queue = new SerialQueue();
queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // executed after 1 completes
queue.run(async () => { await fetch("/api/3"); }); // executed after 2 completes

queue.on("error", (err) => console.error(err));
```
