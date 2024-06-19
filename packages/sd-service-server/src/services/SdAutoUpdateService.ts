import path from "path";
import semver from "semver";
import {SdServiceBase} from "../commons";
import {FsUtil} from "@simplysm/sd-core-node";
import {SdServiceServerConfigUtil} from "../utils/SdServiceServerConfigUtil";

export class SdAutoUpdateService extends SdServiceBase {
  getLastVersion(platform: string): {
    version: string;
    downloadPath: string;
  } {
    const clientPath = SdServiceServerConfigUtil.getClientPath(this.server.options.rootPath, this.request!.clientName, this.server.pathProxy);
    const updates = FsUtil.readdir(path.resolve(clientPath, platform, "updates"));
    const versions = updates.map((item) => ({
      fileName: item,
      version: path.basename(item, path.extname(item)),
      extName: path.extname(item)
    })).filter((item) => item.extName === ".zip" && (/^[0-9.]*$/).test(item.version));

    const version = semver.maxSatisfying(versions.map((item) => item.version), "*")!;
    const downloadPath = "/" + path.join(this.request!.clientName, platform, "updates", versions.single(item => item.version === version)!.fileName);

    return {
      version,
      downloadPath
    };
  }

  /** @deprecated 이전 버전용*/
  async getLastVersionAsync(platform: string): Promise<string | undefined> {
    try {
      const updates = await FsUtil.readdirAsync(path.resolve(this.server.options.rootPath, "www", this.request!.clientName, platform, "updates"));
      const versions = updates.map((item) => ({
        fileName: item,
        version: path.basename(item, path.extname(item)),
        extName: path.extname(item)
      })).filter((item) => item.extName === ".apk" && (/^[0-9.]*$/).test(item.version));

      return semver.maxSatisfying(versions.map((item) => item.version), "*") ?? undefined;
    }
    catch (err) {
      return undefined;
    }
  }
}