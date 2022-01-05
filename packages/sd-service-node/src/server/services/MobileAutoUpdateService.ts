import * as path from "path";
import * as semver from "semver";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import { SdServiceBase } from "../SdServiceBase";

export class MobileAutoUpdateService extends SdServiceBase {
  private readonly _logger = Logger.get(["simplysm-ts", "AutoUpdateService", this.constructor.name]);

  public async getLastVersionAsync(clientName: string): Promise<string | undefined> {
    try {
      const updates = await FsUtil.readdirAsync(path.resolve(this.server.rootPath, "www", clientName, "updates"));
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

  public async getVersionZipBufferAsync(clientName: string, version: string): Promise<Buffer> {
    const updates = await FsUtil.readdirAsync(path.resolve(this.server.rootPath, "www", clientName, "updates"));
    const filePath = updates.single((item) => (/-v(.*)\.zip$/).exec(item)?.[1] === version)!;
    return await FsUtil.readFileBufferAsync(path.resolve(this.server.rootPath, "www", clientName, "updates", filePath));
  }
}