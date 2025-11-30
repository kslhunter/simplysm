import { JsonConvert } from "@simplysm/sd-core-common";
import {
  ISdServiceSplitRequest,
  ISdServiceSplitResponse,
  TSdServiceMessage,
} from "./types/protocol.types";

// 메시지 사이즈 상수
export const SD_SERVICE_MAX_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB
export const SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE = 300 * 1024; // 300KB

export class SdServiceProtocol {
  // 조립 중인 메시지 보관소 (Key: reqUuid)
  private readonly _accumulator = new Map<
    string,
    {
      lastUpdatedAt: number;
      fullSize: number;
      buffers: Map<number, string>;
      receivedSize: number;
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

    // 1. 사이즈가 작으면 그대로 반환
    if (json.length <= SD_SERVICE_MAX_MESSAGE_SIZE) {
      return { json, chunks: [json] };
    }

    // 2. 분할 불가능한 메시지(request/response 외)는 그냥 반환
    if (message.name !== "request" && message.name !== "response") {
      return { json, chunks: [json] };
    }

    // 3. 분할 처리
    const chunks: string[] = [];
    const totalLength = json.length;
    let offset = 0;
    let index = 0;

    while (offset < totalLength) {
      const chunkBody = json.slice(offset, offset + SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE);

      // 분할 패킷 생성
      const splitPacket: ISdServiceSplitRequest | ISdServiceSplitResponse = {
        name: `${message.name}-split`,
        reqUuid: message.reqUuid,
        fullSize: totalLength,
        index,
        body: chunkBody,
      };

      chunks.push(JsonConvert.stringify(splitPacket));
      offset += SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE;
      index++;
    }

    return { json, chunks };
  }

  /**
   * 메시지 디코딩 (분할 패킷 자동 조립)
   */
  decode(json: string): ISdServiceProtocolDecodeResult {
    // 1. 파싱
    const packet = JsonConvert.parse(json) as TSdServiceMessage;

    // 2. 분할 패킷인 경우 (조립)
    if (packet.name === "request-split" || packet.name === "response-split") {
      const { reqUuid, fullSize, index, body } = packet;

      let item = this._accumulator.getOrCreate(reqUuid, {
        lastUpdatedAt: Date.now(),
        fullSize,
        buffers: new Map(),
        receivedSize: 0,
      });

      // 중복 패킷 방어
      if (!item.buffers.has(index)) {
        item.buffers.set(index, body);
        item.receivedSize += body.length;
        item.lastUpdatedAt = Date.now();
      }

      // 조립 완료 체크
      if (item.receivedSize >= item.fullSize) {
        const fullText = Array.from(item.buffers.keys())
          .orderBy()
          .map((k) => item.buffers.get(k))
          .join("");
        this._accumulator.delete(reqUuid); // 메모리 해제

        return { type: "complete", message: JsonConvert.parse(fullText) };
      }

      // 진행 중
      return {
        type: "accumulating",
        reqUuid,
        completedSize: item.receivedSize,
        fullSize: item.fullSize,
      };
    }

    // 3. 일반 메시지
    return { type: "complete", message: packet };
  }
}

// 결과 타입
export type ISdServiceProtocolDecodeResult =
  | { type: "complete"; message: TSdServiceMessage }
  | { type: "accumulating"; reqUuid: string; completedSize: number; fullSize: number };
