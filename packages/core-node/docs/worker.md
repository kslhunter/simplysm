# Worker

```typescript
import { createWorker, Worker } from "@simplysm/core-node";
```

Type-safe wrapper around Node.js `worker_threads`. Define methods in a worker file with `createWorker`, then call them from the main thread via `Worker.create` with full type inference.

---

## API Reference

### createWorker

```typescript
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
};
```

Factory function for defining a worker module. Must be the default export of the worker file.

**Parameters:**
- `methods` -- Object mapping method names to handler functions.

**Returns** an object with:
- `send(event, data?)` -- Sends a custom event from the worker to the main thread.
- `__methods` / `__events` -- Type-only markers used for inference (not accessed at runtime).

---

### Worker.create

```typescript
const Worker: {
  create<TModule extends WorkerModule>(
    filePath: string,
    opt?: Omit<WorkerOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule>;
};
```

Creates a type-safe worker proxy. In development (`.ts` files), the worker is executed via `tsx` automatically. In production (`.js` files), the Worker is created directly.

**Parameters:**
- `filePath` -- Worker file path (absolute path or `file://` URL).
- `opt` -- Standard `WorkerOptions` (except `stdout`/`stderr`, which are managed internally).

**Returns** a `WorkerProxy` with:
- All worker methods available as async functions.
- `on(event, listener)` -- Subscribe to worker events.
- `off(event, listener)` -- Unsubscribe from worker events.
- `terminate()` -- Terminates the worker thread.

---

### WorkerModule

```typescript
interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}
```

Type structure of a worker module. Used for type inference with `Worker.create<typeof import("./worker")>()`.

---

### WorkerProxy

```typescript
type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  on<K extends keyof TModule["default"]["__events"] & string>(
    event: K,
    listener: (data: TModule["default"]["__events"][K]) => void,
  ): void;
  off<K extends keyof TModule["default"]["__events"] & string>(
    event: K,
    listener: (data: TModule["default"]["__events"][K]) => void,
  ): void;
  terminate(): Promise<void>;
};
```

The proxy type returned by `Worker.create()`. All worker methods are promisified (return `Promise<Awaited<R>>`).

---

### PromisifyMethods

```typescript
type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

Utility type that wraps all method return values in `Promise`. Worker communication is always asynchronous via `postMessage`.

---

## Usage Examples

### Basic worker

```typescript
// math-worker.ts
import { createWorker } from "@simplysm/core-node";

export default createWorker({
  add: (a: number, b: number) => a + b,
  multiply: (a: number, b: number) => a * b,
});
```

```typescript
// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./math-worker")>(
  new URL("./math-worker.ts", import.meta.url).href,
);

const sum = await worker.add(10, 20);       // 30
const product = await worker.multiply(3, 4); // 12

await worker.terminate();
```

### Worker with events

```typescript
// process-worker.ts
import { createWorker } from "@simplysm/core-node";

interface ProcessEvents {
  progress: number;
  status: string;
}

const methods = {
  processData: async (items: string[]) => {
    const results: string[] = [];
    for (let i = 0; i < items.length; i++) {
      sender.send("progress", ((i + 1) / items.length) * 100);
      sender.send("status", `Processing ${items[i]}`);
      results.push(items[i].toUpperCase());
    }
    return results;
  },
};

const sender = createWorker<typeof methods, ProcessEvents>(methods);
export default sender;
```

```typescript
// main.ts
import { Worker } from "@simplysm/core-node";

const worker = Worker.create<typeof import("./process-worker")>(
  new URL("./process-worker.ts", import.meta.url).href,
);

worker.on("progress", (pct) => {
  console.log(`Progress: ${pct}%`);
});

worker.on("status", (msg) => {
  console.log(`Status: ${msg}`);
});

const results = await worker.processData(["hello", "world"]);
// Progress: 50%
// Status: Processing hello
// Progress: 100%
// Status: Processing world
// results: ["HELLO", "WORLD"]

await worker.terminate();
```

### Worker with options

```typescript
const worker = Worker.create<typeof import("./my-worker")>(
  new URL("./my-worker.ts", import.meta.url).href,
  {
    env: { NODE_ENV: "production" },
    argv: ["--verbose"],
  },
);
```
