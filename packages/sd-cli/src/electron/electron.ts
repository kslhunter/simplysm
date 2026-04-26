import os from "os";
import fs from "fs";
import module from "module";
import { fsx, pathx } from "@simplysm/core-node";
import type { cpx } from "@simplysm/core-node";
import { consola, LogLevels } from "consola";
import { createLazyLogger } from "../runtime/lazy-logger";
import { shellSpawn } from "../utils/shell-spawn";
import type { NpmConfig, SdElectronConfig } from "../sd-config.types.js";
import { createEnvBanner } from "../esbuild/esbuild-config.js";

export class Electron {
  private static readonly _logger = createLazyLogger("sd:cli:electron");

  private readonly _electronPath: string;
  private readonly _srcPath: string;

  private constructor(
    private readonly _pkgPath: string,
    private readonly _config: SdElectronConfig,
    private readonly _npmConfig: NpmConfig,
    private readonly _exclude: string[],
  ) {
    this._electronPath = pathx.posixResolve(this._pkgPath, ".electron");
    this._srcPath = pathx.posixResolve(this._electronPath, "src");
  }

  static async create(
    pkgPath: string,
    config: SdElectronConfig,
    exclude?: string[],
  ): Promise<Electron> {
    Electron._validateConfig(config);

    const npmConfig = await fsx.readJson<NpmConfig>(pathx.posixResolve(pkgPath, "package.json"));
    return new Electron(pkgPath, config, npmConfig, exclude ?? []);
  }

