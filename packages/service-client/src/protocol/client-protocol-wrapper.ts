import type { Bytes } from "@simplysm/core-common";
import { LazyGcMap, transferableDecode, Uuid } from "@simplysm/core-common";
import type {
  ServiceMessageDecodeResult,
  ServiceMessage,
  ServiceProtocol,
} from "@simplysm/service-common";

export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
}

// Shared worker state (singleton pattern)
let worker: Worker | undefined;
const workerResolvers = new LazyGcMap<
  string,
  { resolve: (res: unknown) => void; reject: (err: Error) => void }
>({
  gcInterval: 5 * 1000, // Check for expired entries every 5s
  expireTime: 60 * 1000, // Expire after 60s (timeout)
  onExpire: (key, item) => {
    // Reject on expiry (critical for preventing memory leaks)
    item.reject(new Error(`Worker task timed out (uuid: ${key})`));
  },
});

let workerAvailable: boolean | undefined;

function isWorkerAvailable(): boolean {
  if (workerAvailable === undefined) {
    workerAvailable = typeof Worker !== "undefined";
  }
  return workerAvailable;
}

function getWorker(): Worker | undefined {
  if (!isWorkerAvailable()) {
    return undefined;
  }

  if (!worker) {
    // Modern bundlers (Vite/Esbuild/Webpack) use this syntax to split/load the Worker as a separate file
    // Note: use relative path instead of import.meta.resolve (Vite compatibility)
    worker = new Worker(new URL("../workers/client-protocol.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent) => {
      const { id, type, result, error } = event.data as {
        id: string;
        type: "success" | "error";
        result?: unknown;
        error?: { message: string; stack?: string };
      };

      const resolver = workerResolvers.get(id);
      if (resolver != null) {
        if (type === "success") {
          resolver.resolve(result);
        } else {
          const err = new Error(error?.message ?? "Unknown worker error");
          err.stack = error?.stack;
          resolver.reject(err);
        }
        workerResolvers.delete(id);
      }
    };
  }
  return worker;
}

/**
 * Delegate work to Worker and await result
 * Note: only call when workerAvailable is true
 */
async function runWorker(
  type: "encode" | "decode",
  data: unknown,
  transfer: Transferable[] = [],
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Uuid.new().toString();

    workerResolvers.set(id, { resolve, reject });
    // Called after workerAvailable check, so worker always exists
    getWorker()!.postMessage({ id, type, data }, { transfer });
  });
}

export function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper {
  // Threshold: 30KB
  const SIZE_THRESHOLD = 30 * 1024;

  function shouldUseWorkerForEncode(msg: ServiceMessage): boolean {
    if (!("body" in msg)) return false;
    const body = msg.body;

    // Use worker if Uint8Array is present or array length is large
    if (body instanceof Uint8Array) return true;
    if (typeof body === "string" && body.length > SIZE_THRESHOLD) return true;
    if (Array.isArray(body)) {
      return body.length > 100 || (body.length > 0 && body[0] instanceof Uint8Array);
    }

    return false;
  }

  async function encode(
    uuid: string,
    message: ServiceMessage,
  ): Promise<{ chunks: Bytes[]; totalSize: number }> {
    // Process on main thread if no Worker or small data
    if (!isWorkerAvailable() || !shouldUseWorkerForEncode(message)) {
      return protocol.encode(uuid, message);
    }

    // [Worker]
    // Encode requires sending an object, so Structured Clone occurs.
    // But the benefit of offloading JSON.stringify cost from the main thread is greater.
    return (await runWorker("encode", { uuid, message })) as {
      chunks: Bytes[];
      totalSize: number;
    };
  }

  async function decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>> {
    const totalSize = bytes.length;

    // Process on main thread if no Worker or small data
    if (!isWorkerAvailable() || totalSize <= SIZE_THRESHOLD) {
      return protocol.decode(bytes);
    }

    // [Worker]
    // Zero-copy transfer (buffer ownership moves to Worker)
    const rawResult = await runWorker("decode", bytes, [bytes.buffer]);

    // Restore class instances (DateTime, etc.) from Worker's plain object result
    return transferableDecode(rawResult) as ServiceMessageDecodeResult<ServiceMessage>;
  }

  return {
    encode,
    decode,
  };
}
