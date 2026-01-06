import { NumberUtils } from "./NumberUtils";

export abstract class NetUtils {
  static async downloadBufferAsync(
    url: string,
    options?: {
      progressCallback?: (progress: INetDownloadProgress) => void;
      signal?: AbortSignal;
    },
  ): Promise<Buffer> {
    const res = await fetch(url, { method: "GET", signal: options?.signal });
    const reader = res.body!.getReader();

    const contentLength = NumberUtils.parseInt(res.headers.get("Content-Length")) ?? -1;

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (options?.progressCallback && contentLength > 0) {
        options.progressCallback({ contentLength, receivedLength });
      }
    }

    const result = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }
}

interface INetDownloadProgress {
  contentLength: number;
  receivedLength: number;
}