  private static _validateConfig(config: SdElectronConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new Error("electron.appId is required.");
    }
  }

  private async _exec(
    cmd: string,
    args: string[],
    cwd: string,
    env?: Record<string, string>,
  ): Promise<string> {
    Electron._logger.debug(`실행: ${cmd} ${args.join(" ")}`);
    const isDebug = consola.level >= LogLevels.debug;
    const { stdout: result } = await shellSpawn(cmd, args, {
      cwd,
      env,
      ...(isDebug ? { stdio: "inherit" } : {}),
    });
    Electron._logger.debug(`결과: ${result}`);
    return result;
  }

  //#region Public Methods

  async initialize(): Promise<void> {
    Electron._logger.start("initialize 중...");

    Electron._logger.debug("package.json 설정 시작");
    await this._setupNpmConf();
    Electron._logger.debug("package.json 설정 완료");

    // pnpm-workspace.yaml 생성 (상위 workspace 탐색 차단)
    const workspaceYamlPath = pathx.posixResolve(this._srcPath, "pnpm-workspace.yaml");
    if (!(await fsx.exists(workspaceYamlPath))) {
      await fsx.write(workspaceYamlPath, "");
    }

    Electron._logger.debug("pnpm install 시작");
    await this._exec("pnpm", ["install"], this._srcPath);
    await this._exec("pnpm", ["approve-builds", "--all"], this._srcPath);
    Electron._logger.debug("pnpm install 완료");

    const reinstallDeps = this._config.reinstallDependencies ?? [];
    if (reinstallDeps.length > 0) {
      Electron._logger.debug(`electron-rebuild 시작 (${reinstallDeps.join(", ")})`);
      await this._exec("pnpm", ["exec", "electron-rebuild"], this._srcPath);
      Electron._logger.debug("electron-rebuild 완료");
    }
    Electron._logger.success("initialize 완료");
  }

  async run(url: string): Promise<void> {
    Electron._logger.start(`run 중... (url: ${url})`);

    await this.initialize();
    await this._copyPublicAssets();

    const esbuild = await import("esbuild");
    const baseOptions = await this._createBaseEsbuildOptions({ ELECTRON_DEV_URL: url });

    let currentElectron: cpx.SpawnProcess | null = null;
    let isRestarting = false;
    let resolveTermination: (() => void | Promise<void>) | null = null;

    const spawnElectron = () => {
      Electron._logger.debug("Electron 프로세스 시작");
      currentElectron = shellSpawn("pnpm", ["exec", "electron", "."], {
        cwd: this._srcPath,
        stdio: "inherit",
        reject: false,
      });

      void currentElectron.then(() => {
        currentElectron = null;
        if (!isRestarting && resolveTermination != null) {
          Electron._logger.info("Electron이 종료되었습니다.");
          void resolveTermination();
        }
      });
    };

    Electron._logger.debug("esbuild context 생성 시작");
    const ctx = await esbuild.context({
      ...baseOptions,
      plugins: [
        {
          name: "electron-restart",
          setup: (build) => {
            build.onEnd(async (result) => {
              if (result.errors.length > 0) {
                Electron._logger.error("번들링 실패. Electron을 재시작하지 않습니다.");
                return;
              }

              Electron._logger.debug("esbuild 번들링 완료");

              if (currentElectron != null) {
                isRestarting = true;
                Electron._logger.debug("기존 Electron 프로세스 종료 시작");
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
    Electron._logger.debug("esbuild context 생성 완료");

    Electron._logger.debug("esbuild watch 시작");
    await ctx.watch();
    Electron._logger.debug("esbuild watch 시작 완료, 종료 대기 중");

    await new Promise<void>((resolve) => {
      let disposed = false;

      const cleanup = async () => {
        if (disposed) return;
        disposed = true;
        Electron._logger.debug("cleanup 시작");
        process.removeListener("SIGINT", signalHandler);
        process.removeListener("SIGTERM", signalHandler);
        await ctx.dispose();
        resolve();
      };

      resolveTermination = cleanup;

      const signalHandler = () => {
        Electron._logger.debug("시그널 수신, Electron 종료 중");
        if (currentElectron != null) currentElectron.kill();
        void cleanup();
      };

      process.once("SIGINT", signalHandler);
      process.once("SIGTERM", signalHandler);
    });
    Electron._logger.success("run 완료");
  }

  async build(outPath: string): Promise<void> {
    Electron._logger.start("build 중...");

    await this.initialize();

    Electron._logger.debug("메인 프로세스 번들링 시작");
    await this._bundleMainProcess();
    Electron._logger.debug("메인 프로세스 번들링 완료");

    Electron._logger.debug("웹 에셋 복사 시작");
    await this._copyWebAssets(outPath);
    Electron._logger.debug("웹 에셋 복사 완료");

    Electron._logger.debug("electron-builder 실행 시작");
    await this._runElectronBuilder();
    Electron._logger.debug("electron-builder 실행 완료");

    Electron._logger.debug("빌드 산출물 복사 시작");
    await this._copyBuildOutput(outPath);
    Electron._logger.debug("빌드 산출물 복사 완료");

    Electron._logger.success("build 완료");
  }

  //#endregion

  //#region Private - Initialization

  private async _setupNpmConf(): Promise<void> {
    await fsx.mkdir(this._srcPath);

    const mainDeps: Record<string, string | undefined> = {
      ...this._npmConfig.dependencies,
      ...this._npmConfig.devDependencies,
    };

    const reinstallDeps = this._config.reinstallDependencies ?? [];

    const dependencies: Record<string, string> = {};
    for (const dep of reinstallDeps) {
      const version = mainDeps[dep];
      if (version != null) {
        dependencies[dep] = version;
      }
    }

    for (const excludePkg of this._exclude) {
      if (!(excludePkg in dependencies)) {
        const version = mainDeps[excludePkg];
        if (version != null) {
          dependencies[excludePkg] = version;
        }
      }
    }

    const devDependencies: Record<string, string> = {};
    devDependencies["electron"] = "^41";
    devDependencies["@electron/rebuild"] = "^4";
    devDependencies["electron-builder"] = "^26";

    const packageJson: Record<string, unknown> = {
      name: this._npmConfig.name.replace(/^@/, "").replace(/\//, "-"),
      version: this._npmConfig.version,
      description: this._npmConfig.description,
      type: "module",
      main: "electron-main.js",
      dependencies,
      devDependencies,
    };

    if (this._config.postInstallScript != null) {
      packageJson["scripts"] = { postinstall: this._config.postInstallScript };
    }

    await fsx.writeJson(pathx.posixResolve(this._srcPath, "package.json"), packageJson, { space: 2 });
  }

  //#endregion

  //#region Private - Bundling

  /**
   * run()과 _bundleMainProcess()가 공유하는 esbuild 옵션을 생성한다.
   * extraEnv가 주어지면 config.env에 병합한다 (run 모드의 ELECTRON_DEV_URL 등).
   */
  private async _createBaseEsbuildOptions(
    extraEnv?: Record<string, string>,
  ): Promise<import("esbuild").BuildOptions> {
    const entryPoint = pathx.posixResolve(this._pkgPath, "src/electron-main.ts");

    if (!(await fsx.exists(entryPoint))) {
      throw new Error(`electron-main.ts 파일을 찾을 수 없습니다: ${entryPoint}`);
    }

    const builtinModules = module.builtinModules.flatMap((m) => [m, `node:${m}`]);
    const reinstallDeps = this._config.reinstallDependencies ?? [];

    const envBanner = createEnvBanner({ ...this._config.env, ...extraEnv });
    const bannerJs =
      "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" +
      envBanner;

    return {
      entryPoints: [entryPoint],
      outfile: pathx.posixResolve(this._srcPath, "electron-main.js"),
      platform: "node",
      target: "node20",
      format: "esm",
      bundle: true,
      external: ["electron", ...builtinModules, ...reinstallDeps, ...this._exclude],
      banner: { js: bannerJs },
    };
  }

  private async _bundleMainProcess(): Promise<void> {
    const esbuild = await import("esbuild");
    const options = await this._createBaseEsbuildOptions();

    Electron._logger.debug(`esbuild 번들링: ${(options.entryPoints as string[])[0]}`);
    await esbuild.build(options);
  }

  //#endregion

  private async _copyPublicAssets(): Promise<void> {
    const publicPath = pathx.posixResolve(this._pkgPath, "public");
    if (!(await fsx.exists(publicPath))) return;

    const items = await fsx.readdir(publicPath);
    for (const item of items) {
      const source = pathx.posixResolve(publicPath, item);
      const dest = pathx.posixResolve(this._srcPath, item);
      await fsx.copy(source, dest);
    }
  }

  //#region Private - Build

  private async _copyWebAssets(outPath: string): Promise<void> {
    const items = await fsx.readdir(outPath);
    for (const item of items) {
      if (item === "electron") continue;

      const source = pathx.posixResolve(outPath, item);
      const dest = pathx.posixResolve(this._srcPath, item);
      await fsx.copy(source, dest);
    }
  }

  private static _canCreateSymlink(): boolean {
    const tmpDir = os.tmpdir();
    const testTarget = pathx.posixResolve(tmpDir, "sd-electron-symlink-test-target.txt");
    const testLink = pathx.posixResolve(tmpDir, "sd-electron-symlink-test-link.txt");

    try {
      fs.writeFileSync(testTarget, "test");
      fs.symlinkSync(testTarget, testLink, "file");
      return fs.lstatSync(testLink).isSymbolicLink();
    } catch {
      return false;
    } finally {
      try { fs.unlinkSync(testLink); } catch { /* 파일 없으면 무시 */ }
      try { fs.unlinkSync(testTarget); } catch { /* 파일 없으면 무시 */ }
    }
  }

  private async _runElectronBuilder(): Promise<void> {
    if (!Electron._canCreateSymlink()) {
      throw new Error(
        "Symlink 생성 권한이 필요합니다. Windows 개발자 모드를 활성화하세요.",
      );
    }

    const distPath = pathx.posixResolve(this._electronPath, "dist");

    const builderConfig: Record<string, unknown> = {
      appId: this._config.appId,
      productName: this._npmConfig.description ?? this._npmConfig.name,
      asar: false,
      win: {
        target: this._config.portable === true ? "portable" : "nsis",
      },
      nsis: this._config.nsisOptions ?? {},
      directories: {
        app: this._srcPath,
        output: distPath,
      },
      removePackageScripts: false,
      npmRebuild: false,
      forceCodeSigning: false,
    };

    if (this._config.installerIcon != null) {
      builderConfig["icon"] = pathx.posixResolve(this._pkgPath, this._config.installerIcon);
    }

    const configFilePath = pathx.posixResolve(this._electronPath, "builder-config.json");
    await fsx.writeJson(configFilePath, builderConfig, { space: 2 });

    Electron._logger.debug(`electron-builder 설정: ${configFilePath}`);
    await this._exec(
      "pnpm",
      ["exec", "electron-builder", "--win", "--config", configFilePath],
      this._srcPath,
    );
  }

  private async _copyBuildOutput(outPath: string): Promise<void> {
    const distPath = pathx.posixResolve(this._electronPath, "dist");
    const electronOutPath = pathx.posixResolve(outPath, "electron");
    await fsx.mkdir(electronOutPath);

    const rawName = this._npmConfig.description ?? this._npmConfig.name;
    const safeName = rawName.replace(/[<>:"/\\|?*]/g, "");
    const version = this._npmConfig.version;
    const isPortable = this._config.portable === true;

    // exe 파일 동적 탐색 — Setup 또는 portable exe를 우선 선택
    Electron._logger.debug(`빌드 산출물 탐색: ${distPath}`);
    const allExeFiles = await fsx.glob(pathx.posixResolve(distPath, "*.exe"));
    if (allExeFiles.length === 0) {
      Electron._logger.warn(`빌드 산출물(.exe)을 찾을 수 없습니다: ${distPath}`);
      return;
    }
    const keyword = isPortable ? "portable" : "Setup";
    const sourcePath =
      allExeFiles.find((f) => f.toLowerCase().includes(keyword.toLowerCase())) ?? allExeFiles[0];
    Electron._logger.debug(`빌드 산출물: ${sourcePath}`);

    const latestFileName = `${safeName}${isPortable ? "-portable" : ""}-latest.exe`;
    await fsx.copy(sourcePath, pathx.posixResolve(electronOutPath, latestFileName));

    const updatesPath = pathx.posixResolve(electronOutPath, "updates");
    await fsx.mkdir(updatesPath);
    await fsx.copy(sourcePath, pathx.posixResolve(updatesPath, `${version}.exe`));
  }

  //#endregion
}
