// request/response payload가 이 사이즈를 넘으면 split 사용 (바이트)
export const SD_SERVICE_MAX_MESSAGE_SIZE = 3 * 1024 * 1024; // 3MB

// split 전송 시 각 조각 크기 (바이트)
export const SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE = 300 * 1024; // 300KB

// 메시지 문자열을 chunkSize 단위로 잘라주는 유틸
export function splitServiceMessage(msg: string, chunkSize: number): string[] {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0.");
  }

  const chunks: string[] = [];
  for (let i = 0; i < msg.length; i += chunkSize) {
    chunks.push(msg.substring(i, i + chunkSize));
  }
  return chunks;
}

interface ISdServiceSplitMessageAccumulatorItem {
  fullSize: number;
  completedSize: number;
  chunks: string[];
}

export interface ISdServiceSplitMessageAccumulatorPushResult {
  completedSize: number;
  isCompleted: boolean;
  fullText?: string;
}

// uuid별로 split된 문자열을 모아주는 Accumulator
export class SdServiceSplitMessageAccumulator {
  #map = new Map<string, ISdServiceSplitMessageAccumulatorItem>();

  push(
    uuid: string,
    fullSize: number,
    index: number,
    body: string,
  ): ISdServiceSplitMessageAccumulatorPushResult {
    let item = this.#map.get(uuid);
    if (!item) {
      item = { fullSize, completedSize: 0, chunks: [] };
      this.#map.set(uuid, item);
    }

    item.chunks[index] = body;
    item.completedSize += body.length;

    const isCompleted = item.completedSize === item.fullSize;

    if (isCompleted) {
      const fullText = item.chunks.join("");
      this.#map.delete(uuid);
      return { completedSize: item.completedSize, isCompleted, fullText };
    }

    return { completedSize: item.completedSize, isCompleted };
  }

  clear(uuid: string): void {
    this.#map.delete(uuid);
  }

  clearAll(): void {
    this.#map.clear();
  }
}
