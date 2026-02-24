import path from "path";
import os from "os";
import fs from "fs";
import module from "module";
import { fsExists, fsMkdir, fsCopy, fsReaddir, fsReadJson, fsWriteJson } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdElectronConfig } from "../sd-config.types";
import { execa } from "execa";

/**
 * package.json 타입
 */
interface NpmConfig {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
}

/**
 * Electron 프로젝트 관리 클래스
 *
 * - Electron 프로젝트 초기화 (package.json 생성, 의존성 설치, native 모듈 재빌드)
 * - Windows 실행 파일 빌드 (electron-builder)
 * - 개발 모드 실행 (Vite dev server URL 로드)
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
   * Electron 인스턴스 생성 (설정 검증 포함)
   */
  static async create(pkgPath: string, config: SdElectronConfig): Promise<Electron> {
    Electron._validateConfig(config);

    const npmConfig = await fsReadJson<NpmConfig>(path.resolve(pkgPath, "package.json"));
    return new Electron(pkgPath, config, npmConfig);
  }

  /**
   * 설정 검증
   */
  private static _validateConfig(config: SdElectronConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new Error("electron.appId는 필수입니다.");
    }
  }

  /**
   * 명령어 실행 (로깅 포함)
   */
  private async _exec(
    cmd: string,
    args: string[],
    cwd: string,
    env?: Record<string, string>,
  ): Promise<string> {
    Electron._logger.debug(`실행 명령: ${cmd} ${args.join(" ")}`);
    const { stdout: result } = await execa(cmd, args, { cwd, env: { ...process.env, ...env } });
    Electron._logger.debug(`실행 결과: ${result}`);
    return result;
  }

  //#region Public Methods

  /**
   * Electron 프로젝트 초기화
   *
   * 1. .electron/src/package.json 생성
   * 2. npm install 실행
   * 3. electron-rebuild 실행 (native 모듈 재빌드)
   */
  async initialize(): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    // 1. package.json 생성
    await this._setupPackageJson(srcPath);

    // 2. npm install
    await this._exec("npm", ["install"], srcPath);

    // 3. native 모듈 재빌드
    const reinstallDeps = this._config.reinstallDependencies ?? [];
    if (reinstallDeps.length > 0) {
      await this._exec("npx", ["electron-rebuild"], srcPath);
    }
  }

  /**
   * 프로덕션 빌드
   *
   * 1. esbuild로 electron-main.ts 번들링
   * 2. 웹 에셋 복사
   * 3. electron-builder 설정 생성
   * 4. electron-builder 실행
   * 5. 결과물 복사
   */
  async build(outPath: string): Promise<void> {
    const srcPath = path.resolve(this._electronPath, "src");

    // 1. electron-main.ts 번들링
    await this._bundleMainProcess(srcPath);

    // 2. 웹 에셋 복사 (outPath → .electron/src/)
    await this._copyWebAssets(outPath, srcPath);

    // 3. electron-builder 설정 생성 + 실행
    await this._runElectronBuilder(srcPath);

    // 4. 결과물 복사
    await this._copyBuildOutput(outPath);
  }

  /**
   * 개발 모드 실행
   *
   * 1. esbuild로 electron-main.ts 번들링
   * 2. dist/electron/package.json 생성
   * 3. npx electron . 실행
   */
  async run(url?: string): Promise<void> {
    const electronRunPath = path.resolve(this._pkgPath, "dist/electron");

    // 1. electron-main.ts 번들링
    await this._bundleMainProcess(electronRunPath);

    // 2. package.json 생성
    await fsMkdir(electronRunPath);
    await fsWriteJson(
      path.resolve(electronRunPath, "package.json"),
      { name: this._npmConfig.name, version: this._npmConfig.version, main: "electron-main.js" },
      { space: 2 },
    );

    // 3. Electron 실행
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

  //#region Private - 초기화

  /**
   * .electron/src/package.json 생성
   */
  private async _setupPackageJson(srcPath: string): Promise<void> {
    await fsMkdir(srcPath);

    const reinstallDeps = this._config.reinstallDependencies ?? [];

    // 메인 package.json에서 reinstallDependencies에 해당하는 버전 추출
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

  //#region Private - 번들링

  /**
   * esbuild로 electron-main.ts 번들링
   */
  private async _bundleMainProcess(outDir: string): Promise<void> {
    const esbuild = await import("esbuild");
    const entryPoint = path.resolve(this._pkgPath, "src/electron-main.ts");

    if (!(await fsExists(entryPoint))) {
      throw new Error(`electron-main.ts 파일을 찾을 수 없습니다: ${entryPoint}`);
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

  //#region Private - 빌드

  /**
   * 웹 에셋 복사 (빌드 결과물 → .electron/src/)
   */
  private async _copyWebAssets(outPath: string, srcPath: string): Promise<void> {
    const items = await fsReaddir(outPath);
    for (const item of items) {
      // electron/ 하위는 제외 (자기 자신 복사 방지)
      if (item === "electron") continue;

      const source = path.resolve(outPath, item);
      const dest = path.resolve(srcPath, item);
      await fsCopy(source, dest);
    }
  }

  /**
   * Symlink 생성 가능 여부 확인 (Windows 빌드 요구사항)
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
   * electron-builder 실행
   */
  private async _runElectronBuilder(srcPath: string): Promise<void> {
    if (!Electron._canCreateSymlink()) {
      throw new Error(
        "Electron 빌드를 위해서는 Symlink 생성 권한이 필요합니다. 윈도우의 개발자모드를 활성화하세요.",
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
   * 빌드 결과물 복사 (.electron/dist/ → dist/electron/)
   */
  private async _copyBuildOutput(outPath: string): Promise<void> {
    const distPath = path.resolve(this._electronPath, "dist");
    const electronOutPath = path.resolve(outPath, "electron");
    await fsMkdir(electronOutPath);

    const description = this._npmConfig.description ?? this._npmConfig.name;
    const version = this._npmConfig.version;
    const isPortable = this._config.portable === true;

    // electron-builder 출력 파일명
    const builderFileName = `${description} ${isPortable ? "" : "Setup "}${version}.exe`;
    const sourcePath = path.resolve(distPath, builderFileName);

    if (await fsExists(sourcePath)) {
      // latest 파일 복사
      const latestFileName = `${description}${isPortable ? "-portable" : ""}-latest.exe`;
      await fsCopy(sourcePath, path.resolve(electronOutPath, latestFileName));

      // updates/ 버전별 파일 복사
      const updatesPath = path.resolve(electronOutPath, "updates");
      await fsMkdir(updatesPath);
      await fsCopy(sourcePath, path.resolve(updatesPath, `${version}.exe`));
    } else {
      Electron._logger.warn(`빌드 결과물을 찾을 수 없습니다: ${sourcePath}`);
    }
  }

  //#endregion
}
