import { bytes } from "@simplysm/core-common";

export interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}

/**
 * Download binary data from URL (with progress callback support)
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
    // If Content-Length is known, pre-allocate for memory efficiency
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

    // If Content-Length is unknown, collect chunks then merge (chunked encoding)
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
