import * as url from "url";
import * as fs from "fs-extra";
import * as path from "path";
import * as glob from "glob";

export class SdWebSocketServerUtil {
  public static async getConfigAsync(staticPath: string, requestUrl: string): Promise<any> {
    const urlObj = url.parse(requestUrl!, true, false);
    const urlPath = decodeURI(urlObj.pathname!);


    if (urlPath !== "/") {
      return await fs.readJson(path.resolve(staticPath, "." + urlPath, "configs.json"));
    }
    else {
      return await new Promise<any>((resolve, reject) => {
        glob(path.resolve(staticPath, "*", "*", "configs.json"), async (err, files) => {
          if (err) {
            reject(err);
            return;
          }

          for (const file of files) {
            const config = await fs.readJson(file);
            if (config.vhost && config.vhost === urlObj.hostname) {
              resolve(config);
              return;
            }
          }

          reject(new Error("서버에서 이 패키지의 설정파일을 찾는데 실패하였습니다."));
        });
      });
    }
  }
}
