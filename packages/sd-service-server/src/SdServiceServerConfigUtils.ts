import * as path from "path";
import {FsUtil} from "@simplysm/sd-core-node";
import * as url from "url";

export class SdServiceServerConfigUtils {
  public static async getConfigAsync(rootPath: string, requestUrl?: string): Promise<{ [key: string]: any }> {
    let targetPath: string;
    if (requestUrl) {
      const urlObj = url.parse(requestUrl, true, false);
      const clientPath = decodeURI(urlObj.pathname!.slice(1));
      targetPath = path.resolve(rootPath, "www", clientPath);
    }
    else {
      targetPath = rootPath;
    }

    const filePath = path.resolve(targetPath, ".config.json");
    if (!(FsUtil.exists(filePath))) {
      throw new Error(`서버에서 설정파일을 찾는데 실패하였습니다.\n\t- ${filePath}`);
    }

    return await FsUtil.readJsonAsync(filePath);
  }
}