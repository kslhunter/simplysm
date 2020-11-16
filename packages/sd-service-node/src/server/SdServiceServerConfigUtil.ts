import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import * as url from "url";

export class SdServiceServerConfigUtil {
  public static async getConfigAsync(rootPath: string, requestUrl?: string): Promise<Record<string, any> | undefined> {
    let targetPath: string;
    if (requestUrl !== undefined && requestUrl !== "") {
      const urlObj = url.parse(requestUrl, true, false);
      const clientPath = decodeURI(urlObj.pathname!.slice(1));
      targetPath = path.resolve(rootPath, "www", clientPath);
    }
    else {
      targetPath = rootPath;
    }

    const filePath = path.resolve(targetPath, ".configs.json");
    if (!(FsUtil.exists(filePath))) {
      return undefined;
    }

    return await FsUtil.readJsonAsync(filePath);
  }
}