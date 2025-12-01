import { DateTime, JsonConvert } from "@simplysm/sd-core-common";
import { SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE } from "./message-protocol.types";
import { TSdServiceMessage } from "../types/protocol.types";

export class SdServiceMessageDecoder {
  // 조립 중인 메시지 보관소 (Key: reqUuid)
  private readonly _accumulator = new Map<
    string,
    {
      lastUpdatedAt: DateTime;
      totalSize: number;
      receivedSize: number;
      buffers: (Buffer | undefined)[];
    }
  >();

  // GC 타이머 (10초마다 체크하여 60초 지난 미완성 조각 제거)
  private readonly _gcInterval = setInterval(() => {
    const now = Date.now();
    for (const [reqUuid, item] of this._accumulator) {
      if (now - item.lastUpdatedAt.tick > 60 * 1000) {
        this._accumulator.delete(reqUuid);
      }
    }
  }, 10000);

  dispose(): void {
    clearInterval(this._gcInterval);
    this._accumulator.clear();
  }

  /**
   * 메시지 디코딩 (분할 패킷 자동 조립)
   */
  decode(buffer: Buffer): ISdServiceMessageDecodeResult {
    // 헤더 읽기
    const headerSize = Number(buffer.readBigUInt64BE(0));

    // 헤더 없으면 바로 완료
    if (headerSize === 0) {
      const bodyBuffer = buffer.subarray(8);
      const message = JsonConvert.parse(bodyBuffer.toString());
      return { type: "complete", message };
    }

    const headerBuffer = buffer.subarray(8, 8 + headerSize);
    const header = JsonConvert.parse(headerBuffer.toString()) as {
      uuid: string;
      totalSize: number;
      index: number;
    };
    const bodyBuffer = buffer.subarray(8 + headerSize);

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (header.totalSize > SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${header.totalSize}`);
    }

    let accItem = this._accumulator.getOrCreate(header.uuid, {
      lastUpdatedAt: new DateTime(),
      totalSize: header.totalSize,
      receivedSize: 0,
      buffers: [],
    });
    if (accItem.buffers[header.index] == null) {
      // 패킷중복 방어
      accItem.buffers[header.index] = bodyBuffer;
      accItem.receivedSize += bodyBuffer.length;
      accItem.lastUpdatedAt = new DateTime();
    }

    if (accItem.receivedSize < accItem.totalSize) {
      return {
        type: "progress",
        uuid: header.uuid,
        totalSize: header.totalSize,
        receivedSize: accItem.receivedSize,
      };
    } else {
      this._accumulator.delete(header.uuid); // 메모리 해제

      const resultBuffer = Buffer.concat(accItem.buffers.filterExists());
      const message = JsonConvert.parse(resultBuffer.toString());
      return { type: "complete", message };
    }
  }
}

// 결과 타입
export type ISdServiceMessageDecodeResult =
  | { type: "complete"; message: TSdServiceMessage }
  | { type: "progress"; uuid: string; receivedSize: number; totalSize: number };
