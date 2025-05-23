import path from "path";
import semver from "semver";
import { SdServiceBase } from "../types";
import { FsUtils } from "@simplysm/sd-core-node";
import { SdServiceServerConfUtils } from "../utils/sd-service-server-conf.utils";

export class SdAutoUpdateService extends SdServiceBase {
  getLastVersion(platform: string): { version: string; downloadPath: string } | undefined {
    const clientName = this.request!.clientName;

    const clientPath = SdServiceServerConfUtils.getClientPath(
      this.server.options.rootPath,
      clientName,
      this.server.pathProxy,
    );
    if (!FsUtils.exists(path.resolve(clientPath, platform, "updates"))) return undefined;

    const updates = FsUtils.readdir(path.resolve(clientPath, platform, "updates"));
    const versions = updates
      .map((item) => ({
        fileName: item,
        version: path.basename(item, path.extname(item)),
        extName: path.extname(item),
      }))
      .filter((item) => {
        if (platform === "android") {
          return item.extName === ".apk" && /^[0-9.]*$/.test(item.version);
        } else {
          return item.extName === ".exe" && /^[0-9.]*$/.test(item.version);
        }
      });

    const version = semver.maxSatisfying(
      versions.map((item) => item.version),
      "*",
    )!;
    const downloadPath =
      "/" +
      path.join(
        clientName,
        platform,
        "updates",
        versions.single((item) => item.version === version)!.fileName,
      );

    return {
      version,
      downloadPath,
    };
  }
}
