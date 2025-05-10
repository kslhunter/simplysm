import { NumberUtils } from "./number.utils";

export abstract class NetUtils {
  static async downloadBufferAsync(
    url: string,
    progressCallback?: (progress: INetDownloadProgress) => void,
  ): Promise<Buffer> {
    const res = await fetch(url, { method: "GET" });
    const reader = res.body!.getReader();

    const contentLength = NumberUtils.parseInt(res.headers.get("Content-Length")) ?? -1;

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (progressCallback && contentLength > 0) {
        progressCallback({ contentLength, receivedLength });
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