import { SdWorker } from "@simplysm/core-node";
import type { IServiceMessageDecodeResult, TServiceMessage } from "@simplysm/service-common";
import { ServiceProtocol } from "@simplysm/service-common";
import type { IServiceProtocolWorker } from "./protocol.worker-types";

export class ProtocolWrapper {
  // 워커 스레드 (무거운 작업용, Static Lazy Singleton)
  private static _worker?: SdWorker<IServiceProtocolWorker>;
  private static get worker() {
    if (this._worker == null) {
      this._worker = new SdWorker<IServiceProtocolWorker>(
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
  async encodeAsync(
    uuid: string,
    message: TServiceMessage,
  ): Promise<{ chunks: Buffer[]; totalSize: number }> {
    if (this._shouldUseWorkerForEncode(message)) {
      return await ProtocolWrapper.worker.run("encode", [uuid, message]);
    } else {
      return this._protocol.encode(uuid, message);
    }
  }

  /**
   * 메시지 디코딩 (자동 분기 처리)
   */
  async decodeAsync(buffer: Buffer): Promise<IServiceMessageDecodeResult<TServiceMessage>> {
    const totalSize = buffer.length;
    if (totalSize > this._SIZE_THRESHOLD) {
      return await ProtocolWrapper.worker.run("decode", [buffer]);
    } else {
      return this._protocol.decode(buffer);
    }
  }

  /**
   * 워커 사용 여부 판단 로직 (Encode)
   */
  private _shouldUseWorkerForEncode(msg: TServiceMessage): boolean {
    if (!("body" in msg)) return false;

    const body = msg.body;

    // Buffer: 크기 확인
    if (Buffer.isBuffer(body)) {
      return true;
    }

    // Array: 길이 확인 (ORM 결과 등)
    if (Array.isArray(body)) {
      return body.length > 0 && body.some((item) => Buffer.isBuffer(item));
    }

    return false;
  }

  dispose() {
    this._protocol.dispose();
  }
}
