# Worker Thread Abstraction (`Worker`)

A type-safe abstraction over Node.js `worker_threads`. Consists of two parts:

- **`createWorker`** — used inside the worker file to expose methods and send events.
- **`Worker.create`** — used in the main thread to call worker methods and listen for events.

## Import

```typescript
import { createWorker, Worker } from "@simplysm/core-node";
```

---

## `createWorker<TMethods, TEvents>(methods)`

Registers the given `methods` object as the worker's RPC interface and sets up message handling. Must be called in a worker thread (throws if `parentPort` is `null`).

Returns an object with:
- `send(event, data?)` — emits a typed event to the main thread.
- `__methods` / `__events` — type metadata used for inference by `Worker.create`.

```typescript
// worker.ts
import { createWorker } from "@simplysm/core-node";

interface MyEvents {
  progress: number;
}

const worker = createWorker<typeof methods, MyEvents>(methods);

const methods = {
  processFile: async (filePath: string) => {
    worker.send("progress", 50);
    return { done: true };
  },
};

export default worker;
```

---

## `Worker.create<TModule>(filePath, opt?)`

Creates a type-safe `WorkerProxy` from the given worker file path. In development (`.ts` files) the worker is loaded via `tsx`; in production (`.js` files) it is loaded directly.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | `string` | Absolute path or `file://` URL of the worker file |
| `opt` | `WorkerOptions` | `worker_threads` options (excluding `stdout`/`stderr`) |

```typescript
// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./worker")>("./worker.ts");

worker.on("progress", (pct) => console.log(`Progress: ${pct}%`));

const result = await worker.processFile("/data/file.txt");

await worker.terminate();
```

---

## Types

### `WorkerModule`

Structural type that worker module exports must conform to. Used as a type parameter for `Worker.create`.

```typescript
interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

### `PromisifyMethods<TMethods>`

Maps all methods in `TMethods` so their return types are wrapped in `Promise`. Used internally by `WorkerProxy`.

```typescript
type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

### `WorkerProxy<TModule>`

The type returned by `Worker.create`. Provides promisified worker methods plus `on()`, `off()`, and `terminate()`.

```typescript
type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  on<K extends string>(event: K, listener: (data: ...) => void): void;
  off<K extends string>(event: K, listener: (data: ...) => void): void;
  terminate(): Promise<void>;
};
```

### `WorkerRequest` (internal)

Internal message format sent from the main thread to the worker thread.

```typescript
interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}
```

### `WorkerResponse` (internal)

Internal message format sent from the worker thread to the main thread. Discriminated union on `type`.

```typescript
type WorkerResponse =
  | { request: WorkerRequest; type: "return"; body?: unknown }
  | { request: WorkerRequest; type: "error";  body: Error }
  | { type: "event"; event: string; body?: unknown }
  | { type: "log";   body: string };
```
