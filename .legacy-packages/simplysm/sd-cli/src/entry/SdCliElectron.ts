import { FsUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import fs from "fs";
import os from "os";
import path from "path";
import type { ISdClientBuilderElectronConfig } from "../types/config/ISdProjectConfig";
import { loadProjConfAsync } from "../utils/loadProjConfAsync";
import type electronBuilder from "electron-builder";
import type { INpmConfig } from "../types/common-config/INpmConfig";

export class SdCliElectron {
  private static readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliElectron"]);

  static async runAsync(opt: { package: string; config: string; options?: string[] }) {
    this._logger.log("설정 가져오기...");
    const { pkgPath, electronPath, electronConfig } = await this._loadDevConfig(opt);

    this._logger.log("준비...");
    await this._prepareAsync({ pkgPath, electronPath, electronConfig });

    this._logger.log("실행...");
    await SdProcess.spawnAsync("npx", ["electron", "."], { cwd: electronPath, showMessage: true });
  }

  static async buildForDevAsync(opt: { package: string; config: string; options?: string[] }) {
    this._logger.log("설정 가져오기...");
    const { pkgPath, electronPath, electronConfig } = await this._loadDevConfig(opt);

    this._logger.log("준비...");
    const { npmConfig } = await this._prepareAsync({ pkgPath, electronPath, electronConfig });

    this._logger.log("빌드...");
    const electronDistPath = path.resolve(pkgPath, ".electron/dist");
    await this._buildAsync({ pkgPath, electronPath, electronDistPath, npmConfig, electronConfig });
  }

  static async buildAsync(opt: {
    pkgPath: string;
    electronConfig: ISdClientBuilderElectronConfig;
  }) {
    this._logger.log("준비...");
    const electronPath = path.resolve(opt.pkgPath, ".electron/src");
    const { npmConfig } = await this._prepareAsync({ ...opt, electronPath });

    this._logger.log("빌드...");
    const electronDistPath = path.resolve(opt.pkgPath, ".electron/dist");
    await this._buildAsync({
      pkgPath: opt.pkgPath,
      electronPath,
      electronDistPath,
      npmConfig,
      electronConfig: opt.electronConfig,
    });
  }

  private static async _loadDevConfig(opt: {
    package: string;
    config: string;
    options?: string[];
  }) {
    const projConf = await loadProjConfAsync(process.cwd(), true, opt);
    const pkgConf = projConf.packages[opt.package];
    if (pkgConf?.type !== "client" || pkgConf.builder?.electron === undefined) {
      throw new Error();
    }
    const pkgPath = path.resolve(process.cwd(), `packages/${opt.package}`);
    const electronPath = path.resolve(pkgPath, "dist/electron");

    return {
      pkgPath,
      electronPath,
      electronConfig: pkgConf.builder.electron,
    };
  }

  private static async _prepareAsync(opt: {
    pkgPath: string;
    electronPath: string;
    electronConfig: ISdClientBuilderElectronConfig;
  }) {
    const npmConfig = FsUtils.readJson(path.resolve(opt.pkgPath, `package.json`)) as INpmConfig;

    const reinstallPkgNames = opt.electronConfig.reinstallDependencies ?? [];

    FsUtils.writeJson(path.resolve(opt.electronPath, `package.json`), {
      name: npmConfig.name.replace(/^@/, "").replace(/\//, "-"),
      version: npmConfig.version,
      description: npmConfig.description,
      main: "electron-main.js",
      ...(opt.electronConfig.postInstallScript !== undefined
        ? {
            scripts: {
              postinstall: opt.electronConfig.postInstallScript,
            },
          }
        : {}),
      dependencies: reinstallPkgNames.toObject(
        (item) => item,
        (item) => npmConfig.dependencies![item],
      ),
    });

    await SdProcess.spawnAsync("npm", ["install"], { cwd: opt.electronPath, showMessage: true });

    await SdProcess.spawnAsync("npx", ["electron-rebuild"], {
      cwd: opt.electronPath,
      showMessage: true,
    });

    return { npmConfig };
  }

  private static async _buildAsync(opt: {
    pkgPath: string;
    electronPath: string;
    electronDistPath: string;
    npmConfig: INpmConfig;
    electronConfig: ISdClientBuilderElectronConfig;
  }) {
    if (!this._canCreateSymlink()) {
      throw new Error(
        "'Electron 빌드'를 위해서는 'Symlink 생성' 권한이 필요합니다. 윈도우의 개발자모드를 활성화하세요.",
      );
    }

    const electronConfig: electronBuilder.Configuration = {
      appId: opt.electronConfig.appId,
      productName: opt.npmConfig.description,
      asar: false,
      win: {
        target: opt.electronConfig.portable ? "portable" : "nsis",
      },
      nsis: opt.electronConfig.nsisOptions ?? {},
      directories: {
        app: opt.electronPath,
        output: opt.electronDistPath,
      },
      ...(opt.electronConfig.installerIcon !== undefined
        ? {
            icon: path.resolve(opt.pkgPath, opt.electronConfig.installerIcon),
          }
        : {}),
      removePackageScripts: false,
      npmRebuild: false,
      forceCodeSigning: false,
    };

    const configFilePath = path.resolve(opt.pkgPath, ".electron/builder-config.json");
    FsUtils.writeJson(configFilePath, electronConfig);
    await SdProcess.spawnAsync("npx", ["electron-builder", "--win", "--config", configFilePath]);

    FsUtils.copy(
      path.resolve(
        opt.electronDistPath,
        `${opt.npmConfig.description} ${opt.electronConfig.portable ? "" : "Setup "}${opt.npmConfig.version}.exe`,
      ),
      path.resolve(
        opt.pkgPath,
        `dist/electron/${opt.npmConfig.description}${opt.electronConfig.portable ? "-portable" : ""}-latest.exe`,
      ),
    );

    FsUtils.copy(
      path.resolve(
        opt.electronDistPath,
        `${opt.npmConfig.description} ${opt.electronConfig.portable ? "" : "Setup "}${opt.npmConfig.version}.exe`,
      ),
      path.resolve(opt.pkgPath, `dist/electron/updates/${opt.npmConfig.version}.exe`),
    );
  }

  private static _canCreateSymlink() {
    const tmpDir = os.tmpdir();
    const testTarget = path.join(tmpDir, "symlink-test-target.txt");
    const testLink = path.join(tmpDir, "symlink-test-link.txt");

    try {
      // 대상 파일 생성
      fs.writeFileSync(testTarget, "test");

      // symlink 시도
      fs.symlinkSync(testTarget, testLink, "file");

      // symlink 성공 여부 확인
      const isSymlink = fs.lstatSync(testLink).isSymbolicLink();

      // 정리
      fs.unlinkSync(testLink);
      fs.unlinkSync(testTarget);

      return isSymlink;
    } catch {
      return false;
    }
  }
}
