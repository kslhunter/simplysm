import * as path from "path";
import {FsUtil} from "@simplysm/sd-core-node";

export class SdServiceServerConfigUtils {
  public static async getConfigAsync(rootPath: string, clientPath?: string): Promise<{ [key: string]: any }> {
    const targetPath = clientPath ? path.resolve(rootPath, "www", clientPath) : rootPath;

    const filePath = path.resolve(targetPath, ".config.json");
    if (!(FsUtil.exists(filePath))) {
      throw new Error(`서버에서 설정파일을 찾는데 실패하였습니다.\n\t- ${filePath}`);
    }

    return await FsUtil.readJsonAsync(filePath);
  }
}