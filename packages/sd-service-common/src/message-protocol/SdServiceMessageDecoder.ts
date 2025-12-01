import { JsonConvert, LazyGcMap, Uuid } from "@simplysm/sd-core-common";
import { SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE } from "./message-protocol.types";
import { TSdServiceMessage } from "../types/protocol.types";

export class SdServiceMessageDecoder {
  private readonly _accumulator = new LazyGcMap<
    string,
    {
      totalSize: number;
      receivedSize: number;
      buffers: (Buffer | undefined)[];
    }
  >({
    gcInterval: 10000, // 10초마다
    expireTime: 60000, // 60초 지난 것 삭제
  });

  dispose(): void {
    this._accumulator.clear();
  }

  /**
   * 메시지 디코딩 (분할 패킷 자동 조립)
   */
  decode<T extends TSdServiceMessage>(buffer: Buffer): ISdServiceMessageDecodeResult<T> {
    if (buffer.length < 28) {
      throw new Error(`Invalid Buffer: Size(${buffer.length}) is smaller than header size(28).`);
    }

    // 1. 헤더 읽기

    // UUID
    const uuidBuffer = buffer.subarray(0, 16);
    const uuid = Uuid.fromBuffer(uuidBuffer).toString();

    // TOTAL_SIZE, INDEX
    const headerView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const totalSize = Number(headerView.getBigUint64(16, false));
    const index = headerView.getUint32(24, false);

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${totalSize}`);
    }

    const bodyBuffer = buffer.subarray(28);

    const accItem = this._accumulator.getOrCreate(uuid, () => ({
      totalSize,
      receivedSize: 0,
      buffers: [],
    }));
    if (accItem.buffers[index] == null) {
      // 패킷중복 방어
      accItem.buffers[index] = bodyBuffer;
      accItem.receivedSize += bodyBuffer.length;
    }

    if (accItem.receivedSize < accItem.totalSize) {
      return {
        type: "progress",
        uuid: uuid,
        totalSize: totalSize,
        receivedSize: accItem.receivedSize,
      };
    } else {
      this._accumulator.delete(uuid); // 메모리 해제

      const resultBuffer = Buffer.concat(accItem.buffers.filterExists());
      const message = JsonConvert.parse(resultBuffer.toString());
      return { type: "complete", uuid: uuid, message };
    }
  }
}

// 결과 타입
export type ISdServiceMessageDecodeResult<T extends TSdServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; receivedSize: number; totalSize: number };
