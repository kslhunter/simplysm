# Features

## `DebounceQueue`

Async debounce queue. When multiple calls arrive in quick succession, only the last enqueued function executes after the delay. Extends `EventEmitter<{ error: SdError }>`.

If a new request arrives while a previous one is executing, it runs immediately after the current execution completes (no debounce delay).

```typescript
class DebounceQueue extends EventEmitter<{ error: SdError }> {
  constructor(delay?: number);

  run(fn: () => void | Promise<void>): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `delay` | `number \| undefined` | Debounce delay in ms. If omitted, executes on next event loop tick. |

### Methods

| Method | Description |
|--------|-------------|
| `run(fn)` | Enqueue a function. Replaces any previously pending function. |
| `dispose()` | Cancel pending work and clean up timers. |
| `[Symbol.dispose]()` | Supports `using` statement. |

### Error Handling

Errors from the executed function are emitted as `"error"` events. If no listener is registered, errors are logged via `consola`.

---

## `SerialQueue`

Async serial queue. Functions are executed one at a time in FIFO order. Errors in one task do not prevent subsequent tasks from running. Extends `EventEmitter<{ error: SdError }>`.

```typescript
class SerialQueue extends EventEmitter<{ error: SdError }> {
  constructor(gap?: number);

  run(fn: () => void | Promise<void>): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `gap` | `number` | Delay between tasks in ms. Default: `0`. |

### Methods

| Method | Description |
|--------|-------------|
| `run(fn)` | Add a function to the queue. Starts processing if not already running. |
| `dispose()` | Clear the pending queue (current task completes). |
| `[Symbol.dispose]()` | Supports `using` statement. |

### Error Handling

Same as `DebounceQueue`: errors are emitted as `"error"` events or logged if no listener.

---

## `EventEmitter<TEvents>`

Type-safe event emitter built on the `EventTarget` API. Works in both browser and Node.js. Duplicate listener registration for the same event is silently ignored.

```typescript
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  on<TEventName extends keyof TEvents & string>(
    type: TEventName,
    listener: (data: TEvents[TEventName]) => void,
  ): void;

  off<TEventName extends keyof TEvents & string>(
    type: TEventName,
    listener: (data: TEvents[TEventName]) => void,
  ): void;

  emit<TEventName extends keyof TEvents & string>(
    type: TEventName,
    ...args: TEvents[TEventName] extends void ? [] : [data: TEvents[TEventName]]
  ): void;

  listenerCount<TEventName extends keyof TEvents & string>(type: TEventName): number;

  dispose(): void;
  [Symbol.dispose](): void;
}
```

### Type Parameter

| Parameter | Description |
|-----------|-------------|
| `TEvents` | Object type mapping event names to their data types. Use `void` for events with no data. |

### Methods

| Method | Description |
|--------|-------------|
| `on(type, listener)` | Register a listener. Duplicate registration for same event is ignored. |
| `off(type, listener)` | Remove a listener. |
| `emit(type, ...args)` | Dispatch an event. For `void` event types, no data argument is needed. |
| `listenerCount(type)` | Return the number of listeners for an event type. |
| `dispose()` | Remove all listeners from all events. |
| `[Symbol.dispose]()` | Supports `using` statement. |
