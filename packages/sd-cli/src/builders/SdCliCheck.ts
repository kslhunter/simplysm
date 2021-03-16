import { INpmConfig } from "../commons";
import { FsUtil, Logger } from "@simplysm/sd-core-node";
import * as path from "path";
import { ObjectUtil } from "@simplysm/sd-core-common";

const lockfile = require("@yarnpkg/lockfile");

export class SdCliCheck {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public async checkAsync(showAll: boolean): Promise<void> {
    // MY PACKAGE
    const projectNpmConfig: INpmConfig = await FsUtil.readJsonAsync("package.json");
    const packagePaths = await projectNpmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
    const packageNpmConfigs = (await packagePaths?.mapAsync(async (item) => await FsUtil.readJsonAsync(path.resolve(item, "package.json")))) ?? [];
    const npmConfigs: INpmConfig[] = [projectNpmConfig].concat(packageNpmConfigs);
    const myPackageDefs = npmConfigs
      .mapMany((item) => {
        const depRecord = ObjectUtil.merge(ObjectUtil.merge(item.dependencies ?? {}, item.devDependencies ?? {}), item.peerDependencies ?? {});
        return Object.keys(depRecord).map((depKey) => ({
          name: item.name,
          version: item.version,
          depName: depKey,
          depVersionText: depRecord[depKey]
        }));
      })
      .filter((item) => !item.depName.startsWith("@types/"));

    // LOCKFILE PACKAGE
    const lockFileContent = await FsUtil.readFileAsync("yarn.lock");
    const lockFileObj = lockfile.parse(lockFileContent);
    const lockFileObjKeys = Object.keys(lockFileObj.object);
    const lockFilePackageDefs = lockFileObjKeys
      .mapMany((key) => {
        const subKeys = key.split(",");
        return subKeys.mapMany((subKey) => {
          const depRecord = lockFileObj.object[key].dependencies ?? {};

          const matches = (/^(.*)@([^@]*)$/).exec(subKey);
          return Object.keys(depRecord).map((depKey) => ({
            name: matches![1],
            // versionText: matches![2],
            version: lockFileObj.object[key]["version"] as string,
            depName: depKey,
            depVersionText: depRecord[depKey] as string
          }));
        });
      })
      .filter((item) => !item.depName.startsWith("@types/") && !item.name.startsWith("@types/"));

    const myPackageDefGroup = myPackageDefs.groupBy((item) => ({
      depName: item.depName,
      depVersionText: item.depVersionText
    }));
    for (const myPackageDefGroupItem of myPackageDefGroup) {
      if (
        showAll ||
        myPackageDefGroupItem.key.depName === "typescript" ||
        myPackageDefGroupItem.key.depName.includes("eslint") ||
        myPackageDefGroupItem.key.depName === "rxjs" ||
        myPackageDefGroupItem.key.depName === "zone.js" ||
        myPackageDefGroupItem.key.depName.includes("angular") ||
        myPackageDefGroupItem.key.depName.includes("ngtools") ||
        myPackageDefGroupItem.key.depName.includes("simplysm")
      ) {
        const sameDepLockFilePackageDefs = [...lockFilePackageDefs, ...myPackageDefs].filter((item) => item.depName === myPackageDefGroupItem.key.depName);
        const diffDepDefs = sameDepLockFilePackageDefs
          .filter((item) => (
            item.depVersionText !== myPackageDefGroupItem.key.depVersionText/* &&
            !(item.depVersionText.startsWith("^") && item.depVersionText.split(".")[0] === myPackageDefGroupItem.key.depVersionText.split(".")[0])*/
          ))
          .map((item) => ({
            name: item.name,
            version: item.version,
            depVersionText: item.depVersionText
          }))
          .filter((item) => (
            showAll ||
            item.name === "typescript" ||
            item.name.includes("eslint") ||
            item.name === "rxjs" ||
            item.name === "zone.js" ||
            item.name.includes("angular") ||
            item.name.includes("ngtools") ||
            item.name.includes("simplysm")
          ))
          .distinct();

        if (diffDepDefs.length > 0 || myPackageDefGroupItem.values.map((item) => item.depVersionText).distinct().length > 1) {
          const message = `
------------------------------------------
${myPackageDefGroupItem.key.depName}@${myPackageDefGroupItem.key.depVersionText}
------------------------------------------
${myPackageDefGroupItem.values.map((item) => `${item.depVersionText}\t<= ${item.name}@${item.version}`).join("\r\n")}
${diffDepDefs.map((item) => `${item.depVersionText}\t<= ${item.name}@${item.version}`).join("\r\n")}`;
          this._logger.error(message);
        }
      }
    }
  }
}