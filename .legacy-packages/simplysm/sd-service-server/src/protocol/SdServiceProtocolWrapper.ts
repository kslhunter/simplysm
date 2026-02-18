import { SdWorker } from "@simplysm/sd-core-node";
import type { ISdServiceMessageDecodeResult, TSdServiceMessage } from "@simplysm/sd-service-common";
import { SdServiceProtocol } from "@simplysm/sd-service-common";
import type { ISdServiceProtocolWorker } from "./protocol.worker-types";

export class SdServiceProtocolWrapper {
  // 워커 스레드 (무거운 작업용, Static Lazy Singleton)
  private static _worker?: SdWorker<ISdServiceProtocolWorker>;
  private static get worker() {
    if (!this._worker) {
      this._worker = new SdWorker<ISdServiceProtocolWorker>(
        import.meta.resolve("../workers/service-protocol.worker"),
        {
          resourceLimits: { maxOldGenerationSizeMb: 4096 }, // 대용량 처리를 위해 넉넉히
        },
      );
    }
    return this._worker;
  }

  // 메인 스레드용 프로토콜 인스턴스 (가벼운 작업용)
  private readonly _protocol = new SdServiceProtocol();

  // 기준값 설정
  private readonly _SIZE_THRESHOLD = 30 * 1024; // 30KB

  /**
   * 메시지 인코딩 (자동 분기 처리)
   */
  async encodeAsync(
    uuid: string,
    message: TSdServiceMessage,
  ): Promise<{ chunks: Buffer[]; totalSize: number }> {
    // 1. 휴리스틱: 워커를 태울지 결정 (O(1))
    if (this._shouldUseWorkerForEncode(message)) {
      // [Worker] 대용량 처리
      return await SdServiceProtocolWrapper.worker.run("encode", [uuid, message]);
    } else {
      // [Main] 소용량 즉시 처리
      return this._protocol.encode(uuid, message);
    }
  }

  /**
   * 메시지 디코딩 (자동 분기 처리)
   */
  async decodeAsync(buffer: Buffer): Promise<ISdServiceMessageDecodeResult<TSdServiceMessage>> {
    // 1. 휴리스틱: 워커를 태울지 결정
    const totalSize = buffer.length;
    if (totalSize > this._SIZE_THRESHOLD) {
      // [Worker] 대용량 처리
      return await SdServiceProtocolWrapper.worker.run("decode", [buffer]);
    } else {
      // [Main] 소용량 즉시 처리
      return this._protocol.decode(buffer);
    }
  }

  /**
   * 워커 사용 여부 판단 로직 (Encode)
   */
  private _shouldUseWorkerForEncode(msg: TSdServiceMessage): boolean {
    if (!("body" in msg)) return false;

    const body = msg.body;

    // 1. Buffer: 크기 확인
    if (Buffer.isBuffer(body)) {
      return true;
    }

    // 3. Array: 길이 확인 (ORM 결과 등)
    if (Array.isArray(body)) {
      return body.length > 0 && body.some((item) => Buffer.isBuffer(item));
    }

    // 4. 기본적으로 Main 처리
    return false;
  }

  dispose() {
    this._protocol.dispose();
  }
}
