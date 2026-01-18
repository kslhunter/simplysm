import { ArgumentError, JsonConvert, LazyGcMap, Uuid, BytesUtils } from "@simplysm/core-common";
import { PROTOCOL_CONFIG, type ServiceMessage } from "./protocol.types";

/**
 * 서비스 프로토콜 인코더/디코더
 *
 * Binary Protocol V2:
 * - Header: 28 bytes (UUID 16 + TotalSize 8 + Index 4)
 * - Body: JSON
 * - 자동 청킹: 3MB 초과 시 300KB 단위 분할
 * - 최대 메시지: 100MB
 */
export class ServiceProtocol {

  // -------------------------------------------------------------------
  // Encoding
  // -------------------------------------------------------------------

  /**
   * 메시지 인코딩 (필요 시 자동 분할)
   */
  encode(uuid: string, message: ServiceMessage): { chunks: Uint8Array[]; totalSize: number } {
    const msgJson = JsonConvert.stringify([
      message.name,
      ...("body" in message ? [message.body] : []),
    ]);
    const msgBytes = new TextEncoder().encode(msgJson);

    const totalSize = msgBytes.length;

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > PROTOCOL_CONFIG.MAX_TOTAL_SIZE) {
      throw new ArgumentError("메시지 크기가 제한을 초과했습니다.", {
        totalSize,
        maxSize: PROTOCOL_CONFIG.MAX_TOTAL_SIZE,
      });
    }

    // 사이즈가 작으면 그대로 반환
    if (totalSize <= PROTOCOL_CONFIG.SPLIT_MESSAGE_SIZE) {
      return { chunks: [this._encode({ uuid, totalSize, index: 0 }, msgBytes)], totalSize };
    }

    // 분할 처리
    const chunks: Uint8Array[] = [];
    let offset = 0;
    let index = 0;

    while (offset < totalSize) {
      const chunkBodyBytes = msgBytes.subarray(offset, offset + PROTOCOL_CONFIG.CHUNK_SIZE);

      const chunk = this._encode({ uuid, totalSize, index }, chunkBodyBytes);
      chunks.push(chunk);

      offset += PROTOCOL_CONFIG.CHUNK_SIZE;
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
    bodyBytes?: Uint8Array,
  ): Uint8Array {
    const headerBytes = new Uint8Array(28);

    // UUID
    const uuidBytes = new Uuid(header.uuid).toBytes();
    headerBytes.set(uuidBytes, 0);

    // TOTAL_SIZE, INDEX
    const headerView = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);
    headerView.setBigUint64(16, BigInt(header.totalSize), false);
    headerView.setUint32(24, header.index, false);

    return BytesUtils.concat([headerBytes, ...(bodyBytes ? [bodyBytes] : [])]);
  }

  // -------------------------------------------------------------------
  // Decoding
  // -------------------------------------------------------------------

  private readonly _accumulator = new LazyGcMap<
    string,
    {
      totalSize: number;
      completedSize: number;
      chunks: (Uint8Array | undefined)[];
    }
  >({
    gcInterval: PROTOCOL_CONFIG.GC_INTERVAL,
    expireTime: PROTOCOL_CONFIG.EXPIRE_TIME,
  });

  dispose(): void {
    this._accumulator.destroy();
  }

  /**
   * 메시지 디코딩 (분할 패킷 자동 조립)
   */
  decode<T extends ServiceMessage>(bytes: Uint8Array): ServiceMessageDecodeResult<T> {
    if (bytes.length < 28) {
      throw new ArgumentError("버퍼 크기가 헤더 크기보다 작습니다.", {
        bufferSize: bytes.length,
        minimumSize: 28,
      });
    }

    // 1. 헤더 읽기

    // UUID
    const uuidBytes = bytes.subarray(0, 16);
    const uuid = Uuid.fromBytes(uuidBytes).toString();

    // TOTAL_SIZE, INDEX
    const headerView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const totalSize = Number(headerView.getBigUint64(16, false));
    const index = headerView.getUint32(24, false);

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > PROTOCOL_CONFIG.MAX_TOTAL_SIZE) {
      throw new ArgumentError("메시지 크기가 제한을 초과했습니다.", {
        totalSize,
        maxSize: PROTOCOL_CONFIG.MAX_TOTAL_SIZE,
      });
    }

    const bodyBytes = bytes.subarray(28);

    const accItem = this._accumulator.getOrCreate(uuid, () => ({
      totalSize,
      completedSize: 0,
      chunks: [],
    }));
    if (accItem.chunks[index] == null) {
      // 패킷중복 방어
      accItem.chunks[index] = bodyBytes;
      accItem.completedSize += bodyBytes.length;
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

      const resultBytes = BytesUtils.concat(accItem.chunks.filterExists());
      const messageArr = JsonConvert.parse<[string, unknown]>(new TextDecoder().decode(resultBytes));
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

/** 메시지 디코딩 결과 타입 */
export type ServiceMessageDecodeResult<T extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };
