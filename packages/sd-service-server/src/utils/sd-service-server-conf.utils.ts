import path from "path";
import {FsUtils} from "@simplysm/sd-core-node";
import {ObjectUtils} from "@simplysm/sd-core-common";

export class SdServiceServerConfUtils {
  static getConfig(rootPath: string, clientName?: string, pathProxy?: Record<string, string | number>) {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(rootPath, ".config.json");
    if (FsUtils.exists(rootFilePath)) {
      result = FsUtils.readJson(rootFilePath);
    }

    if (clientName !== undefined) {
      const targetPath = this.getClientPath(rootPath, clientName, pathProxy);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtils.exists(filePath)) {
        result = ObjectUtils.merge(result, FsUtils.readJson(filePath));
      }
    }

    return result;
  }

  static getClientPath(rootPath: string, clientName: string, pathProxy?: Record<string, string | number>) {
    return typeof pathProxy?.[clientName] === "string"
      ? pathProxy[clientName]
      : path.resolve(rootPath, "www", clientName);
  }
}