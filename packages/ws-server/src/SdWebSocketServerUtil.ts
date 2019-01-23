import * as url from "url";
import * as fs from "fs-extra";
import * as path from "path";

export class SdWebSocketServerUtil {
  public static getConfig(requestUrl: string): any {
    const urlObj = url.parse(requestUrl!, true, false);
    const urlPath = decodeURI(urlObj.pathname!);

    if (urlPath.startsWith("/")) {
      return fs.readJsonSync(path.resolve(__dirname, "www", "." + urlPath, "configs.json"));
    }

    throw new Error("미구현");
  }
}
