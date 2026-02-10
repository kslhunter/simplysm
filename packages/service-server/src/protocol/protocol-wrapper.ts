import type { Bytes } from "@simplysm/core-common";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type { ServiceMessageDecodeResult, ServiceMessage } from "@simplysm/service-common";
import { ServiceProtocol } from "@simplysm/service-common";
import type * as ServiceProtocolWorkerModule from "../workers/service-protocol.worker";

export class ProtocolWrapper {
  // 워커 스레드 (무거운 작업용, Static Lazy Singleton)
  private static _worker?: WorkerProxy<typeof ServiceProtocolWorkerModule>;
  private static get worker() {
    if (this._worker == null) {
      this._worker = Worker.create<typeof ServiceProtocolWorkerModule>(
        import.meta.resolve("../workers/service-protocol.worker"),
        {
          resourceLimits: { maxOldGenerationSizeMb: 4096 },
        },
      );
    }
    return this._worker;
  }

  // 메인 스레드용 프로토콜 인스턴스 (가벼운 작업용)
  private readonly _protocol = new ServiceProtocol();

  // 기준값 설정
  private readonly _SIZE_THRESHOLD = 30 * 1024; // 30KB

  /**
   * 메시지 인코딩 (자동 분기 처리)
   */
  async encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }> {
    if (this._shouldUseWorkerForEncode(message)) {
      return ProtocolWrapper.worker.encode(uuid, message);
    } else {
      return this._protocol.encode(uuid, message);
    }
  }

  /**
   * 메시지 디코딩 (자동 분기 처리)
   */
  async decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>> {
    const totalSize = bytes.length;
    if (totalSize > this._SIZE_THRESHOLD) {
      return ProtocolWrapper.worker.decode(bytes);
    } else {
      return this._protocol.decode(bytes);
    }
  }

  /**
   * 워커 사용 여부 판단 로직 (Encode)
   */
  private _shouldUseWorkerForEncode(msg: ServiceMessage): boolean {
    if (!("body" in msg)) return false;

    const body = msg.body;

    // Uint8Array: 크기 확인
    if (body instanceof Uint8Array) {
      return true;
    }

    // Array: 길이 확인 (ORM 결과 등)
    if (Array.isArray(body)) {
      return body.length > 0 && body.some((item) => item instanceof Uint8Array);
    }

    return false;
  }

  dispose() {
    this._protocol.dispose();
  }
}
