import { FsUtil, SdProcess } from "@simplysm/sd-core-node";
import { INpmConfig } from "../commons";
import path from "path";

export class SdCliElectron {
  public static async runWebviewOnDeviceAsync(rootPath: string, pkgName: string): Promise<void> {
    const electronPath = path.resolve(rootPath, `packages/${pkgName}/.electron`);

    const npmConfig = (await FsUtil.readJsonAsync(path.resolve(rootPath, `packages/${pkgName}/package.json`))) as INpmConfig;
    await FsUtil.writeJsonAsync(path.resolve(electronPath, `package.json`), {
      name: npmConfig.name,
      version: npmConfig.version,
      description: npmConfig.description,
      main: "electron.js",
      author: npmConfig.author,
      license: npmConfig.license
    });

    await FsUtil.copyAsync(path.resolve(rootPath, `packages/${pkgName}/src/electron.dev.js`), path.resolve(electronPath, "electron.js"));

    await SdProcess.spawnAsync(`electron "${electronPath}"`, {
      cwd: rootPath
    }, true);
  }
}