import * as url from "url";
import * as fs from "fs-extra";
import * as path from "path";

export class SdServerHelper {
  public static async getConfigAsync(requestUrl: string): Promise<any> {
    const urlObj = url.parse(requestUrl!, true, false);
    const urlPath = decodeURI(urlObj.pathname!.slice(1));

    if (urlPath.startsWith("/")) {
      return await fs.readJson(path.resolve(__dirname, "www", "." + urlPath, "configs.json"));
    }

    throw new Error("미구현");
  }
}
