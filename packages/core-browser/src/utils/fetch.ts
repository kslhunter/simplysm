import { bytes } from "@simplysm/core-common";

export interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}

/**
 * URL에서 바이너리 데이터 다운로드 (진행 콜백 지원)
 */
export async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("응답 본문을 읽을 수 없습니다");
  }

  try {
    // Content-Length를 알 수 있는 경우, 메모리 효율을 위해 사전 할당
    if (contentLength > 0) {
      const result = new Uint8Array(contentLength);
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (receivedLength + value.length > contentLength) {
          throw new Error(
            `수신 데이터가 Content-Length를 초과했습니다 (Content-Length: ${contentLength}, 수신: ${receivedLength + value.length}+)`,
          );
        }

        result.set(value, receivedLength);
        receivedLength += value.length;
        options?.onProgress?.({ receivedLength, contentLength });
      }

      if (receivedLength < contentLength) {
        throw new Error(
          `수신 데이터가 Content-Length보다 부족합니다 (Content-Length: ${contentLength}, 수신: ${receivedLength})`,
        );
      }

      return result;
    }

    // Content-Length를 알 수 없는 경우, 청크를 수집 후 병합 (chunked encoding)
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
    }

    return bytes.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
