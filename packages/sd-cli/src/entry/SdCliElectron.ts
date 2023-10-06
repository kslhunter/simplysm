import {FsUtil, Logger, SdProcess} from "@simplysm/sd-core-node";
import {pathToFileURL} from "url";
import path from "path";
import {INpmConfig, ISdCliConfig} from "../commons";
import electronBuilder from "electron-builder";

export class SdCliElectron {
  public static async runAsync(opt: {
    confFileRelPath: string;
    optNames: string[];
    pkgName: string;
  }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliElectron", "runAsync"]);

    const pkgPath = path.resolve(process.cwd(), `packages/${opt.pkgName}`);
    const electronPath = path.resolve(pkgPath, ".cache/dev/electron/src");

    logger.log("설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(true, opt.optNames) as ISdCliConfig;
    const pkgConf = projConf.packages[opt.pkgName];
    if (pkgConf?.type !== "client" || pkgConf.builder?.electron === undefined) {
      throw new Error();
    }

    logger.log("package.json 파일 쓰기...");
    const npmConfig = (await FsUtil.readJsonAsync(path.resolve(pkgPath, `package.json`))) as INpmConfig;

    const externalPkgNames = pkgConf.builder.electron.reinstallDependencies ?? [];

    await FsUtil.writeJsonAsync(path.resolve(electronPath, `package.json`), {
      name: npmConfig.name,
      version: npmConfig.version,
      description: npmConfig.description,
      main: "electron-main.js",
      ...pkgConf.builder.electron.postInstallScript !== undefined ? {
        scripts: {
          "postinstall": pkgConf.builder.electron.postInstallScript
        },
      } : {},
      dependencies: externalPkgNames.toObject((item) => item, (item) => npmConfig.dependencies![item])
    });

    logger.log("npm install...");
    await SdProcess.spawnAsync(`npm install`, {cwd: electronPath}, true);

    for (const externalPkgName of externalPkgNames) {
      if (FsUtil.exists(path.resolve(electronPath, "node_modules", externalPkgName, "binding.gyp"))) {
        logger.log(`electron rebuild (${externalPkgName})...`);
        await SdProcess.spawnAsync(`electron-rebuild -m ./node_modules/${externalPkgName}`, {cwd: electronPath}, true);
      }
    }

    logger.log("electron...");
    await SdProcess.spawnAsync(`electron .`, {cwd: electronPath}, true);
  }

  public static async buildForDevAsync(opt: {
    confFileRelPath: string;
    optNames: string[];
    pkgName: string;
  }): Promise<void> {
    const logger = Logger.get(["simplysm", "sd-cli", "SdCliElectron", "buildForDevAsync"]);

    const pkgPath = path.resolve(process.cwd(), `packages/${opt.pkgName}`);
    const electronPath = path.resolve(pkgPath, ".cache/dev/electron/src");
    const electronDistPath = path.resolve(pkgPath, ".cache/dev/electron/dist");

    logger.log("설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(true, opt.optNames) as ISdCliConfig;
    const pkgConf = projConf.packages[opt.pkgName];
    if (pkgConf?.type !== "client" || pkgConf.builder?.electron === undefined) {
      throw new Error();
    }

    logger.log("package.json 파일 쓰기...");
    const npmConfig = (await FsUtil.readJsonAsync(path.resolve(pkgPath, `package.json`))) as INpmConfig;

    const externalPkgNames = pkgConf.builder.electron.reinstallDependencies ?? [];

    await FsUtil.writeJsonAsync(path.resolve(electronPath, `package.json`), {
      name: npmConfig.name,
      version: npmConfig.version,
      description: npmConfig.description,
      main: "electron-main.js",
      ...pkgConf.builder.electron.postInstallScript !== undefined ? {
        scripts: {
          "postinstall": pkgConf.builder.electron.postInstallScript
        },
      } : {},
      dependencies: externalPkgNames.toObject((item) => item, (item) => npmConfig.dependencies![item])
    });

    logger.log("npm install...");
    await SdProcess.spawnAsync(`npm install`, {cwd: electronPath}, true);

    for (const externalPkgName of externalPkgNames) {
      if (FsUtil.exists(path.resolve(electronPath, "node_modules", externalPkgName, "binding.gyp"))) {
        logger.log(`electron rebuild (${externalPkgName})...`);
        await SdProcess.spawnAsync(`electron-rebuild -m ./node_modules/${externalPkgName}`, {cwd: electronPath}, true);
      }
    }

    logger.log("build...");

    await electronBuilder.build({
      targets: electronBuilder.Platform.WINDOWS.createTarget(),
      config: {
        appId: pkgConf.builder.electron.appId,
        productName: npmConfig.description,
        // asar: false,
        win: {
          target: "nsis"
        },
        nsis: {},
        directories: {
          app: electronPath,
          output: electronDistPath
        },
        ...pkgConf.builder.electron.installerIcon !== undefined ? {
          icon: path.resolve(pkgPath, "src", pkgConf.builder.electron.installerIcon)
        } : {},
        removePackageScripts: false
      }
    });

    await FsUtil.copyAsync(
      path.resolve(electronDistPath, `${npmConfig.description} Setup ${npmConfig.version}.exe`),
      path.resolve(pkgPath, `dist/electron/${npmConfig.description}-dev.exe`)
    );
  }
}