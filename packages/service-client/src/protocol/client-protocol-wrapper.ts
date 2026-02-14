import type { Bytes } from "@simplysm/core-common";
import { LazyGcMap, transferableDecode, Uuid } from "@simplysm/core-common";
import type { ServiceMessageDecodeResult, ServiceMessage, ServiceProtocol } from "@simplysm/service-common";

export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
}

// Shared worker state (singleton pattern)
let worker: Worker | undefined;
const workerResolvers = new LazyGcMap<string, { resolve: (res: unknown) => void; reject: (err: Error) => void }>({
  gcInterval: 5 * 1000, // 5초마다 만료 검사
  expireTime: 60 * 1000, // 60초가 지나면 만료 (타임아웃)
  onExpire: (key, item) => {
    // 만료 시 reject 호출 (메모리 릭 방지 핵심)
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
    // Vite/Esbuild/Webpack 등 모던 번들러는 이 문법을 통해 Worker를 별도 파일로 분리/로드함
    // 주의: import.meta.resolve 대신 상대경로 사용 (Vite 호환)
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
 * Worker에 작업 위임 및 결과 대기
 * 주의: workerAvailable이 true일 때만 호출해야 함
 */
async function runWorker(type: "encode" | "decode", data: unknown, transfer: Transferable[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Uuid.new().toString();

    workerResolvers.set(id, { resolve, reject });
    // workerAvailable 체크 후 호출되므로 worker는 항상 존재
    getWorker()!.postMessage({ id, type, data }, { transfer });
  });
}

export function createClientProtocolWrapper(protocol: ServiceProtocol): ClientProtocolWrapper {
  // 기준값: 30KB
  const SIZE_THRESHOLD = 30 * 1024;

  function shouldUseWorkerForEncode(msg: ServiceMessage): boolean {
    if (!("body" in msg)) return false;
    const body = msg.body;

    // Uint8Array가 있거나, 배열 길이가 길면 워커 사용
    if (body instanceof Uint8Array) return true;
    if (typeof body === "string" && body.length > SIZE_THRESHOLD) return true;
    if (Array.isArray(body)) {
      return body.length > 100 || (body.length > 0 && body[0] instanceof Uint8Array);
    }

    return false;
  }

  async function encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }> {
    // Worker가 없거나 작은 데이터는 메인 스레드에서 처리
    if (!isWorkerAvailable() || !shouldUseWorkerForEncode(message)) {
      return protocol.encode(uuid, message);
    }

    // [Worker]
    // Encode는 객체를 보내야 하므로 Structured Clone이 발생함.
    // 하지만 JSON.stringify 비용을 메인 스레드에서 제거하는 이득이 더 큼.
    return (await runWorker("encode", { uuid, message })) as {
      chunks: Bytes[];
      totalSize: number;
    };
  }

  async function decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>> {
    const totalSize = bytes.length;

    // Worker가 없거나 작은 데이터는 메인 스레드에서 처리
    if (!isWorkerAvailable() || totalSize <= SIZE_THRESHOLD) {
      return protocol.decode(bytes);
    }

    // [Worker]
    // Zero-Copy 전송 (buffer의 소유권이 Worker로 넘어감)
    const rawResult = await runWorker("decode", bytes, [bytes.buffer]);

    // Worker에서 온 결과(Plain Object)를 클래스 인스턴스(DateTime 등)로 복원
    return transferableDecode(rawResult) as ServiceMessageDecodeResult<ServiceMessage>;
  }

  return {
    encode,
    decode,
  };
}
