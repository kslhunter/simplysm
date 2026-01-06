import { JsonConvert, LazyGcMap, Uuid } from "@simplysm/sd-core-common";
import type { TSdServiceMessage } from "./protocol.types";

export class SdServiceProtocol {
  private readonly _MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

  // -------------------------------------------------------------------
  // Encoding
  // -------------------------------------------------------------------

  private readonly _SPLIT_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB
  private readonly _CHUNK_SIZE = 300 * 1024; // 300KB

  /**
   * 메시지 인코딩 (필요 시 자동 분할)
   */
  encode(uuid: string, message: TSdServiceMessage): { chunks: Buffer[]; totalSize: number } {
    const msgJson = JsonConvert.stringify([
      message.name,
      ...("body" in message ? [message.body] : []),
    ]);
    const msgBuffer = Buffer.from(msgJson);

    const totalSize = msgBuffer.length;

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > this._MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${totalSize}`);
    }

    // 사이즈가 작으면 그대로 반환
    if (totalSize <= this._SPLIT_MESSAGE_SIZE) {
      return { chunks: [this._encode({ uuid, totalSize, index: 0 }, msgBuffer)], totalSize };
    }

    // 3. 분할 처리
    const chunks: Buffer[] = [];
    let offset = 0;
    let index = 0;

    while (offset < totalSize) {
      const chunkBodyBuffer = msgBuffer.subarray(offset, offset + this._CHUNK_SIZE);

      const chunk = this._encode({ uuid, totalSize, index }, chunkBodyBuffer);
      chunks.push(chunk);

      offset += this._CHUNK_SIZE;
      index++;
    }

    return { chunks, totalSize };
  }

  private _encode(
    header: {
      uuid: string;
      totalSize: number;
      index: number;
    },
    bodyBuffer?: Buffer,
  ): Buffer {
    const headerBuffer = Buffer.alloc(28);

    // UUID
    const uuidBuffer = new Uuid(header.uuid).toBuffer();
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

  // -------------------------------------------------------------------
  // Decoding
  // -------------------------------------------------------------------

  private readonly _accumulator = new LazyGcMap<
    string,
    {
      totalSize: number;
      completedSize: number;
      buffers: (Buffer | undefined)[];
    }
  >({
    gcInterval: 10 * 1000, // 10초마다
    expireTime: 60 * 1000, // 60초 지난 것 삭제
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
    if (totalSize > this._MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${totalSize}`);
    }

    const bodyBuffer = buffer.subarray(28);

    const accItem = this._accumulator.getOrCreate(uuid, () => ({
      totalSize,
      completedSize: 0,
      buffers: [],
    }));
    if (accItem.buffers[index] == null) {
      // 패킷중복 방어
      accItem.buffers[index] = bodyBuffer;
      accItem.completedSize += bodyBuffer.length;
    }

    if (accItem.completedSize < accItem.totalSize) {
      return {
        type: "progress",
        uuid: uuid,
        totalSize: totalSize,
        completedSize: accItem.completedSize,
      };
    } else {
      this._accumulator.delete(uuid); // 메모리 해제

      const resultBuffer = Buffer.concat(accItem.buffers.filterExists());
      const messageArr = JsonConvert.parse<[any, any]>(resultBuffer.toString());
      return {
        type: "complete",
        uuid: uuid,
        message: {
          name: messageArr[0],
          body: messageArr[1],
        } as T,
      };
    }
  }
}

// 결과 타입
export type ISdServiceMessageDecodeResult<T extends TSdServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
