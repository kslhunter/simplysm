import path from "path";
import semver from "semver";
import { SdServiceBase } from "../types";
import { FsUtils } from "@simplysm/sd-core-node";
import { SdServiceServerConfUtils } from "../utils/SdServiceServerConfUtils";
import { ISdAutoUpdateService } from "@simplysm/sd-service-common";

export class SdAutoUpdateService extends SdServiceBase implements ISdAutoUpdateService {
  // zip으로 업데이트하는 legacy에서는 apk가 undefined로 들어옴
  // apk버전으로 변경한 최근것은 client에서 apk가 무조건 true로 들어옴
  // 신규버전은 일단 sd-cli에서 zip과 apk모두 생성함
  getLastVersion(
    platform: string,
    apk?: boolean,
  ):
    | {
        version: string;
        downloadPath: string;
      }
    | undefined {
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
          if (apk) {
            return item.extName === ".apk" && /^[0-9.]*$/.test(item.version);
          } else {
            return item.extName === ".zip" && /^[0-9.]*$/.test(item.version);
          }
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
