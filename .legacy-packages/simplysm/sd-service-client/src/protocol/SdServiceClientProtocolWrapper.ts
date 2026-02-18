import type { ISdServiceMessageDecodeResult, TSdServiceMessage } from "@simplysm/sd-service-common";
import { SdServiceProtocol } from "@simplysm/sd-service-common";
import { LazyGcMap, TransferableConvert, Uuid } from "@simplysm/sd-core-common";

export class SdServiceClientProtocolWrapper {
  // 기준값: 1KB
  private readonly _SIZE_THRESHOLD = 30 * 1024; // 30KB

  // 메인 스레드용 프로토콜 (가벼운 작업용)
  private readonly _protocol = new SdServiceProtocol();

  // 워커 스레드 (무거운 작업용)
  private static _worker?: Worker;
  // 워커 요청 대기열 (Key: UUID)
  private static readonly _workerResolvers = new LazyGcMap<
    string,
    { resolve: (res: any) => void; reject: (err: Error) => void }
  >({
    gcInterval: 5 * 1000, // 5초마다 만료 검사
    expireTime: 60 * 1000, // 60초가 지나면 만료 (타임아웃)
    onExpire: (key, item) => {
      // 만료 시 reject 호출 (메모리 릭 방지 핵심)
      item.reject(new Error(`Worker task timed out (uuid: ${key})`));
    },
  });

  private static get worker() {
    if (!this._worker) {
      // Vite/Esbuild/Webpack 등 모던 번들러는 이 문법을 통해 Worker를 별도 파일로 분리/로드함
      this._worker = new Worker(
        new URL(import.meta.resolve("../workers/client-protocol.worker"), import.meta.url),
        {
          type: "module",
        },
      );

      this._worker.onmessage = (event) => {
        const { id, type, result, error } = event.data;
        const resolver = this._workerResolvers.get(id);
        if (resolver) {
          if (type === "success") {
            resolver.resolve(result);
          } else {
            const err = new Error(error.message);
            err.stack = error.stack;
            resolver.reject(err);
          }
          this._workerResolvers.delete(id);
        }
      };
    }
    return this._worker;
  }

  /**
   * Worker에 작업 위임 및 결과 대기
   */
  private async _runWorkerAsync(
    type: "encode" | "decode",
    data: any,
    transfer: Transferable[] = [],
  ): Promise<any> {
    return await new Promise((resolve, reject) => {
      const id = Uuid.new().toString();

      SdServiceClientProtocolWrapper._workerResolvers.set(id, { resolve, reject });
      SdServiceClientProtocolWrapper.worker.postMessage({ id, type, data }, { transfer });
    });
  }

  async encodeAsync(
    uuid: string,
    message: TSdServiceMessage,
  ): Promise<{ chunks: Buffer[]; totalSize: number }> {
    // 1. 휴리스틱 체크
    if (this._shouldUseWorkerForEncode(message)) {
      // [Worker]
      // Encode는 객체를 보내야 하므로 Structured Clone이 발생함.
      // 하지만 JSON.stringify 비용을 메인 스레드에서 제거하는 이득이 더 큼.
      return await this._runWorkerAsync("encode", { uuid, message });
    } else {
      // [Main]
      return this._protocol.encode(uuid, message);
    }
  }

  async decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>> {
    // 1. 휴리스틱 체크 (헤더 28바이트 이후 데이터 사이즈)
    const totalSize = buffer.length;

    if (totalSize > this._SIZE_THRESHOLD) {
      // [Worker]
      // Zero-Copy 전송 (buffer의 소유권이 Worker로 넘어감)
      const rawResult = await this._runWorkerAsync("decode", buffer, [buffer.buffer]);

      // Worker에서 온 결과(Plain Object)를 클래스 인스턴스(DateTime 등)로 복원
      return TransferableConvert.decode(rawResult);
    } else {
      // [Main]
      return this._protocol.decode(buffer);
    }
  }

  private _shouldUseWorkerForEncode(msg: TSdServiceMessage): boolean {
    if (!("body" in msg)) return false;
    const body = msg.body;

    // Buffer가 있거나, 배열 길이가 길면 워커 사용
    if (Buffer.isBuffer(body)) return true;
    if (typeof body === "string" && body.length > this._SIZE_THRESHOLD) return true;
    if (Array.isArray(body)) {
      return body.length > 100 || (body.length > 0 && Buffer.isBuffer(body[0]));
    }

    return false;
  }
}
