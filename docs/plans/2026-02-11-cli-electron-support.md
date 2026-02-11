# CLI Electron Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `packages/cli`에 Electron 빌드/실행 지원을 추가하여 Windows용 데스크탑 앱을 빌드하고 개발 모드로 실행할 수 있게 한다.

**Architecture:** Capacitor 클래스 패턴을 따라 `Electron` 클래스를 `packages/cli/src/electron/electron.ts`에 생성한다. esbuild로 `electron-main.ts`를 번들링하고, electron-builder로 Windows 인스톨러를 생성한다. 기존 `build`/`device` 명령어에 config 기반 분기를 추가한다.

**Tech Stack:** TypeScript, esbuild, electron-builder (npx), Node.js builtins

**Worktree:** `.worktrees/cli-electron-support`

**Base path:** All file paths below are relative to the worktree root.

**Design document:** `docs/plans/2026-02-11-cli-electron-support-design.md`

---

## Task 1: Add SdElectronConfig type and electron field

**Files:**
- Modify: `packages/cli/src/sd-config.types.ts`

**Step 1: Add SdElectronConfig interface**

`SdCapacitorConfig` 인터페이스 바로 아래(136행 뒤)에 추가:

```typescript
/**
 * Electron 설정
 */
export interface SdElectronConfig {
  /** Electron 앱 ID (예: "com.example.myapp") */
  appId: string;
  /** portable .exe (true) 또는 NSIS 인스톨러 (false/미지정) */
  portable?: boolean;
  /** 인스톨러 아이콘 경로 (.ico, 패키지 디렉토리 기준 상대경로) */
  installerIcon?: string;
  /** Electron에 포함할 npm 패키지 (native 모듈 등) */
  reinstallDependencies?: string[];
  /** npm postinstall 스크립트 */
  postInstallScript?: string;
  /** NSIS 옵션 (portable이 아닌 경우) */
  nsisOptions?: Record<string, unknown>;
  /** 환경변수 (electron-main.ts에서 process.env로 접근) */
  env?: Record<string, string>;
}
```

**Step 2: Add electron field to SdClientPackageConfig**

`SdClientPackageConfig`에 `electron?` 필드 추가 (기존 `capacitor?` 뒤에):

```typescript
export interface SdClientPackageConfig {
  target: "client";
  server: string | number;
  env?: Record<string, string>;
  publish?: SdPublishConfig;
  capacitor?: SdCapacitorConfig;
  /** Electron 설정 */
  electron?: SdElectronConfig;
}
```

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 4: Commit**

```
feat(cli): add SdElectronConfig type to sd-config.types
```

---

## Task 2: Create Electron class — structure and initialize()

**Files:**
- Create: `packages/cli/src/electron/electron.ts`

**Step 1: Create the Electron class with create() and initialize()**

Capacitor 클래스 패턴을 따른다. `packages/cli/src/capacitor/capacitor.ts`를 참조 패턴으로 사용한다.

```typescript
import path from "path";
import module from "module";
import { fsExists, fsMkdir, fsReadJson, fsWriteJson } from "@simplysm/core-node";
import { consola } from "consola";
import type { SdElectronConfig } from "../sd-config.types";
import { spawn } from "../utils/spawn";

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
  private async _exec(cmd: string, args: string[], cwd: string, env?: Record<string, string>): Promise<string> {
    Electron._logger.debug(`실행 명령: ${cmd} ${args.join(" ")}`);
    const result = await spawn(cmd, args, { cwd, env });
    Electron._logger.debug(`실행 결과: ${result}`);
    return result;
  }

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

  // build()와 run()은 Task 3, Task 4에서 구현
}
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 3: Commit**

```
feat(cli): add Electron class with create() and initialize()
```

---

## Task 3: Add Electron.build() method

**Files:**
- Modify: `packages/cli/src/electron/electron.ts`

**Step 1: Add build() method**

`initialize()` 메서드 뒤에 추가:

```typescript
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

    await this._exec("npx", ["electron-builder", "--win", "--config", configFilePath], this._pkgPath);
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
```

파일 상단에 import 추가:

```typescript
import os from "os";
import fs from "fs";
import { fsExists, fsMkdir, fsCopy, fsReaddir, fsReadJson, fsWriteJson } from "@simplysm/core-node";
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 3: Commit**

```
feat(cli): add Electron.build() for Windows installer generation
```

---

## Task 4: Add Electron.run() method

**Files:**
- Modify: `packages/cli/src/electron/electron.ts`

**Step 1: Add run() method**

`build()` 메서드 뒤에 추가:

```typescript
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
```

**Step 2: Verify typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 3: Commit**

```
feat(cli): add Electron.run() for dev mode execution
```

---

## Task 5: Integrate Electron into build command

**Files:**
- Modify: `packages/cli/src/commands/build.ts`

**Step 1: Add "electron" to BuildResult.type**

37행의 `type` 유니온에 `"electron"` 추가:

```typescript
interface BuildResult {
  name: string;
  target: string;
  type: "js" | "dts" | "vite" | "capacitor" | "electron";
  success: boolean;
  errors?: string[];
  diagnostics?: ts.Diagnostic[];
}
```

**Step 2: Add Electron import**

파일 상단의 import 영역에 추가:

```typescript
import { Electron } from "../electron/electron";
```

**Step 3: Add Electron build after Capacitor build**

`commands/build.ts`에서 client 패키지 빌드 루프 내부, Capacitor 빌드 블록(319-342행) 뒤에 Electron 빌드 추가:

