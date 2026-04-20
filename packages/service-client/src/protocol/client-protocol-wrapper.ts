import type { Bytes } from "@simplysm/core-common";
import { LazyGcMap, transfer, Uuid } from "@simplysm/core-common";
import type {
  ServiceMessageDecodeResult,
  ServiceMessage,
  ServiceProtocol,
} from "@simplysm/service-common";
import type { BrowserWorker } from "../types/browser-compat";
import {
  isBrowserWorkerSupported,
  isNodeWorkerSupported,
  isWorkerSupported,
} from "../types/browser-compat";

// node env typecheck에서 DOM Worker 생성자가 없으므로 모듈 스코프 선언으로 보완
// browser env에서는 global Worker를 shadow (구조적 호환). 컴파일 시 제거됨.
declare const Worker: {
  new (scriptURL: string | URL, options?: { type?: string }): BrowserWorker;
};

export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}

const workerResolvers = new LazyGcMap<
  string,
  { resolve: (res: unknown) => void; reject: (err: Error) => void }
>({
  gcInterval: 5 * 1000,
  expireTime: 60 * 1000,
  onExpire: (key, item) => {
    item.reject(new Error(`Worker 작업 시간 초과 (uuid: ${key})`));
  },
});

let workerAvailable: boolean | undefined;

function isWorkerAvailable(): boolean {
  if (workerAvailable == null) {
    workerAvailable = isWorkerSupported();
  }
  return workerAvailable;
}

function setupWorkerHandlers(w: BrowserWorker): void {
  w.onmessage = (event: MessageEvent) => {
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
        const err = new Error(error?.message ?? "알 수 없는 worker 에러");
        err.stack = error?.stack;
        resolver.reject(err);
      }
      workerResolvers.delete(id);
    }
  };

  w.onerror = () => {
    const workerErr = new Error("Worker 초기화 실패");
    for (const resolver of workerResolvers.values()) {
      resolver.reject(workerErr);
    }
    workerResolvers.clear();

    workerInitPromise = undefined;
    workerAvailable = false;
  };
}

function createNodeWorkerAdapter(nodeWorker: import("worker_threads").Worker): BrowserWorker {
  const adapter: BrowserWorker = {
    onmessage: null,
    onerror: null,
    postMessage(message: unknown, transferItems?: unknown[]) {
      nodeWorker.postMessage(message, transferItems as import("worker_threads").TransferListItem[]);
    },
    terminate() {
      void nodeWorker.terminate();
    },
  };

  nodeWorker.on("message", (data: unknown) => {
    adapter.onmessage?.({ data } as MessageEvent);
  });
  nodeWorker.on("error", (err: Error) => {
    adapter.onerror?.(err as unknown as Event);
  });

  return adapter;
}

let workerInitPromise: Promise<BrowserWorker | undefined> | undefined;

async function initWorker(): Promise<BrowserWorker | undefined> {
  try {
    if (isBrowserWorkerSupported()) {
      // esbuild Worker 번들링 플러그인(sd-worker-bundle)이 이 패턴을 AST에서 인식
      const w: BrowserWorker = new Worker(
        new URL("../workers/client-protocol.worker.js", import.meta.url),
        { type: "module" },
      );
      setupWorkerHandlers(w);
      return w;
    }

    if (isNodeWorkerSupported()) {
      // esbuild Worker 번들링 플러그인이 import.meta.resolve 패턴을 인식
      const workerUrl = import.meta.resolve("../workers/client-protocol.worker.js");
      const workerThreadsId = "worker_threads";
      const { Worker: NodeWorker } = await import(/* @vite-ignore */ workerThreadsId);
      const nodeWorker = new NodeWorker(new URL(workerUrl)) as import("worker_threads").Worker;
      const adapter = createNodeWorkerAdapter(nodeWorker);
      setupWorkerHandlers(adapter);
      return adapter;
    }
  } catch {
    workerAvailable = false;
  }

  return undefined;
}

async function getWorker(): Promise<BrowserWorker | undefined> {
  if (!isWorkerAvailable()) {
    return undefined;
  }

  if (workerInitPromise == null) {
    workerInitPromise = initWorker().then((w) => {
      if (w == null) {
        workerAvailable = false;
      }
      return w;
    });
  }

  return workerInitPromise;
}

async function runWorker(
  type: "encode" | "decode",
  data: unknown,
  transferables: ArrayBuffer[] = [],
): Promise<unknown | undefined> {
  const w = await getWorker();
  if (w == null) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const id = Uuid.generate().toString();
    workerResolvers.set(id, { resolve, reject });
    w.postMessage({ id, type, data }, transferables);
  });
}

export function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper {
  // 임계값: 30KB
  const SIZE_THRESHOLD = 30 * 1024;

  function shouldUseWorkerForEncode(msg: ServiceMessage): boolean {
    if (!("body" in msg)) return false;
    const body = msg.body;

    // Uint8Array가 있거나 배열 길이가 큰 경우 worker 사용
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
    // Worker가 없거나 데이터가 작으면 메인 스레드에서 처리
    if (!isWorkerAvailable() || !shouldUseWorkerForEncode(message)) {
      return protocol.encode(uuid, message);
    }

    const workerResult = await runWorker("encode", { uuid, message });
    if (workerResult == null) {
      return protocol.encode(uuid, message);
    }
    return workerResult as { chunks: Bytes[]; totalSize: number };
  }

  async function decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>> {
    const totalSize = bytes.length;

    // Worker가 없거나 데이터가 작으면 메인 스레드에서 처리
    if (!isWorkerAvailable() || totalSize <= SIZE_THRESHOLD) {
      return protocol.decode(bytes);
    }

    const rawResult = await runWorker("decode", bytes, [bytes.buffer as ArrayBuffer]);
    if (rawResult == null) {
      return protocol.decode(bytes);
    }
    return transfer.decode(rawResult) as ServiceMessageDecodeResult<ServiceMessage>;
  }

  return {
    encode,
    decode,
    dispose() {
      protocol.dispose();
      workerResolvers.dispose();
    },
  };
}
