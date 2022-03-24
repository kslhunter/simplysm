import path from "path";
import semver from "semver";
import { SdServiceBase } from "../commons";
import { FsUtil, Logger } from "@simplysm/sd-core-node";

export class SdAutoUpdateService extends SdServiceBase {
  private readonly _logger = Logger.get(["simplysm", "sd-service-server", this.constructor.name]);

  public async getLastVersionAsync(clientName: string, platform: string): Promise<string | undefined> {
    try {
      const updates = await FsUtil.readdirAsync(path.resolve(this.server.options.rootPath, "www", clientName, platform, "updates"));
      const versions = updates.map((item) => ({
        fileName: item,
        version: path.basename(item, path.extname(item))
      })).filter((item) => (/^[0-9.]$/).test(item.version));

      return semver.maxSatisfying(versions.map((item) => item.version), "*") ?? undefined;
    }
    catch (err) {
      this._logger.error(err);
      return undefined;
    }
  }
}
