import { JsonConvert } from "@simplysm/sd-core-common";
import type {
  ISdServiceSplitRequest,
  ISdServiceSplitResponse,
  TSdServiceMessage,
} from "./protocol-v1.types";

/**
 * @deprecated
 */
export class SdServiceProtocolV1 {
  // 메시지 사이즈 상수
  private readonly _SPLIT_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB
  private readonly _CHUNK_SIZE = 300 * 1024; // 300KB
  private readonly _MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

  // 조립 중인 메시지 보관소 (Key: reqUuid)
  private readonly _accumulator = new Map<
    string,
    {
      lastUpdatedAt: number;
      totalSize: number;
      buffers: Map<number, string>;
      completedSize: number;
    }
  >();

  // GC 타이머 (10초마다 체크하여 60초 지난 미완성 조각 제거)
  private readonly _gcInterval = setInterval(() => {
    const now = Date.now();
    for (const [reqUuid, item] of this._accumulator) {
      if (now - item.lastUpdatedAt > 60 * 1000) {
        this._accumulator.delete(reqUuid);
      }
    }
  }, 10000);

  dispose(): void {
    clearInterval(this._gcInterval);
    this._accumulator.clear();
  }

  /**
   * 메시지 인코딩 (필요 시 자동 분할)
   */
  encode(message: TSdServiceMessage): { json: string; chunks: string[] } {
    const json = JsonConvert.stringify(message);

    const totalSize = json.length;

    // 전체 사이즈 제한 체크 (가장 먼저 수행)
    if (totalSize > this._MAX_TOTAL_SIZE) {
      throw new Error(`Message size exceeded limit: ${totalSize}`);
    }

    // 1. 사이즈가 작으면 그대로 반환
    if (totalSize <= this._SPLIT_MESSAGE_SIZE) {
      return { json, chunks: [json] };
    }

    // 2. 분할 불가능한 메시지(request/response 외)는 그냥 반환
    if (message.name !== "request" && message.name !== "response") {
      return { json, chunks: [json] };
    }

    // 3. 분할 처리
    const chunks: string[] = [];
    let offset = 0;
    let index = 0;

    while (offset < totalSize) {
      const chunkBody = json.slice(offset, offset + this._CHUNK_SIZE);

      // 분할 패킷 생성
      const splitPacket = {
        name: `${message.name}-split`,
        ...("uuid" in message
          ? {
              uuid: message.uuid,
            }
          : {
              reqUuid: message.reqUuid,
            }),
        fullSize: totalSize,
        index,
        body: chunkBody,
      } as ISdServiceSplitRequest | ISdServiceSplitResponse;

      chunks.push(JsonConvert.stringify(splitPacket));
      offset += this._CHUNK_SIZE;
      index++;
    }

    return { json, chunks };
  }

  /**
   * 메시지 디코딩 (분할 패킷 자동 조립)
   */
  decode(json: string): ISdServiceProtocolDecodeResult {
    // 1. 파싱
    const packet = JsonConvert.parse<TSdServiceMessage>(json);

    // 2. 분할 패킷인 경우 (조립)
    if (packet.name === "request-split" || packet.name === "response-split") {
      const { index, body } = packet;
      const uuid = "reqUuid" in packet ? packet.reqUuid : packet.uuid;
      const totalSize = packet.fullSize;

      // 전체 사이즈 제한 체크 (가장 먼저 수행)
      if (totalSize > this._MAX_TOTAL_SIZE) {
        throw new Error(`Message size exceeded limit: ${totalSize}`);
      }

      let item = this._accumulator.getOrCreate(uuid, {
        lastUpdatedAt: Date.now(),
        totalSize,
        buffers: new Map(),
        completedSize: 0,
      });

      // 중복 패킷 방어
      if (!item.buffers.has(index)) {
        item.buffers.set(index, body);
        item.completedSize += body.length;
        item.lastUpdatedAt = Date.now();
      }

      // 조립 완료 체크
      if (item.completedSize >= item.totalSize) {
        const fullText = Array.from(item.buffers.keys())
          .orderBy()
          .map((k) => item.buffers.get(k))
          .join("");
        this._accumulator.delete(uuid); // 메모리 해제

        return { type: "complete", message: JsonConvert.parse(fullText) };
      }

      // 진행 중
      return {
        type: "accumulating",
        uuid: uuid,
        completedSize: item.completedSize,
        totalSize: item.totalSize,
      };
    }

    // 3. 일반 메시지
    return { type: "complete", message: packet };
  }
}

// 결과 타입
/** @deprecated */
export type ISdServiceProtocolDecodeResult =
  | { type: "complete"; message: TSdServiceMessage }
  | { type: "accumulating"; uuid: string; completedSize: number; totalSize: number };
