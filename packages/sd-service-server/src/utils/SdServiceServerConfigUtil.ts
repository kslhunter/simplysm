import path from "path";
import {FsUtil} from "@simplysm/sd-core-node";
import {ObjectUtil} from "@simplysm/sd-core-common";

export class SdServiceServerConfigUtil {
  static getConfig(rootPath: string, clientName?: string, pathProxy?: Record<string, string | number>) {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(rootPath, ".config.json");
    if (FsUtil.exists(rootFilePath)) {
      result = FsUtil.readJson(rootFilePath);
    }

    if (clientName !== undefined) {
      const targetPath = this.getClientPath(rootPath, clientName, pathProxy);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtil.exists(filePath)) {
        result = ObjectUtil.merge(result, FsUtil.readJson(filePath));
      }
    }

    return result;
  }

  static getClientPath(rootPath: string, clientName: string, pathProxy?: Record<string, string | number>) {
    return typeof pathProxy?.[clientName] === "string"
      ? pathProxy[clientName] as string
      : path.resolve(rootPath, "www", clientName);
  }
}