import type { Bytes } from "@simplysm/core-common";
import "@simplysm/core-common";
import {
  ArgumentError,
  bytes as bytesU,
  json,
  LazyGcMap,
  Uuid,
} from "@simplysm/core-common";
import { PROTOCOL_CONFIG, type ServiceMessage } from "./protocol.types";

/**
 * 서비스 프로토콜 인터페이스
 *
 * 바이너리 프로토콜 V2:
 * - 헤더: 28바이트 (UUID 16 + TotalSize 8 + Index 4)
 * - 본문: JSON
 * - 자동 청킹: 3MB 초과 시 300KB 청크로 분할
 * - 최대 메시지 크기: 100MB
 */
export interface ServiceProtocol {
  /**
   * 메시지를 인코딩한다 (필요 시 자동 분할)
   */
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };

  /**
   * 메시지를 디코딩한다 (청크 패킷 자동 재조립)
   */
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;

  /**
   * 프로토콜 인스턴스를 해제한다.
   *
   * 내부 청크 누적기의 GC 타이머를 해제하고 메모리를 반환한다.
   * 프로토콜 인스턴스가 더 이상 필요하지 않을 때 반드시 호출해야 한다.
   */
  dispose(): void;
}

/**
 * 메시지 디코딩 결과 타입 (유니언)
 *
 * - `type: "complete"`: 모든 청크를 수신하여 메시지 재조립이 완료됨
 * - `type: "progress"`: 청크 메시지 진행 중 (일부 청크만 도착)
 */
export type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };

/**
 * 서비스 프로토콜 인코더/디코더를 생성한다
 *
 * 바이너리 프로토콜 V2:
 * - 헤더: 28바이트 (UUID 16 + TotalSize 8 + Index 4)
 * - 본문: JSON
 * - 자동 청킹: 3MB 초과 시 300KB 청크로 분할
 * - 최대 메시지 크기: 100MB
 */
export function createServiceProtocol(): ServiceProtocol {
  // -------------------------------------------------------------------
  // 상태
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
  // 인코딩 헬퍼
  // -------------------------------------------------------------------

  /**
   * 메시지 청크를 인코딩한다 (헤더 + 본문)
   *
   * 헤더 구조 (28바이트, Big Endian):
   * ```
   * Offset  Size  Field
   * ------  ----  -----
   *   0     16    UUID (바이너리)
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
    const headerView = new DataView(
      headerBytes.buffer,
      headerBytes.byteOffset,
      headerBytes.byteLength,
    );
    headerView.setUint32(16, 0, false); // 상위 4바이트 = 0 (MAX_TOTAL_SIZE < 2^32)
    headerView.setUint32(20, header.totalSize, false); // 하위 4바이트 = totalSize
    headerView.setUint32(24, header.index, false);

    return bytesU.concat([headerBytes, ...(bodyBytes ? [bodyBytes] : [])]);
  }

  // -------------------------------------------------------------------
  // 공개 API
  // -------------------------------------------------------------------

  return {
    encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number } {
      const msgJson = json.stringify([message.name, ...("body" in message ? [message.body] : [])]);
      const msgBytes = new TextEncoder().encode(msgJson);

      const totalSize = msgBytes.length;

      // 전체 크기 제한 확인 (우선 수행)
      if (totalSize > PROTOCOL_CONFIG.MAX_TOTAL_SIZE) {
        throw new ArgumentError("메시지 크기가 제한을 초과했습니다.", {
          totalSize,
          maxSize: PROTOCOL_CONFIG.MAX_TOTAL_SIZE,
        });
      }

      // 충분히 작으면 그대로 반환
      if (totalSize <= PROTOCOL_CONFIG.SPLIT_MESSAGE_SIZE) {
        return { chunks: [encodeChunk({ uuid, totalSize, index: 0 }, msgBytes)], totalSize };
      }

      // 청크로 분할
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
      const totalSize = headerView.getUint32(20, false); // 하위 4바이트만 읽기
      const index = headerView.getUint32(24, false);

      // 전체 크기 제한 확인 (우선 수행)
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
        // 중복 패킷 방어
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
      } else if (accItem.completedSize === accItem.totalSize) {
        accumulator.delete(uuid); // 메모리 해제

        const resultBytes = bytesU.concat(accItem.chunks.filterExists());
        let messageArr: [string, unknown];
        try {
          messageArr = json.parse<[string, unknown]>(new TextDecoder().decode(resultBytes));
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
      } else {
        accumulator.delete(uuid);
        throw new ArgumentError("프로토콜 무결성 위반: completedSize가 totalSize를 초과했습니다.", {
          uuid,
          completedSize: accItem.completedSize,
          totalSize: accItem.totalSize,
        });
      }
    },

    dispose(): void {
      accumulator.dispose();
    },
  };
}
