import path from "path";
import semver from "semver";
import { fsExists, fsReaddir } from "@simplysm/core-node";
import { defineService, type ServiceMethods } from "../core/define-service";

export const AutoUpdateService = defineService("AutoUpdate", (ctx) => ({
  async getLastVersion(platform: string): Promise<
    | {
        version: string;
        downloadPath: string;
      }
    | undefined
  > {
    const clientPath = ctx.clientPath;
    if (clientPath == null) throw new Error("클라이언트 경로를 찾을 수 없습니다.");

    if (!(await fsExists(path.resolve(clientPath, platform, "updates")))) return undefined;

    const updates = await fsReaddir(path.resolve(clientPath, platform, "updates"));
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
    );

    if (version == null) return undefined;

    const versionItem = versions.find((item) => item.version === version);
    if (versionItem == null) return undefined;

    const downloadPath =
      "/" + path.join(ctx.clientName ?? "", platform, "updates", versionItem.fileName);

    return {
      version: version.toString(),
      downloadPath,
    };
  },
}));

export type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>;
