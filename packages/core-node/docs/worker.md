# Worker

Type-safe `worker_threads` wrapper providing a proxy-based RPC interface for worker threads.

```typescript
import { Worker, createWorker } from "@simplysm/core-node";
```

## Types

### `WorkerModule`

Type structure of the worker module returned by `createWorker()`. Used for type inference in `Worker.create<typeof import("./worker")>()`.

```typescript
interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

### `PromisifyMethods<TMethods>`

Mapping type that wraps method return values in `Promise`. Worker methods operate based on `postMessage` and are always asynchronous, so synchronous method types are also converted to `Promise<Awaited<R>>`.

```typescript
type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

### `WorkerProxy<TModule>`

Proxy type returned by `Worker.create()`. Provides promisified methods + `on()` + `off()` + `terminate()`.

```typescript
type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  /** Registers a worker event listener. */
  on<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  /** Unregisters a worker event listener. */
  off<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  /** Terminates the worker. */
  terminate(): Promise<void>;
};
```

### `WorkerRequest`

Internal worker request message.

```typescript
interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}
```

### `WorkerResponse`

Internal worker response message.

```typescript
type WorkerResponse =
  | { request: WorkerRequest; type: "return"; body?: unknown }
  | { request: WorkerRequest; type: "error"; body: Error }
  | { type: "event"; event: string; body?: unknown }
  | { type: "log"; body: string };
```

## `Worker.create`

Creates a type-safe Worker Proxy.

```typescript
const Worker = {
  create<TModule extends WorkerModule>(
    filePath: string,
    opt?: Omit<WorkerOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule>;
};
```

**Parameters:**
- `filePath` -- Worker file path (file:// URL or absolute path)
- `opt` -- Worker options

**Returns:** Proxy object (supports direct method calls, `on()`, `off()`, and `terminate()`)

In development (`.ts` files), TypeScript worker files are executed via tsx. In production (`.js` files), Worker is created directly.

## `createWorker`

Worker factory for use in worker threads. This is the function called inside the worker file.

```typescript
function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(
  methods: TMethods,
): {
  send<TEventName extends keyof TEvents & string>(event: TEventName, data?: TEvents[TEventName]): void;
  __methods: TMethods;
  __events: TEvents;
};
```

## Example

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
});

// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./worker")>("./worker.ts");
const result = await worker.add(10, 20); // 30
await worker.terminate();
```

### Worker with Events

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

const methods = {
  calc: (x: number) => {
    sender.send("progress", 50);
    return x * 2;
  },
};

const sender = createWorker<typeof methods, MyEvents>(methods);
export default sender;

// main.ts
const worker = Worker.create<typeof import("./worker")>("./worker.ts");
worker.on("progress", (value) => {
  console.log(`Progress: ${value}%`);
});
const result = await worker.calc(5); // 10
await worker.terminate();
```
