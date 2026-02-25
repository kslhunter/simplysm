import { EventEmitter, transferableDecode, transferableEncode, Uuid } from "@simplysm/core-common";
import consola from "consola";
import path from "path";
import { fileURLToPath } from "url";
import type { WorkerOptions as WorkerRawOptions } from "worker_threads";
import { Worker as WorkerRaw } from "worker_threads";
import type { WorkerModule, WorkerProxy, WorkerRequest, WorkerResponse } from "./types";

const logger = consola.withTag("sd-worker");

//#region WorkerInternal

/**
 * Internal implementation class for Worker.
 * Exposed to the outside through a Proxy.
 *
 * In development (.ts files), TypeScript worker files are executed via tsx.
 * In production (.js files), Worker is created directly.
 */
class WorkerInternal extends EventEmitter<Record<string, unknown>> {
  private readonly _worker: WorkerRaw;
  private _isTerminated = false;
  private readonly _pendingRequests = new Map<
    string,
    { method: string; resolve: (value: unknown) => void; reject: (err: Error) => void }
  >();

  constructor(filePath: string, opt?: Omit<WorkerRawOptions, "stdout" | "stderr">) {
    super();

    const ext = path.extname(import.meta.filename);

    // Extract env object through type guard
    const envObj = opt?.env != null && typeof opt.env === "object" ? opt.env : {};

    // In development (.ts files), execute via tsx
    // worker-dev-proxy.js: Proxy to dynamically load TypeScript worker files via tsx
    if (ext === ".ts") {
      // If file:// URL, convert to absolute path (worker-dev-proxy.js applies pathToFileURL again)
      const workerPath = filePath.startsWith("file://") ? fileURLToPath(filePath) : filePath;
      this._worker = new WorkerRaw(
        path.resolve(import.meta.dirname, "../../lib/worker-dev-proxy.js"),
        {
          stdout: true,
          stderr: true,
          ...opt,
          env: {
            ...process.env,
            ...envObj,
          },
          argv: [workerPath, ...(opt?.argv ?? [])],
        },
      );
    } else {
      // Production environment (.js files)
      // If file:// URL, convert it; otherwise use absolute path as-is
      const workerPath = filePath.startsWith("file://") ? fileURLToPath(filePath) : filePath;
      this._worker = new WorkerRaw(workerPath, {
        stdout: true,
        stderr: true,
        ...opt,
        env: {
          ...process.env,
          ...envObj,
        },
      });
    }

    // Pipe worker's stdout/stderr to main process
    this._worker.stdout.pipe(process.stdout);
    this._worker.stderr.pipe(process.stderr);

    this._worker.on("exit", (code) => {
      if (!this._isTerminated && code !== 0) {
        logger.error(`Worker exited with error (code: ${code})`);
        // Reject all pending requests on abnormal exit
        this._rejectAllPending(new Error(`Worker exited abnormally (code: ${code})`));
      }
    });

    this._worker.on("error", (err) => {
      logger.error("Worker error:", err);
      // Reject all pending requests on worker error
      this._rejectAllPending(err);
    });

    this._worker.on("message", (serializedResponse: unknown) => {
      const decoded = transferableDecode(serializedResponse);

      // Validate response structure
      if (decoded == null || typeof decoded !== "object" || !("type" in decoded)) {
        logger.warn("Invalid response format from worker:", decoded);
        return;
      }
      const response = decoded as WorkerResponse;

      if (response.type === "event") {
        this.emit(response.event, response.body);
      } else if (response.type === "log") {
        process.stdout.write(response.body);
      } else if (response.type === "return") {
        const pending = this._pendingRequests.get(response.request.id);
        if (pending) {
          this._pendingRequests.delete(response.request.id);
          pending.resolve(response.body);
        }
      } else {
        // response.type === "error"
        const pending = this._pendingRequests.get(response.request.id);
        if (pending) {
          this._pendingRequests.delete(response.request.id);
          pending.reject(response.body);
        }
      }
    });
  }

  /**
   * Rejects all pending requests.
   */
  private _rejectAllPending(err: Error): void {
    for (const [_id, { method, reject }] of this._pendingRequests) {
      reject(new Error(`${err.message} (method: ${method})`));
    }
    this._pendingRequests.clear();
  }

  /**
   * Calls a worker method.
   */
  call(method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const request: WorkerRequest = {
        id: Uuid.new().toString(),
        method,
        params,
      };

      this._pendingRequests.set(request.id, { method, resolve, reject });

      const serialized = transferableEncode(request);
      this._worker.postMessage(serialized.result, serialized.transferList);
    });
  }

  /**
   * Terminates the worker.
   */
  async terminate(): Promise<void> {
    this._isTerminated = true;
    this._rejectAllPending(new Error("Worker terminated"));
    await this._worker.terminate();
  }
}

//#endregion

//#region Worker

/**
 * Type-safe Worker wrapper.
 *
 * @example
 * // worker.ts
 * export default createWorker({
 *   add: (a: number, b: number) => a + b,
 * });
 *
 * // main.ts
 * const worker = Worker.create<typeof import("./worker")>("./worker.ts");
 * const result = await worker.add(10, 20);  // 30
 * await worker.terminate();
 */
export const Worker = {
  /**
   * Creates a type-safe Worker Proxy.
   *
   * @param filePath - Worker file path (file:// URL or absolute path)
   * @param opt - Worker options
   * @returns Proxy object (supports direct method calls, on(), and terminate())
   */
  create<TModule extends WorkerModule>(
    filePath: string,
    opt?: Omit<WorkerRawOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule> {
    const internal = new WorkerInternal(filePath, opt);

    return new Proxy({} as WorkerProxy<TModule>, {
      get(_target, prop: string) {
        // Reserved methods: on, off, terminate
        if (prop === "on") {
          return (event: string, listener: (data: unknown) => void) => {
            internal.on(event, listener);
          };
        }
        if (prop === "off") {
          return (event: string, listener: (data: unknown) => void) => {
            internal.off(event, listener);
          };
        }
        if (prop === "terminate") {
          return () => internal.terminate();
        }

        // Otherwise, treat as worker method
        return (...args: unknown[]) => internal.call(prop, args);
      },
    });
  },
};

//#endregion
