import path from "path";
import os from "os";
import fs from "fs";
import module from "module";
import { fsExists, fsMkdir, fsCopy, fsReaddir, fsReadJson, fsWriteJson } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdElectronConfig } from "../sd-config.types";
import { execa } from "execa";

/**
 * package.json type
 */
interface NpmConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
}

/**
 * Electron project management class
 *
 * - Initialize Electron project (create package.json, install dependencies, rebuild native modules)
 * - Build Windows executable (electron-builder)
 * - Run in development mode (load Vite dev server URL)
 */
export class Electron {
  private static readonly _logger = consola.withTag("sd:cli:electron");

  private readonly _electronPath: string;
  private readonly _npmConfig: NpmConfig;

  private constructor(
    private readonly _pkgPath: string,
    private readonly _config: SdElectronConfig,
    npmConfig: NpmConfig,
  ) {
    this._npmConfig = npmConfig;
    this._electronPath = path.resolve(this._pkgPath, ".electron");
  }

  /**
   * Create Electron instance (with configuration validation)
   */
  static async create(pkgPath: string, config: SdElectronConfig): Promise<Electron> {
    Electron._validateConfig(config);

    const npmConfig = await fsReadJson<NpmConfig>(path.resolve(pkgPath, "package.json"));
    return new Electron(pkgPath, config, npmConfig);
  }

