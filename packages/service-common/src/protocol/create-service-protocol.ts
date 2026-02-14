import type { Bytes } from "@simplysm/core-common";
import "@simplysm/core-common";
import { ArgumentError, jsonStringify, jsonParse, LazyGcMap, Uuid, bytesConcat } from "@simplysm/core-common";
import { PROTOCOL_CONFIG, type ServiceMessage } from "./protocol.types";

/**
 * 서비스 프로토콜 인터페이스
 *
 * Binary Protocol V2:
 * - Header: 28 bytes (UUID 16 + TotalSize 8 + Index 4)
 * - Body: JSON
 * - 자동 청킹: 3MB 초과 시 300KB 단위 분할
 * - 최대 메시지: 100MB
 */
export interface ServiceProtocol {
  /**
   * 메시지 인코딩 (필요 시 자동 분할)
   */
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };

  /**
   * 메시지 디코딩 (분할 패킷 자동 조립)
   */
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;

  /**
   * 프로토콜 인스턴스를 정리한다.
   *
   * 내부 청크 누적기의 GC 타이머를 해제하고 메모리를 정리한다.
   * 프로토콜 인스턴스 사용이 끝나면 반드시 호출해야 한다.
   */
  dispose(): void;
}

/**
 * 메시지 디코딩 결과 타입 (유니온)
 *
 * - `type: "complete"`: 모든 청크가 수신되어 메시지 조립이 완료됨
 * - `type: "progress"`: 분할 메시지 수신 중 (일부 청크만 도착)
 */
export type ServiceMessageDecodeResult<T extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: T }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };

/**
 * 서비스 프로토콜 인코더/디코더 생성
 *
 * Binary Protocol V2:
 * - Header: 28 bytes (UUID 16 + TotalSize 8 + Index 4)
 * - Body: JSON
 * - 자동 청킹: 3MB 초과 시 300KB 단위 분할
 * - 최대 메시지: 100MB
 */
export function createServiceProtocol(): ServiceProtocol {
  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  const accumulator = new LazyGcMap<
    string,
    {
      totalSize: number;
      completedSize: number;
      chunks: (Bytes | undefined)[];
    }
  >({
    gcInterval: PROTOCOL_CONFIG.GC_INTERVAL,
    expireTime: PROTOCOL_CONFIG.EXPIRE_TIME,
  });

  // -------------------------------------------------------------------
  // Encoding Helper
  // -------------------------------------------------------------------

  /**
   * 메시지 청크 인코딩 (헤더 + 바디)
   *
   * 헤더 구조 (28 bytes, Big Endian):
   * ```
   * Offset  Size  Field
   * ------  ----  -----
   *   0     16    UUID (binary)
   *  16      8    TotalSize (uint64)
   *  24      4    Index (uint32)
   * ```
   */
  function encodeChunk(
    header: {
      uuid: string;
      totalSize: number;
      index: number;
    },
    bodyBytes?: Bytes,
  ): Bytes {
    const headerBytes = new Uint8Array(28);

    // UUID (0-15)
    const uuidBytes = new Uuid(header.uuid).toBytes();
    headerBytes.set(uuidBytes, 0);

    // TotalSize (16-23), Index (24-27)
    const headerView = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);
    headerView.setBigUint64(16, BigInt(header.totalSize), false);
    headerView.setUint32(24, header.index, false);

    return bytesConcat([headerBytes, ...(bodyBytes ? [bodyBytes] : [])]);
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  return {
    encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number } {
      const msgJson = jsonStringify([message.name, ...("body" in message ? [message.body] : [])]);
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
        return { chunks: [encodeChunk({ uuid, totalSize, index: 0 }, msgBytes)], totalSize };
      }

      // 분할 처리
      const chunks: Bytes[] = [];
      let offset = 0;
      let index = 0;

      while (offset < totalSize) {
        const chunkBodyBytes = msgBytes.subarray(offset, offset + PROTOCOL_CONFIG.CHUNK_SIZE);

        const chunk = encodeChunk({ uuid, totalSize, index }, chunkBodyBytes);
        chunks.push(chunk);

        offset += PROTOCOL_CONFIG.CHUNK_SIZE;
        index++;
      }

      return { chunks, totalSize };
    },

    decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T> {
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

      const accItem = accumulator.getOrCreate(uuid, () => ({
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
        accumulator.delete(uuid); // 메모리 해제

        const resultBytes = bytesConcat(accItem.chunks.filterExists());
        let messageArr: [string, unknown];
        try {
          messageArr = jsonParse<[string, unknown]>(new TextDecoder().decode(resultBytes));
        } catch (err) {
          throw new ArgumentError("메시지 디코딩에 실패했습니다.", { uuid, cause: err });
        }
        return {
          type: "complete",
          uuid: uuid,
          message: {
            name: messageArr[0],
            body: messageArr[1],
          } as T,
        };
      }
    },

    dispose(): void {
      accumulator.dispose();
    },
  };
}
