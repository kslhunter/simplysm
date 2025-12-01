import { TSdServiceMessage } from "../types/protocol.types";
import { JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE } from "./message-protocol.types";

export class SdServiceMessageEncoder {
  private static readonly _SPLIT_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB
  private static readonly _CHUNK_SIZE = 300 * 1024; // 300KB

  /**
   * 메시지 인코딩 (필요 시 자동 분할)
   */
  static encode(uuid: string, message: TSdServiceMessage): Buffer[] {
    const msgJson = JsonConvert.stringify(message);
    const msgBuffer = Buffer.from(msgJson);

    const totalSize = msgBuffer.length;

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${totalSize}`);
    }

    // 사이즈가 작으면 그대로 반환
    if (totalSize <= this._SPLIT_MESSAGE_SIZE) {
      return [this.#encode({ uuid, totalSize, index: 0 }, msgBuffer)];
    }

    // 3. 분할 처리
    const chunks: Buffer[] = [];
    let offset = 0;
    let index = 0;

    while (offset < totalSize) {
      const chunkBodyBuffer = msgBuffer.subarray(offset, offset + this._CHUNK_SIZE);

      const chunk = this.#encode({ uuid, totalSize, index }, chunkBodyBuffer);
      chunks.push(chunk);

      offset += this._CHUNK_SIZE;
      index++;
    }

    return chunks;
  }

  static #encode(
    header: {
      uuid: string;
      totalSize: number;
      index: number;
    },
    bodyBuffer?: Buffer,
  ): Buffer {
    const headerBuffer = Buffer.alloc(28);

    // UUID
    const uuidBuffer = Uuid.fromString(header.uuid).toBuffer();
    headerBuffer.set(uuidBuffer, 0);

    // TOTAL_SIZE, INDEX
    const headerView = new DataView(
      headerBuffer.buffer,
      headerBuffer.byteOffset,
      headerBuffer.byteLength,
    );
    headerView.setBigUint64(16, BigInt(header.totalSize), false);
    headerView.setUint32(24, header.index, false);

    return Buffer.concat([headerBuffer, ...(bodyBuffer ? [bodyBuffer] : [])]);
  }
}
