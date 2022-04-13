import path from "path";
import semver from "semver";
import { SdServiceBase } from "../commons";
import { FsUtil } from "@simplysm/sd-core-node";

export class SdAutoUpdateService extends SdServiceBase {
  public async getLastVersionAsync(clientName: string, platform: string): Promise<string | undefined> {
    try {
      const updates = await FsUtil.readdirAsync(path.resolve(this.server.options.rootPath, "www", clientName, platform, "updates"));
      const versions = updates.map((item) => ({
        fileName: item,
        version: path.basename(item, path.extname(item))
      })).filter((item) => (/^[0-9.]*$/).test(item.version));

      return semver.maxSatisfying(versions.map((item) => item.version), "*") ?? undefined;
    }
    catch (err) {
      return undefined;
    }
  }
}
