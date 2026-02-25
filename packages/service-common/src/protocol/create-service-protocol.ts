import type { Bytes } from "@simplysm/core-common";
import "@simplysm/core-common";
import {
  ArgumentError,
  jsonStringify,
  jsonParse,
  LazyGcMap,
  Uuid,
  bytesConcat,
} from "@simplysm/core-common";
import { PROTOCOL_CONFIG, type ServiceMessage } from "./protocol.types";

/**
 * Service protocol interface
 *
 * Binary Protocol V2:
 * - Header: 28 bytes (UUID 16 + TotalSize 8 + Index 4)
 * - Body: JSON
 * - Auto chunking: splits into 300KB chunks when exceeding 3MB
 * - Max message size: 100MB
 */
export interface ServiceProtocol {
  /**
   * Encode a message (auto-split if needed)
   */
  encode(uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number };

  /**
   * Decode a message (auto-reassemble chunked packets)
   */
  decode<T extends ServiceMessage>(bytes: Bytes): ServiceMessageDecodeResult<T>;

  /**
   * Dispose the protocol instance.
   *
   * Releases the internal chunk accumulator's GC timer and frees memory.
   * Must be called when the protocol instance is no longer needed.
   */
  dispose(): void;
}

/**
 * Message decode result type (union)
 *
 * - `type: "complete"`: all chunks received and message reassembly is complete
 * - `type: "progress"`: chunked message in progress (only some chunks arrived)
 */
export type ServiceMessageDecodeResult<TMessage extends ServiceMessage> =
  | { type: "complete"; uuid: string; message: TMessage }
  | { type: "progress"; uuid: string; totalSize: number; completedSize: number };

/**
 * Create a service protocol encoder/decoder
 *
 * Binary Protocol V2:
 * - Header: 28 bytes (UUID 16 + TotalSize 8 + Index 4)
 * - Body: JSON
 * - Auto chunking: splits into 300KB chunks when exceeding 3MB
 * - Max message size: 100MB
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
   * Encode a message chunk (header + body)
   *
   * Header structure (28 bytes, Big Endian):
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
    const headerView = new DataView(
      headerBytes.buffer,
      headerBytes.byteOffset,
      headerBytes.byteLength,
    );
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

      // Total size limit check (performed first)
      if (totalSize > PROTOCOL_CONFIG.MAX_TOTAL_SIZE) {
        throw new ArgumentError("Message size exceeds the limit.", {
          totalSize,
          maxSize: PROTOCOL_CONFIG.MAX_TOTAL_SIZE,
        });
      }

      // Return as-is if small enough
      if (totalSize <= PROTOCOL_CONFIG.SPLIT_MESSAGE_SIZE) {
        return { chunks: [encodeChunk({ uuid, totalSize, index: 0 }, msgBytes)], totalSize };
      }

      // Split into chunks
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
        throw new ArgumentError("Buffer size is smaller than header size.", {
          bufferSize: bytes.length,
          minimumSize: 28,
        });
      }

      // 1. Read header

      // UUID
      const uuidBytes = bytes.subarray(0, 16);
      const uuid = Uuid.fromBytes(uuidBytes).toString();

      // TOTAL_SIZE, INDEX
      const headerView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const totalSize = Number(headerView.getBigUint64(16, false));
      const index = headerView.getUint32(24, false);

      // Total size limit check (performed first)
      if (totalSize > PROTOCOL_CONFIG.MAX_TOTAL_SIZE) {
        throw new ArgumentError("Message size exceeds the limit.", {
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
        // Duplicate packet guard
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
        accumulator.delete(uuid); // Free memory

        const resultBytes = bytesConcat(accItem.chunks.filterExists());
        let messageArr: [string, unknown];
        try {
          messageArr = jsonParse<[string, unknown]>(new TextDecoder().decode(resultBytes));
        } catch (err) {
          throw new ArgumentError("Failed to decode message.", { uuid, cause: err });
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
