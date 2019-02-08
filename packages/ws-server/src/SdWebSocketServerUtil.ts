import * as url from "url";
import * as fs from "fs-extra";
import * as path from "path";

export class SdWebSocketServerUtil {
  public static async getConfigAsync(staticPath: string, requestUrl: string): Promise<any> {
    const urlObj = url.parse(requestUrl!, true, false);
    const urlPath = decodeURI(urlObj.pathname!);

    if (urlPath.startsWith("/")) {
      return await fs.readJson(path.resolve(staticPath, "." + urlPath, "configs.json"));
    }

    throw new Error("미구현");
  }
}
