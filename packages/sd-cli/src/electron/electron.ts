import path from "path";
import os from "os";
import fs from "fs";
import module from "module";
import { cpx, fsx } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdElectronConfig } from "../sd-config.types.js";
import { createEnvBanner } from "../utils/esbuild-config.js";

interface NpmConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
}

export class Electron {
  private static readonly _logger = consola.withTag("sd:cli:electron");

  private readonly _electronPath: string;

  private constructor(
    private readonly _pkgPath: string,
    private readonly _config: SdElectronConfig,
    private readonly _npmConfig: NpmConfig,
    private readonly _exclude: string[],
  ) {
    this._electronPath = path.resolve(this._pkgPath, ".electron");
  }

  static async create(
    pkgPath: string,
    config: SdElectronConfig,
    exclude?: string[],
  ): Promise<Electron> {
    Electron._validateConfig(config);

    const npmConfig = await fsx.readJson<NpmConfig>(path.resolve(pkgPath, "package.json"));
    return new Electron(pkgPath, config, npmConfig, exclude ?? []);
  }

  private static _validateConfig(config: SdElectronConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new Error("electron.appId is required.");
    }
  }

  private _localBin(name: string): string {
    return path.resolve(this._pkgPath, "node_modules/.bin", name);
  }

  private async _exec(
    cmd: string,
    args: string[],
    cwd: string,
    env?: Record<string, string>,
  ): Promise<string> {
    Electron._logger.debug(`실행: ${cmd} ${args.join(" ")}`);
    const { stdout: result } = await cpx.exec(cmd, args, { cwd, env });
    Electron._logger.debug(`결과: ${result}`);
    return result;
  }

  //#region Public Methods

  async initialize(): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    await this._setupPackageJson(srcPath);
    await this._exec("npm", ["install"], srcPath);

    const reinstallDeps = this._config.reinstallDependencies ?? [];
    if (reinstallDeps.length > 0) {
      await this._exec(this._localBin("electron-rebuild"), [], srcPath);
    }
  }

  async run(url: string): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    await this.initialize();

    const esbuild = await import("esbuild");
    const entryPoint = path.resolve(this._pkgPath, "src/electron-main.ts");

    if (!(await fsx.exists(entryPoint))) {
      throw new Error(`electron-main.ts 파일을 찾을 수 없습니다: ${entryPoint}`);
    }

    const builtinModules = module.builtinModules.flatMap((m) => [m, `node:${m}`]);
    const reinstallDeps = this._config.reinstallDependencies ?? [];
    await fsx.mkdir(srcPath);

    let currentElectron: cpx.ExecProcess | null = null;
    let isRestarting = false;
    let resolveTermination: (() => void) | null = null;

    const spawnElectron = () => {
      currentElectron = cpx.exec(this._localBin("electron"), ["."], {
        cwd: srcPath,
        stdio: "inherit",
        reject: false,
      });

      void currentElectron.then(() => {
        currentElectron = null;
        if (!isRestarting && resolveTermination != null) {
          Electron._logger.info("Electron이 종료되었습니다.");
          resolveTermination();
        }
      });
    };

    const envBanner = createEnvBanner({ ELECTRON_DEV_URL: url, ...this._config.env });

    const ctx = await esbuild.context({
      entryPoints: [entryPoint],
      outfile: path.resolve(srcPath, "electron-main.js"),
      platform: "node",
      target: "node20",
      format: "cjs",
      bundle: true,
      external: ["electron", ...builtinModules, ...reinstallDeps, ...this._exclude],
      banner: { js: envBanner },
      plugins: [
        {
          name: "electron-restart",
          setup: (build) => {
            build.onEnd(async (result) => {
              if (result.errors.length > 0) {
                Electron._logger.warn("번들링 실패. Electron을 재시작하지 않습니다.");
                return;
              }

              if (currentElectron != null) {
                isRestarting = true;
                currentElectron.kill();
                try {
                  await currentElectron;
                } catch {
                  // kill 후 에러 무시
                }
                isRestarting = false;
                Electron._logger.info("Electron을 재시작합니다.");
              }

              spawnElectron();
            });
          },
        },
      ],
    });

    await ctx.watch();

    await new Promise<void>((resolve) => {
      let disposed = false;

      const cleanup = () => {
        if (disposed) return;
        disposed = true;
        process.removeListener("SIGINT", signalHandler);
        process.removeListener("SIGTERM", signalHandler);
        void ctx.dispose();
        resolve();
      };

      resolveTermination = cleanup;

      const signalHandler = () => {
        if (currentElectron != null) currentElectron.kill();
        cleanup();
      };

      process.once("SIGINT", signalHandler);
      process.once("SIGTERM", signalHandler);
    });
  }

  async build(outPath: string): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    await this._bundleMainProcess(srcPath);
    await this._copyWebAssets(outPath, srcPath);
    await this._runElectronBuilder(srcPath);
    await this._copyBuildOutput(outPath);
  }

  //#endregion

  //#region Private - Initialization

  private async _setupPackageJson(srcPath: string): Promise<void> {
    await fsx.mkdir(srcPath);

    const reinstallDeps = this._config.reinstallDependencies ?? [];

    const dependencies: Record<string, string> = {};
    for (const dep of reinstallDeps) {
      const version = this._npmConfig.dependencies?.[dep];
      if (version != null) {
        dependencies[dep] = version;
      }
    }

    for (const excludePkg of this._exclude) {
      if (!(excludePkg in dependencies)) {
        const version = this._npmConfig.dependencies?.[excludePkg];
        if (version != null) {
          dependencies[excludePkg] = version;
        }
      }
    }

    const packageJson: Record<string, unknown> = {
      name: this._npmConfig.name.replace(/^@/, "").replace(/\//, "-"),
      version: this._npmConfig.version,
      description: this._npmConfig.description,
      main: "electron-main.js",
      dependencies,
    };

    if (this._config.postInstallScript != null) {
      packageJson["scripts"] = { postinstall: this._config.postInstallScript };
    }

    await fsx.writeJson(path.resolve(srcPath, "package.json"), packageJson, { space: 2 });
  }

  //#endregion

  //#region Private - Bundling

  private async _bundleMainProcess(outDir: string): Promise<void> {
    const esbuild = await import("esbuild");
    const entryPoint = path.resolve(this._pkgPath, "src/electron-main.ts");

    if (!(await fsx.exists(entryPoint))) {
      throw new Error(`electron-main.ts 파일을 찾을 수 없습니다: ${entryPoint}`);
    }

    const builtinModules = module.builtinModules.flatMap((m) => [m, `node:${m}`]);
    const reinstallDeps = this._config.reinstallDependencies ?? [];

    await fsx.mkdir(outDir);

    const envBanner = createEnvBanner(this._config.env);

    await esbuild.build({
      entryPoints: [entryPoint],
      outfile: path.resolve(outDir, "electron-main.js"),
      platform: "node",
      target: "node20",
      format: "cjs",
      bundle: true,
      external: ["electron", ...builtinModules, ...reinstallDeps, ...this._exclude],
      banner: { js: envBanner },
    });
  }

  //#endregion

  //#region Private - Build

  private async _copyWebAssets(outPath: string, srcPath: string): Promise<void> {
    const items = await fsx.readdir(outPath);
    for (const item of items) {
      if (item === "electron") continue;

      const source = path.resolve(outPath, item);
      const dest = path.resolve(srcPath, item);
      await fsx.copy(source, dest);
    }
  }

  private static _canCreateSymlink(): boolean {
    const tmpDir = os.tmpdir();
    const testTarget = path.join(tmpDir, "sd-electron-symlink-test-target.txt");
    const testLink = path.join(tmpDir, "sd-electron-symlink-test-link.txt");

    try {
      fs.writeFileSync(testTarget, "test");
      fs.symlinkSync(testTarget, testLink, "file");
      const isSymlink = fs.lstatSync(testLink).isSymbolicLink();
      fs.unlinkSync(testLink);
      fs.unlinkSync(testTarget);
      return isSymlink;
    } catch {
      return false;
    }
  }

  private async _runElectronBuilder(srcPath: string): Promise<void> {
    if (!Electron._canCreateSymlink()) {
      throw new Error(
        "Symlink 생성 권한이 필요합니다. Windows 개발자 모드를 활성화하세요.",
      );
    }

    const distPath = path.resolve(this._electronPath, "dist");

    const builderConfig: Record<string, unknown> = {
      appId: this._config.appId,
      productName: this._npmConfig.description ?? this._npmConfig.name,
      asar: false,
      win: {
        target: this._config.portable === true ? "portable" : "nsis",
      },
      nsis: this._config.nsisOptions ?? {},
      directories: {
        app: srcPath,
        output: distPath,
      },
      removePackageScripts: false,
      npmRebuild: false,
      forceCodeSigning: false,
    };

    if (this._config.installerIcon != null) {
      builderConfig["icon"] = path.resolve(this._pkgPath, this._config.installerIcon);
    }

    const configFilePath = path.resolve(this._electronPath, "builder-config.json");
    await fsx.writeJson(configFilePath, builderConfig, { space: 2 });

    await this._exec(
      this._localBin("electron-builder"),
      ["--win", "--config", configFilePath],
      this._pkgPath,
    );
  }

  private async _copyBuildOutput(outPath: string): Promise<void> {
    const distPath = path.resolve(this._electronPath, "dist");
    const electronOutPath = path.resolve(outPath, "electron");
    await fsx.mkdir(electronOutPath);

    const rawName = this._npmConfig.description ?? this._npmConfig.name;
    const safeName = rawName.replace(/[<>:"/\\|?*]/g, "");
    const version = this._npmConfig.version;
    const isPortable = this._config.portable === true;

    // exe 파일 동적 탐색 — Setup 또는 portable exe를 우선 선택
    const allExeFiles = await fsx.glob(path.resolve(distPath, "*.exe"));
    if (allExeFiles.length === 0) {
      Electron._logger.warn(`빌드 산출물(.exe)을 찾을 수 없습니다: ${distPath}`);
      return;
    }
    const keyword = isPortable ? "portable" : "Setup";
    const sourcePath =
      allExeFiles.find((f) => f.toLowerCase().includes(keyword.toLowerCase())) ?? allExeFiles[0];

    const latestFileName = `${safeName}${isPortable ? "-portable" : ""}-latest.exe`;
    await fsx.copy(sourcePath, path.resolve(electronOutPath, latestFileName));

    const updatesPath = path.resolve(electronOutPath, "updates");
    await fsx.mkdir(updatesPath);
    await fsx.copy(sourcePath, path.resolve(updatesPath, `${version}.exe`));
  }

  //#endregion
}
