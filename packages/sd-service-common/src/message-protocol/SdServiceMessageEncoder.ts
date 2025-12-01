import { TSdServiceMessage } from "../types/protocol.types";
import { JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE } from "./message-protocol.types";

export class SdServiceMessageEncoder {
  private static readonly _SPLIT_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB
  private static readonly _CHUNK_SIZE = 300 * 1024; // 300KB

  /**
   * 메시지 인코딩 (필요 시 자동 분할)
   */
  static encode(message: TSdServiceMessage): Buffer[] {
    const msgJson = JsonConvert.stringify(message);
    const msgBuffer = Buffer.from(msgJson);

    const totalSize = msgBuffer.length;

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > SD_SERVICE_MESSAGE_MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${totalSize}`);
    }

    // 사이즈가 작으면 그대로 반환
    if (totalSize <= this._SPLIT_MESSAGE_SIZE) {
      return [this.#encode(undefined, msgBuffer)];
    }

    // 3. 분할 처리
    const chunks: Buffer[] = [];
    let offset = 0;
    let index = 0;

    const uuid = Uuid.new().toString();
    while (offset < totalSize) {
      const chunkBodyBuffer = msgBuffer.subarray(offset, offset + this._CHUNK_SIZE);

      const chunk = this.#encode({ uuid, totalSize, index }, chunkBodyBuffer);
      chunks.push(chunk);

      offset += this._CHUNK_SIZE;
      index++;
    }

    return chunks;
  }

  static #encode(header: any, bodyBuffer?: Buffer): Buffer {
    if (header == null) {
      const headerSizeBuffer = Buffer.alloc(8);
      headerSizeBuffer.writeBigUInt64BE(BigInt(0));
      return Buffer.concat([headerSizeBuffer, ...(bodyBuffer ? [bodyBuffer] : [])]);
    }

    const headerJson = JsonConvert.stringify(header);
    const headerBuffer = Buffer.from(headerJson);
    const headerSize = headerBuffer.length;

    const headerSizeBuffer = Buffer.alloc(8);
    headerSizeBuffer.writeBigUInt64BE(BigInt(headerSize));

    return Buffer.concat([headerSizeBuffer, headerBuffer, ...(bodyBuffer ? [bodyBuffer] : [])]);
  }
}
