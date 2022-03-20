import path from "path";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { FsUtil } from "@simplysm/sd-core-node";

export class SdServiceServerConfigUtil {
  public static async getConfigAsync(rootPath: string, clientName?: string): Promise<Record<string, any | undefined>> {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(rootPath, ".config.json");
    if (FsUtil.exists(rootFilePath)) {
      result = await FsUtil.readJsonAsync(rootFilePath);
    }

    if (clientName !== undefined) {
      const targetPath = path.resolve(rootPath, "www", clientName);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtil.exists(filePath)) {
        result = ObjectUtil.merge(result, await FsUtil.readJsonAsync(filePath));
      }
    }

    return result;
  }

  public static getConfig(rootPath: string, clientName?: string): Record<string, any | undefined> {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(rootPath, ".config.json");
    if (FsUtil.exists(rootFilePath)) {
      result = FsUtil.readJson(rootFilePath);
    }

    if (clientName != undefined) {
      const targetPath = path.resolve(rootPath, "www", clientName);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtil.exists(filePath)) {
        result = ObjectUtil.merge(result, FsUtil.readJson(filePath));
      }
    }

    return result;
  }
}
