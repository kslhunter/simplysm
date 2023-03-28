import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import { INpmConfig, ISdCliClientPackageConfig } from "../commons";
import path from "path";
import { SdCliConfigUtil } from "../utils/SdCliConfigUtil";
import ts from "typescript";

export class SdCliElectron {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string) {
  }

  public async runWebviewOnDeviceAsync(pkgName: string, url: string, opt: { confFileRelPath: string; optNames: string[] }): Promise<void> {
    this._logger.debug("프로젝트 설정 가져오기...");
    const config = await SdCliConfigUtil.loadConfigAsync(path.resolve(this._rootPath, opt.confFileRelPath), true, opt.optNames);
    const pkgConfig = config.packages[pkgName] as ISdCliClientPackageConfig | undefined;
    if (!pkgConfig) throw new Error("패키지 설정을 찾을 수 없습니다.");

    const electronConfig = pkgConfig.builder?.electron;
    if (!electronConfig) throw new Error("ELECTRON 설정을 찾을 수 없습니다.");

    const pkgRootPath = path.resolve(this._rootPath, `packages/${pkgName}`);
    const electronSrcPath = path.resolve(pkgRootPath, `.cache/electron/src`);

    await FsUtil.removeAsync(electronSrcPath);

    const npmConfig = (await FsUtil.readJsonAsync(path.resolve(pkgRootPath, `package.json`))) as INpmConfig;
    const electronVersion = npmConfig.dependencies?.["electron"];
    if (electronVersion === undefined) {
      throw new Error("ELECTRON 빌드 패키지의 'dependencies'에는 'electron'이 반드시 포함되어야 합니다.");
    }

    const dotenvVersion = npmConfig.dependencies?.["dotenv"];
    if (dotenvVersion === undefined) {
      throw new Error("ELECTRON 빌드 패키지의 'dependencies'에는 'dotenv'가 반드시 포함되어야 합니다.");
    }

    // const remoteVersion = npmConfig.dependencies?.["@electron/remote"];

    await FsUtil.writeJsonAsync(path.resolve(electronSrcPath, `package.json`), {
      name: npmConfig.name,
      version: npmConfig.version,
      description: npmConfig.description,
      main: "electron.js",
      author: npmConfig.author,
      license: npmConfig.license/*,
      devDependencies: {
        "electron": electronVersion.replace("^", "")
      },
      dependencies: {
        "dotenv": dotenvVersion,
        ...remoteVersion !== undefined ? {
          "@electron/remote": remoteVersion
        } : {}
      }*/
    });

    // await FsUtil.copyAsync(path.resolve(pkgRootPath, "dist", "electron"), path.resolve(electronSrcPath));

    if (FsUtil.exists(path.resolve(pkgRootPath, "src/favicon.ico"))) {
      await FsUtil.copyAsync(path.resolve(pkgRootPath, "src/favicon.ico"), path.resolve(electronSrcPath, "favicon.ico"));
    }
    if (FsUtil.exists(path.resolve(pkgRootPath, "src/assets"))) {
      await FsUtil.copyAsync(path.resolve(pkgRootPath, "src/assets"), path.resolve(electronSrcPath, "assets"));
    }

    await FsUtil.writeFileAsync(path.resolve(electronSrcPath, `.env`), [
      "NODE_ENV=development",
      `SD_TITLE=${npmConfig.description}`,
      `SD_VERSION=${npmConfig.version}`,
      `SD_ELECTRON_DEV_URL=${url.replace(/\/$/, "")}/${pkgName}/electron/`,
      (electronConfig.icon !== undefined) ? `SD_ELECTRON_ICON=${electronConfig.icon}` : `SD_ELECTRON_ICON=favicon.ico`,
      ...(pkgConfig.env !== undefined) ? Object.keys(pkgConfig.env).map((key) => `${key}=${pkgConfig.env![key]}`) : [],
      ...(electronConfig.env !== undefined) ? Object.keys(electronConfig.env).map((key) => `${key}=${electronConfig.env![key]}`) : [],
    ].filterExists().join("\n"));

    const electronTsFileContent = await FsUtil.readFileAsync(path.resolve(pkgRootPath, `src/electron.ts`));
    const result = ts.transpileModule(electronTsFileContent, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
    await FsUtil.writeFileAsync(path.resolve(electronSrcPath, "electron.js"), result.outputText);

    await SdProcess.spawnAsync("electron-rebuild", { cwd: pkgRootPath }, true);

    await SdProcess.spawnAsync(`electron ${electronSrcPath}`, { cwd: this._rootPath }, true);
  }
}
