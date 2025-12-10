import path from "path";
import semver from "semver";
import { FsUtils } from "@simplysm/sd-core-node";
import { ISdAutoUpdateService } from "@simplysm/sd-service-common";
import { SdServiceBase } from "../core/SdServiceBase";

export class SdAutoUpdateService extends SdServiceBase implements ISdAutoUpdateService {
  getLastVersion(platform: string):
    | {
        version: string;
        downloadPath: string;
      }
    | undefined {
    const clientPath = this.clientPath;
    if (clientPath == null) throw new Error("클라이언트 경로를 찾을 수 없습니다.");

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
        this.socket?.clientName ?? this.v1?.request.clientName ?? "",
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
