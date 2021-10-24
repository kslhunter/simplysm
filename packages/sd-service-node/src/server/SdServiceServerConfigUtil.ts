import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import * as url from "url";
import { ObjectUtil } from "@simplysm/sd-core-common";

export class SdServiceServerConfigUtil {
  public static async getConfigAsync(rootPath: string, requestUrl?: string): Promise<Record<string, any | undefined>> {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(rootPath, ".config.json");
    if (FsUtil.exists(rootFilePath)) {
      result = await FsUtil.readJsonAsync(rootFilePath);
    }

    if (requestUrl !== undefined && requestUrl !== "" && !requestUrl.startsWith("file://")) {
      const urlObj = url.parse(requestUrl.replace(/__([^_]*)__\//g, ""), true, false);
      const clientPath = decodeURI(urlObj.pathname!.slice(1));
      const targetPath = path.resolve(rootPath, "www", clientPath);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtil.exists(filePath)) {
        result = ObjectUtil.merge(result, await FsUtil.readJsonAsync(filePath));
      }
    }

    return result;
  }

  public static getConfig(rootPath: string, requestUrl?: string): Record<string, any | undefined> {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(rootPath, ".config.json");
    if (FsUtil.exists(rootFilePath)) {
      result = FsUtil.readJson(rootFilePath);
    }

    if (requestUrl !== undefined && requestUrl !== "" && !requestUrl.startsWith("file://")) {
      const urlObj = url.parse(requestUrl.replace(/__([^_]*)__\//g, ""), true, false);
      const clientPath = decodeURI(urlObj.pathname!.slice(1));
      const targetPath = path.resolve(rootPath, "www", clientPath);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtil.exists(filePath)) {
        result = ObjectUtil.merge(result, FsUtil.readJson(filePath));
      }
    }

    return result;
  }
}
