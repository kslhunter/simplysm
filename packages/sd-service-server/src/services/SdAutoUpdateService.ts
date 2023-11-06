import path from "path";
import semver from "semver";
import {SdServiceBase} from "../commons";
import {FsUtil} from "@simplysm/sd-core-node";
import {SdServiceServerConfigUtil} from "../utils/SdServiceServerConfigUtil";

export class SdAutoUpdateService extends SdServiceBase {
  getLastVersion(clientName: string, platform: string): {
    version: string;
    downloadPath: string;
  } {
    const clientPath = SdServiceServerConfigUtil.getClientPath(this.server.options.rootPath, clientName, this.server.pathProxy);
    const updates = FsUtil.readdir(path.resolve(clientPath, platform, "updates"));
    const versions = updates.map((item) => ({
      fileName: item,
      version: path.basename(item, path.extname(item))
    })).filter((item) => (/^[0-9.]*$/).test(item.version));

    const version = semver.maxSatisfying(versions.map((item) => item.version), "*")!;
    const downloadPath = "/" + path.join(clientName, platform, "updates", versions.single(item => item.version === version)!.fileName);

    return {
      version,
      downloadPath
    };
  }
}