  /**
   * Validate configuration
   */
  private static _validateConfig(config: SdElectronConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new Error("electron.appId is required.");
    }
  }

  /**
   * Execute command (with logging)
   */
  private async _exec(
    cmd: string,
    args: string[],
    cwd: string,
    env?: Record<string, string>,
  ): Promise<string> {
    Electron._logger.debug(`executed command: ${cmd} ${args.join(" ")}`);
    const { stdout: result } = await execa(cmd, args, { cwd, env: { ...process.env, ...env } });
    Electron._logger.debug(`execution result: ${result}`);
    return result;
  }

  //#region Public Methods

  /**
   * Initialize Electron project
   *
   * 1. Create .electron/src/package.json
   * 2. Run npm install
   * 3. Run electron-rebuild (rebuild native modules)
   */
  async initialize(): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    // 1. Create package.json
    await this._setupPackageJson(srcPath);

    // 2. npm install
    await this._exec("npm", ["install"], srcPath);

    // 3. Rebuild native modules
    const reinstallDeps = this._config.reinstallDependencies ?? [];
    if (reinstallDeps.length > 0) {
      await this._exec("npx", ["electron-rebuild"], srcPath);
    }
  }

  /**
   * Production build
   *
   * 1. Bundle electron-main.ts with esbuild
   * 2. Copy web assets
   * 3. Create electron-builder configuration
   * 4. Run electron-builder
   * 5. Copy build output
   */
  async build(outPath: string): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    // 1. Bundle electron-main.ts
    await this._bundleMainProcess(srcPath);

    // 2. Copy web assets (outPath → .electron/src/)
    await this._copyWebAssets(outPath, srcPath);

    // 3. Create electron-builder configuration and run
    await this._runElectronBuilder(srcPath);

    // 4. Copy build output
    await this._copyBuildOutput(outPath);
  }

  /**
   * Run in development mode
   *
   * 1. Bundle electron-main.ts with esbuild
   * 2. Create dist/electron/package.json
   * 3. Run npx electron .
   */
  async run(url?: string): Promise<void> {
    const electronRunPath = path.resolve(this._pkgPath, "dist/electron");

    // 1. Bundle electron-main.ts
    await this._bundleMainProcess(electronRunPath);

    // 2. Create package.json
    await fsMkdir(electronRunPath);
    await fsWriteJson(
      path.resolve(electronRunPath, "package.json"),
      { name: this._npmConfig.name, version: this._npmConfig.version, main: "electron-main.js" },
      { space: 2 },
    );

    // 3. Run Electron
    const runEnv: Record<string, string> = {
      NODE_ENV: "development",
      ...this._config.env,
    };

    if (url != null) {
      runEnv["ELECTRON_DEV_URL"] = url;
    }

    await this._exec("npx", ["electron", "."], electronRunPath, runEnv);
  }

  //#endregion

  //#region Private - Initialization

  /**
   * Create .electron/src/package.json
   */
  private async _setupPackageJson(srcPath: string): Promise<void> {
    await fsMkdir(srcPath);

    const reinstallDeps = this._config.reinstallDependencies ?? [];

    // Extract versions from main package.json that match reinstallDependencies
    const dependencies: Record<string, string> = {};
    for (const dep of reinstallDeps) {
      const version = this._npmConfig.dependencies?.[dep];
      if (version != null) {
        dependencies[dep] = version;
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

    await fsWriteJson(path.resolve(srcPath, "package.json"), packageJson, { space: 2 });
  }

  //#endregion

  //#region Private - Bundling

  /**
   * Bundle electron-main.ts with esbuild
   */
  private async _bundleMainProcess(outDir: string): Promise<void> {
    const esbuild = await import("esbuild");
    const entryPoint = path.resolve(this._pkgPath, "src/electron-main.ts");

    if (!(await fsExists(entryPoint))) {
      throw new Error(`electron-main.ts file not found: ${entryPoint}`);
    }

    const builtinModules = module.builtinModules.flatMap((m) => [m, `node:${m}`]);
    const reinstallDeps = this._config.reinstallDependencies ?? [];

    await fsMkdir(outDir);

    await esbuild.build({
      entryPoints: [entryPoint],
      outfile: path.resolve(outDir, "electron-main.js"),
      platform: "node",
      target: "node20",
      format: "cjs",
      bundle: true,
      external: ["electron", ...builtinModules, ...reinstallDeps],
    });
  }

  //#endregion

  //#region Private - Build

  /**
   * Copy web assets (build output → .electron/src/)
   */
  private async _copyWebAssets(outPath: string, srcPath: string): Promise<void> {
    const items = await fsReaddir(outPath);
    for (const item of items) {
      // Exclude electron/ subdirectory (prevent self-copying)
      if (item === "electron") continue;

      const source = path.resolve(outPath, item);
      const dest = path.resolve(srcPath, item);
      await fsCopy(source, dest);
    }
  }

  /**
   * Check if symlink creation is possible (Windows build requirement)
   */
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

  /**
   * Run electron-builder
   */
  private async _runElectronBuilder(srcPath: string): Promise<void> {
    if (!Electron._canCreateSymlink()) {
      throw new Error(
        "Symlink creation permission is required to build Electron. Enable Developer mode on Windows.",
      );
    }

    const distPath = path.resolve(this._electronPath, "dist");

    const builderConfig: Record<string, unknown> = {
      appId: this._config.appId,
      productName: this._npmConfig.description,
      asar: false,
      win: {
        target: this._config.portable ? "portable" : "nsis",
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
    await fsWriteJson(configFilePath, builderConfig, { space: 2 });

    await this._exec(
      "npx",
      ["electron-builder", "--win", "--config", configFilePath],
      this._pkgPath,
    );
  }

  /**
   * Copy build output (.electron/dist/ → dist/electron/)
   */
  private async _copyBuildOutput(outPath: string): Promise<void> {
    const distPath = path.resolve(this._electronPath, "dist");
    const electronOutPath = path.resolve(outPath, "electron");
    await fsMkdir(electronOutPath);

    const description = this._npmConfig.description ?? this._npmConfig.name;
    const version = this._npmConfig.version;
    const isPortable = this._config.portable === true;

    // electron-builder output filename
    const builderFileName = `${description} ${isPortable ? "" : "Setup "}${version}.exe`;
    const sourcePath = path.resolve(distPath, builderFileName);

    if (await fsExists(sourcePath)) {
      // Copy latest file
      const latestFileName = `${description}${isPortable ? "-portable" : ""}-latest.exe`;
      await fsCopy(sourcePath, path.resolve(electronOutPath, latestFileName));

      // Copy per-version file to updates/
      const updatesPath = path.resolve(electronOutPath, "updates");
      await fsMkdir(updatesPath);
      await fsCopy(sourcePath, path.resolve(updatesPath, `${version}.exe`));
    } else {
      Electron._logger.warn(`build output not found: ${sourcePath}`);
    }
  }

  //#endregion
}
