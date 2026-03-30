# Worker

Type-safe worker thread abstraction built on Node.js `worker_threads`. Provides a Proxy-based API where worker methods are called as if they were local async functions.

```ts
import { Worker, createWorker } from "@simplysm/core-node";
import type {
  WorkerModule,
  PromisifyMethods,
  WorkerProxy,
  WorkerRequest,
  WorkerResponse,
} from "@simplysm/core-node";
```

## Types

### WorkerModule

```ts
interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

Type structure that `createWorker()` returns. Used for type inference in `Worker.create<typeof import("./worker")>()`.

| Field | Type | Description |
|-------|------|-------------|
| `default.__methods` | `Record<string, (...args: any[]) => unknown>` | Map of callable worker methods |
| `default.__events` | `Record<string, unknown>` | Map of event names to event data types |

### PromisifyMethods

```ts
type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
}
```

Mapped type that wraps all method return types with `Promise<Awaited<R>>`. Worker methods always return promises because they communicate via `postMessage`.

### WorkerProxy

```ts
type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  on<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  off<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  terminate(): Promise<void>;
}
```

The type returned by `Worker.create()`. Combines promisified methods with event subscription and termination.

| Method | Description |
|--------|-------------|
| `on(event, listener)` | Register an event listener |
| `off(event, listener)` | Remove an event listener |
| `terminate()` | Terminate the worker thread |

### WorkerRequest

```ts
interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}
```

Internal message format sent from the main thread to the worker.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique request identifier (UUID) |
| `method` | `string` | Name of the method to invoke |
| `params` | `unknown[]` | Method arguments |

### WorkerResponse

```ts
type WorkerResponse =
  | { request: WorkerRequest; type: "return"; body?: unknown }
  | { request: WorkerRequest; type: "error"; body: Error }
  | { type: "event"; event: string; body?: unknown }
  | { type: "log"; body: string }
```

Internal message format sent from the worker to the main thread. Discriminated union on `type`.

| Variant | Fields | Description |
|---------|--------|-------------|
| `return` | `request`, `body?` | Successful method return value |
| `error` | `request`, `body` | Method threw an error |
| `event` | `event`, `body?` | Worker-emitted event |
| `log` | `body` | Redirected stdout output |

## Worker

Static factory object for creating type-safe worker proxies.

### Worker.create

```ts
Worker.create<TModule extends WorkerModule>(
  filePath: string,
  opt?: Omit<WorkerRawOptions, "stdout" | "stderr">,
): WorkerProxy<TModule>
```

Create a type-safe worker proxy.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Worker file path (`file://` URL or absolute path) |
| `opt` | `Omit<WorkerRawOptions, "stdout" \| "stderr">?` | Node.js `WorkerOptions` (excluding stdout/stderr which are managed internally) |

In development (`.ts` files), the worker is run through `tsx`. In production (`.js` files), the worker is created directly.

**Returns:** `WorkerProxy<TModule>` -- Proxy object supporting direct method calls, `on()`, `off()`, and `terminate()`.

## createWorker

```ts
function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(
  methods: TMethods,
): {
  send<TEventName extends keyof TEvents & string>(
    event: TEventName,
    data?: TEvents[TEventName],
  ): void;
  __methods: TMethods;
  __events: TEvents;
}
```

Factory function used inside the worker thread file. Registers method handlers and sets up the message protocol. Returns a sender object for emitting events back to the main thread.

| Parameter | Type | Description |
|-----------|------|-------------|
| `methods` | `TMethods` | Object mapping method names to handler functions |

The returned object exposes:

| Property/Method | Description |
|-----------------|-------------|
| `send(event, data?)` | Emit a typed event to the main thread |
| `__methods` | Type-level reference to the methods map (used for type inference) |
| `__events` | Type-level reference to the events map (used for type inference) |

**Throws:** `SdError` if not running in a worker thread (no `parentPort`).

## Usage

### Basic worker (no events)

```ts
// math-worker.ts
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b,
});

// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./math-worker")>("./math-worker.ts");
const sum = await worker.add(10, 20);       // 30
const product = await worker.multiply(3, 7); // 21
await worker.terminate();
```

### Worker with events

```ts
// process-worker.ts
import { createWorker } from "@simplysm/core-node";

interface Events {
  progress: number;
}

const methods = {
  processData: (items: string[]) => {
    for (let i = 0; i < items.length; i++) {
      // ... process item ...
      sender.send("progress", ((i + 1) / items.length) * 100);
    }
    return items.length;
  },
};

const sender = createWorker<typeof methods, Events>(methods);
export default sender;

// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./process-worker")>("./process-worker.ts");
worker.on("progress", (pct) => console.log(`${pct}% done`));
const count = await worker.processData(["a", "b", "c"]);
await worker.terminate();
```
