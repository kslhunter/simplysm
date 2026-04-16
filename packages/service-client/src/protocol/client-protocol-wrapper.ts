import type { Bytes } from "@simplysm/core-common";
import { LazyGcMap, transfer, Uuid } from "@simplysm/core-common";
import type {
  ServiceMessageDecodeResult,
  ServiceMessage,
  ServiceProtocol,
} from "@simplysm/service-common";
import type { WorkerLike } from "../types/browser-compat";
import { isWorkerSupported, createBrowserWorker } from "../types/browser-compat";

export interface ClientProtocolWrapper {
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;
  dispose(): void;
}

// 공유 worker 상태 (싱글턴 패턴)
let worker: WorkerLike | undefined;
const workerResolvers = new LazyGcMap<
  string,
  { resolve: (res: unknown) => void; reject: (err: Error) => void }
>({
  gcInterval: 5 * 1000, // 5초마다 만료된 항목 확인
  expireTime: 60 * 1000, // 60초 후 만료 (타임아웃)
  onExpire: (key, item) => {
    // 만료 시 reject (메모리 누수 방지에 필수)
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

function getWorker(): WorkerLike | undefined {
  if (!isWorkerAvailable()) {
    return undefined;
  }

  if (!worker) {
    // 모던 번들러 (Vite/Esbuild/Webpack)가 이 구문을 사용하여 Worker를 별도 파일로 분리/로드함
    // 참고: import.meta.resolve 대신 상대 경로 사용 (Vite 호환성)
    worker = createBrowserWorker(
      new URL("../workers/client-protocol.worker.ts", import.meta.url),
      { type: "module" },
    );
    if (worker == null) return undefined;

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
          const err = new Error(error?.message ?? "알 수 없는 worker 에러");
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
 * Worker에 작업을 위임하고 결과를 대기
 * 참고: workerAvailable이 true일 때만 호출할 것
 */
async function runWorker(
  type: "encode" | "decode",
  data: unknown,
  transferables: ArrayBuffer[] = [],
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Uuid.generate().toString();

    workerResolvers.set(id, { resolve, reject });
    // workerAvailable 확인 후 호출되므로 worker는 항상 존재
    getWorker()!.postMessage({ id, type, data }, transferables);
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

    // [Worker]
    // 인코딩은 객체 전송이 필요하므로 Structured Clone이 발생함.
    // 하지만 메인 스레드에서 JSON.stringify 비용을 오프로드하는 이점이 더 큼.
    return (await runWorker("encode", { uuid, message })) as {
      chunks: Bytes[];
      totalSize: number;
    };
  }

  async function decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>> {
    const totalSize = bytes.length;

    // Worker가 없거나 데이터가 작으면 메인 스레드에서 처리
    if (!isWorkerAvailable() || totalSize <= SIZE_THRESHOLD) {
      return protocol.decode(bytes);
    }

    // [Worker]
    // Zero-copy 전송 (버퍼 소유권이 Worker로 이동)
    const rawResult = await runWorker("decode", bytes, [bytes.buffer as ArrayBuffer]);

    // Worker의 plain object 결과에서 클래스 인스턴스 복원 (DateTime 등)
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
