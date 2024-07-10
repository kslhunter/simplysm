import {NumberUtil} from "./NumberUtil";

export abstract class NetUtil {
  static async downloadAsync(url: string, progressCallback?: (progress: INetDownloadProgress) => void) {
    const res = await fetch(url, {method: "GET"});
    const reader = res.body!.getReader();

    const contentLength = NumberUtil.parseInt(res.headers.get('Content-Length'))!;

    let buffer = Buffer.from([]);
    while (true) {
      const {done, value} = await reader.read();

      if (done) {
        break;
      }

      buffer = Buffer.concat([buffer, value]);

      if (progressCallback) {
        progressCallback({
          contentLength,
          receivedLength: buffer.length
        });
      }
    }

    return buffer;
  }
}

interface INetDownloadProgress {
  contentLength: number;
  receivedLength: number;
}