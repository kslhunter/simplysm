export interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}

/**
 * URL에서 바이너리 데이터 다운로드 (진행률 콜백 지원)
 */
export async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  try {
    // Content-Length를 알 수 있으면 미리 할당하여 메모리 효율성 향상
    if (contentLength > 0) {
      const result = new Uint8Array(contentLength);
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        result.set(value, receivedLength);
        receivedLength += value.length;
        options?.onProgress?.({ receivedLength, contentLength });
      }

      return result;
    }

    // Content-Length를 모르면 청크 수집 후 병합 (chunked encoding)
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;
    }

    // 청크 병합
    const result = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }

    return result;
  } finally {
    reader.releaseLock();
  }
}