```typescript
                // Electron 빌드 (설정이 있는 경우만)
                if (config.electron != null) {
                  const outPath = path.join(pkgDir, "dist");
                  try {
                    const electron = await Electron.create(pkgDir, config.electron);
                    await electron.initialize();
                    await electron.build(outPath);
                    results.push({
                      name,
                      target: "client",
                      type: "electron",
                      success: true,
                    });
                  } catch (err) {
                    results.push({
                      name,
                      target: "client",
                      type: "electron",
                      success: false,
                      errors: [err instanceof Error ? err.message : String(err)],
                    });
                    state.hasError = true;
                  }
                }
```

**Step 4: Verify typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 5: Commit**

```
feat(cli): integrate Electron build into build command
```

---

## Task 6: Integrate Electron into device command

**Files:**
- Modify: `packages/cli/src/commands/device.ts`

**Step 1: Add Electron import**

파일 상단에 추가:

```typescript
import { Electron } from "../electron/electron";
```

**Step 2: Refactor device command for electron/capacitor branching**

현재 device.ts의 69-120행을 아래와 같이 교체한다. 핵심 변경:
- capacitor만 확인하던 로직을 electron/capacitor 분기로 변경
- URL 패턴을 플랫폼별로 분리 (electron은 `/capacitor/` 경로 불필요)

전체 `runDevice` 함수를 아래로 교체:

```typescript
export async function runDevice(options: DeviceOptions): Promise<void> {
  const { package: packageName, url } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:device");

  logger.debug("device 시작", { package: packageName, url });

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: true, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // 패키지 설정 확인
  const pkgConfig = sdConfig.packages[packageName];
  if (pkgConfig == null) {
    consola.error(`패키지를 찾을 수 없습니다: ${packageName}`);
    process.exitCode = 1;
    return;
  }

  if (pkgConfig.target !== "client") {
    consola.error(`client 타겟 패키지만 지원합니다: ${packageName} (현재: ${pkgConfig.target})`);
    process.exitCode = 1;
    return;
  }

  const clientConfig: SdClientPackageConfig = pkgConfig;
  const pkgDir = path.join(cwd, "packages", packageName);

  if (clientConfig.electron != null) {
    // Electron 개발 실행
    let serverUrl = url;
    if (serverUrl == null) {
      if (typeof clientConfig.server === "number") {
        serverUrl = `http://localhost:${clientConfig.server}/${packageName}/`;
      } else {
        consola.error(`--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`);
        process.exitCode = 1;
        return;
      }
    }

    logger.debug("개발 서버 URL", { serverUrl });

    const listr = new Listr([
      {
        title: `${packageName} (electron)`,
        task: async () => {
          const electron = await Electron.create(pkgDir, clientConfig.electron!);
          await electron.run(serverUrl);
        },
      },
    ]);

    try {
      await listr.run();
      logger.info("Electron 실행 완료");
    } catch (err) {
      consola.error(`Electron 실행 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  } else if (clientConfig.capacitor != null) {
    // Capacitor 디바이스 실행 (기존 로직)
    let serverUrl = url;
    if (serverUrl == null) {
      if (typeof clientConfig.server === "number") {
        serverUrl = `http://localhost:${clientConfig.server}/${packageName}/capacitor/`;
      } else {
        consola.error(`--url 옵션이 필요합니다. server가 패키지명으로 설정되어 있습니다: ${clientConfig.server}`);
        process.exitCode = 1;
        return;
      }
    } else if (!serverUrl.endsWith("/")) {
      serverUrl = `${serverUrl}/${packageName}/capacitor/`;
    }

    logger.debug("개발 서버 URL", { serverUrl });

    const capPath = path.join(pkgDir, ".capacitor");
    if (!(await fsExists(capPath))) {
      consola.error(`Capacitor 프로젝트가 초기화되지 않았습니다. 먼저 'pnpm watch ${packageName}'를 실행하세요.`);
      process.exitCode = 1;
      return;
    }

    const listr = new Listr([
      {
        title: `${packageName} (device)`,
        task: async () => {
          const cap = await Capacitor.create(pkgDir, clientConfig.capacitor!);
          await cap.runOnDevice(serverUrl);
        },
      },
    ]);

    try {
      await listr.run();
      logger.info("디바이스 실행 완료");
    } catch (err) {
      consola.error(`디바이스 실행 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  } else {
    consola.error(`electron 또는 capacitor 설정이 없습니다: ${packageName}`);
    process.exitCode = 1;
  }
}
```

**Step 3: Verify typecheck**

Run: `pnpm typecheck packages/cli`
Expected: PASS

**Step 4: Commit**

```
feat(cli): integrate Electron into device command
```

---

## Task 7: Update index.ts exports

**Files:**
- Modify: `packages/cli/src/index.ts`

**Step 1: Add Electron export**

`index.ts` 끝에 추가:

```typescript
export { Electron } from "./electron/electron";
```

`SdElectronConfig`는 이미 `export * from "./sd-config.types"`에 의해 export 된다.

**Step 2: Verify typecheck and lint**

Run: `pnpm typecheck packages/cli && pnpm lint packages/cli`
Expected: PASS

**Step 3: Commit**

```
feat(cli): export Electron class from package index
```

---

## Task 8: Final verification

**Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: PASS (전체 프로젝트)

**Step 2: Full lint**

Run: `pnpm lint packages/cli`
Expected: PASS

**Step 3: Verify all files changed**

확인할 파일 목록:
- `packages/cli/src/sd-config.types.ts` — `SdElectronConfig` 타입, `SdClientPackageConfig.electron` 필드
- `packages/cli/src/electron/electron.ts` — Electron 클래스 (신규)
- `packages/cli/src/commands/build.ts` — `"electron"` result type, Electron 빌드 통합
- `packages/cli/src/commands/device.ts` — electron/capacitor 분기
- `packages/cli/src/index.ts` — Electron export
