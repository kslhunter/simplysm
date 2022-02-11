import path from "path";
import semver from "semver";
import { SdServiceBase } from "../commons";
import { FsUtil, Logger } from "@simplysm/sd-core-node";

export class SdAutoUpdateService extends SdServiceBase {
  private readonly _logger = Logger.get(["simplysm-ts", "sd-service-server", this.constructor.name]);

  public async getLastVersionAsync(clientName: string, platform: string): Promise<string | undefined> {
    try {
      const updates = await FsUtil.readdirAsync(path.resolve(this.server.options.rootPath, "www", clientName, platform, "updates"));
      const versions = updates.map((item) => ({
        fileName: item,
        version: (/-v(.*)\.zip$/).exec(item)?.[1]
      })).filter((item) => item.version !== undefined);

      return semver.maxSatisfying(versions.map((item) => item.version!), "*") ?? undefined;
    }
    catch (err) {
      this._logger.error(err);
      return undefined;
    }
  }

  public async getVersionZipBufferAsync(clientName: string, platform: string, version: string): Promise<Buffer> {
    const updates = await FsUtil.readdirAsync(path.resolve(this.server.options.rootPath, "www", clientName, platform, "updates"));
    const filePath = updates.single((item) => (/-v(.*)\.zip$/).exec(item)?.[1] === version)!;
    return await FsUtil.readFileBufferAsync(path.resolve(this.server.options.rootPath, "www", clientName, platform, "updates", filePath));
  }
}
