//#region Types

/**
 * Type structure of the worker module returned by `createWorker()`.
 * Used for type inference in `Worker.create<typeof import("./worker")>()`.
 *
 * @see createWorker - Create worker module
 * @see Worker.create - Create worker proxy
 */
export interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}

/**
 * Mapping type that wraps method return values in Promise.
 * Worker methods operate based on postMessage and are always asynchronous,
 * so synchronous method types are also converted to `Promise<Awaited<R>>`.
 */
export type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};

/**
 * Proxy type returned by Worker.create().
 * Provides promisified methods + on() + terminate().
 */
export type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  /**
   * Registers a worker event listener.
   */
  on<K extends keyof TModule["default"]["__events"] & string>(
    event: K,
    listener: (data: TModule["default"]["__events"][K]) => void,
  ): void;

  /**
   * Unregisters a worker event listener.
   */
  off<K extends keyof TModule["default"]["__events"] & string>(
    event: K,
    listener: (data: TModule["default"]["__events"][K]) => void,
  ): void;

  /**
   * Terminates the worker.
   */
  terminate(): Promise<void>;
};

/**
 * Internal worker request message.
 */
export interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}

/**
 * Internal worker response message.
 */
export type WorkerResponse =
  | {
      request: WorkerRequest;
      type: "return";
      body?: unknown;
    }
  | {
      request: WorkerRequest;
      type: "error";
      body: Error;
    }
  | {
      type: "event";
      event: string;
      body?: unknown;
    }
  | {
      type: "log";
      body: string;
    };

//#endregion
