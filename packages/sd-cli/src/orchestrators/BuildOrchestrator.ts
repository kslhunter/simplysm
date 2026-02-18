import path from "path";
import ts from "typescript";
import { Worker, type WorkerProxy, fsRm } from "@simplysm/core-node";
import "@simplysm/core-common";
import { consola } from "consola";
import type {
  SdConfig,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { getVersion } from "../utils/build-env";
import { setupReplaceDeps } from "../utils/replace-deps";
import type { TypecheckEnv } from "../utils/tsconfig";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import { runLint, type LintOptions } from "../commands/lint";
import type * as LibraryWorkerModule from "../workers/library.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
import type * as ClientWorkerModule from "../workers/client.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";
import { copySrcFiles } from "../utils/copy-src";

//#region Types

/**
 * Build Orchestrator 옵션
 */
export interface BuildOrchestratorOptions {
  /** 빌드할 패키지 필터 (빈 배열이면 모든 패키지) */
  targets: string[];
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

/**
 * 빌드 결과
 */
interface BuildResult {
  name: string;
  target: string;
  type: "js" | "dts" | "vite" | "capacitor" | "electron";
  success: boolean;
  errors?: string[];
  warnings?: string[];
  diagnostics?: ts.Diagnostic[];
}

/**
 * 패키지 분류 결과
 */
interface ClassifiedPackages {
  /** node/browser/neutral 타겟 (JS + dts) */
  buildPackages: Array<{ name: string; config: SdBuildPackageConfig }>;
  /** client 타겟 (Vite build + typecheck) */
  clientPackages: Array<{ name: string; config: SdClientPackageConfig }>;
  /** server 타겟 (JS 빌드, dts 제외) */
  serverPackages: Array<{ name: string; config: SdServerPackageConfig }>;
}

//#endregion

//#region Utilities

/**
 * 패키지를 타겟별로 분류
 * - node/browser/neutral: buildPackages (JS + dts)
 * - client: clientPackages (Vite build + typecheck)
 * - server: serverPackages (JS 빌드, dts 제외)
 * - scripts: 제외
 */
function classifyPackages(
  packages: Record<
    string,
    | SdBuildPackageConfig
    | SdClientPackageConfig
    | SdServerPackageConfig
    | { target: "scripts" }
    | undefined
  >,
  targets: string[],
): ClassifiedPackages {
  const buildPackages: ClassifiedPackages["buildPackages"] = [];
  const clientPackages: ClassifiedPackages["clientPackages"] = [];
  const serverPackages: ClassifiedPackages["serverPackages"] = [];

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;
    if (config.target === "scripts") continue;

    // targets가 지정되면 해당 패키지만 포함
    if (targets.length > 0 && !targets.includes(name)) continue;

    if (config.target === "client") {
      clientPackages.push({ name, config });
    } else if (config.target === "server") {
      serverPackages.push({ name, config });
    } else {
      buildPackages.push({ name, config });
    }
  }

  return { buildPackages, clientPackages, serverPackages };
}

/**
 * dist 폴더 삭제
 */
async function cleanDistFolders(cwd: string, packageNames: string[]): Promise<void> {
  await Promise.all(packageNames.map((name) => fsRm(path.join(cwd, "packages", name, "dist"))));
}

//#endregion

//#region BuildOrchestrator

/**
 * 프로덕션 빌드를 조율하는 Orchestrator
 *
 * sd.config.ts 기반으로 패키지를 분류하고, 빌드를 실행한다.
 * - lint 실행
 * - dist 폴더 정리 (clean build)
 * - node/browser/neutral 타겟: esbuild JS 빌드 + dts 생성
 * - client 타겟: Vite production 빌드 + typecheck + Capacitor/Electron 빌드
 * - server 타겟: esbuild JS 빌드
 */
export class BuildOrchestrator {
  private readonly _cwd: string;
  private readonly _options: BuildOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:build");

  private _sdConfig: SdConfig | undefined;
  private _classified: ClassifiedPackages | undefined;
  private _allPackageNames: string[] = [];
  private _baseEnv: { VER: string; DEV: string } | undefined;

  constructor(options: BuildOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Orchestrator 초기화
   * - sd.config.ts 로드
   * - replaceDeps 설정
   * - 패키지 분류
   * - 환경변수 준비
   */
  async initialize(): Promise<void> {
    this._logger.debug("빌드 시작", { targets: this._options.targets });

    // sd.config.ts 로드
    try {
      this._sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: false,
        opt: this._options.options,
      });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      this._logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // replaceDeps 설정이 있으면 symlink 교체
    if (this._sdConfig.replaceDeps != null) {
      await setupReplaceDeps(this._cwd, this._sdConfig.replaceDeps);
    }

    // VER, DEV 환경변수 준비
    const version = await getVersion(this._cwd);
    this._baseEnv = { VER: version, DEV: "false" };

    // 패키지 분류
    this._classified = classifyPackages(this._sdConfig.packages, this._options.targets);
    this._allPackageNames = [
      ...this._classified.buildPackages.map((p) => p.name),
      ...this._classified.clientPackages.map((p) => p.name),
      ...this._classified.serverPackages.map((p) => p.name),
    ];

    if (this._allPackageNames.length === 0) {
      process.stdout.write("✔ 빌드할 패키지가 없습니다.\n");
      return;
    }

    this._logger.debug("패키지 분류 완료", {
      buildPackages: this._classified.buildPackages.map((p) => p.name),
      clientPackages: this._classified.clientPackages.map((p) => p.name),
      serverPackages: this._classified.serverPackages.map((p) => p.name),
    });
  }

  /**
   * 빌드 실행
   * - Lint
   * - Clean
   * - Build (concurrent)
   * - 결과 출력
   *
   * @returns 에러 여부 (true: 에러 있음)
   */
  async start(): Promise<boolean> {
    if (this._allPackageNames.length === 0) {
      return false;
    }

    const classified = this._classified!;
    const baseEnv = this._baseEnv!;

    // 결과 수집
    const results: BuildResult[] = [];
    // 에러 추적 (객체로 래핑하여 콜백 내 수정 추적 가능하게 함)
    const state = { hasError: false };

    // Worker 경로
    const libraryWorkerPath = import.meta.resolve("../workers/library.worker");
    const serverWorkerPath = import.meta.resolve("../workers/server.worker");
    const clientWorkerPath = import.meta.resolve("../workers/client.worker");
    const dtsWorkerPath = import.meta.resolve("../workers/dts.worker");

    // 파일 캐시 (diagnostics 출력용)
    const fileCache = new Map<string, string>();

    // formatHost (diagnostics 출력용)
    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => this._cwd,
      getNewLine: () => ts.sys.newLine,
    };

    // Lint 옵션 (전체 패키지 대상)
    const lintOptions: LintOptions = {
      targets: this._allPackageNames.map((name) => `packages/${name}`),
      fix: false,
      timing: false,
    };

    // Phase 1: Lint
    this._logger.start("Lint");
    await runLint(lintOptions);
    // lint 에러가 있으면 process.exitCode가 1로 설정됨
    if (process.exitCode === 1) {
      state.hasError = true;
    }
    this._logger.success("Lint");

    // Phase 2: Clean
    this._logger.start("Clean");
    await cleanDistFolders(this._cwd, this._allPackageNames);
    this._logger.success("Clean");

    // Phase 3: Build (concurrent)
    this._logger.start("Build");

    // 빌드 작업 목록 생성
    const buildTasks: Array<() => Promise<void>> = [];

    // buildPackages: JS 빌드 + dts 생성
    for (const { name, config } of classified.buildPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);
      const env: TypecheckEnv = config.target === "node" ? "node" : "browser";

      buildTasks.push(async () => {
        this._logger.debug(`${name} (${config.target}) 시작`);
        // JS 빌드와 DTS 생성을 병렬 실행
        const libraryWorker: WorkerProxy<typeof LibraryWorkerModule> =
          Worker.create<typeof LibraryWorkerModule>(libraryWorkerPath);
        const dtsWorker: WorkerProxy<typeof DtsWorkerModule> =
          Worker.create<typeof DtsWorkerModule>(dtsWorkerPath);

        try {
          const [buildResult, dtsResult] = await Promise.all([
            // JS 빌드
            libraryWorker.build({ name, config, cwd: this._cwd, pkgDir }),
            // DTS 생성
            dtsWorker.buildDts({ name, cwd: this._cwd, pkgDir, env, emit: true }),
          ]);

          // JS 빌드 결과 처리
          results.push({
            name,
            target: config.target,
            type: "js",
            success: buildResult.success,
            errors: buildResult.errors,
            warnings: buildResult.warnings,
          });
          if (!buildResult.success) state.hasError = true;

          // DTS 결과 처리
          const diagnostics = dtsResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: config.target,
            type: "dts",
            success: dtsResult.success,
            errors: dtsResult.errors,
            diagnostics,
          });
          if (!dtsResult.success) state.hasError = true;
        } finally {
          await Promise.all([libraryWorker.terminate(), dtsWorker.terminate()]);
        }

        // copySrc 파일 복사
        if (config.copySrc != null && config.copySrc.length > 0) {
          await copySrcFiles(pkgDir, config.copySrc);
        }
        this._logger.debug(`${name} (${config.target}) 완료`);
      });
    }

    // clientPackages: Vite 빌드 + typecheck + Capacitor 빌드
    for (const { name, config } of classified.clientPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`${name} (client) 시작`);
        // Vite 빌드와 타입체크를 병렬 실행
        const clientWorker: WorkerProxy<typeof ClientWorkerModule> =
          Worker.create<typeof ClientWorkerModule>(clientWorkerPath);
        const dtsWorker: WorkerProxy<typeof DtsWorkerModule> =
          Worker.create<typeof DtsWorkerModule>(dtsWorkerPath);

        try {
          const clientConfig: SdClientPackageConfig = {
            ...config,
            env: { ...baseEnv, ...config.env },
          };
          const [clientResult, dtsResult] = await Promise.all([
            // Vite production 빌드
            clientWorker.build({ name, config: clientConfig, cwd: this._cwd, pkgDir }),
            // typecheck (dts 없이)
            dtsWorker.buildDts({
              name,
              cwd: this._cwd,
              pkgDir,
              env: "browser",
              emit: false,
            }),
          ]);

          // Vite 빌드 결과 처리
          results.push({
            name,
            target: "client",
            type: "vite",
            success: clientResult.success,
            errors: clientResult.errors,
          });
          if (!clientResult.success) state.hasError = true;

          // 타입체크 결과 처리
          const diagnostics = dtsResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: "client",
            type: "dts",
            success: dtsResult.success,
            errors: dtsResult.errors,
            diagnostics,
          });
          if (!dtsResult.success) state.hasError = true;
        } finally {
          await Promise.all([clientWorker.terminate(), dtsWorker.terminate()]);
        }

        // Capacitor 빌드 (설정이 있는 경우만)
        if (config.capacitor != null) {
          const outPath = path.join(pkgDir, "dist");
          try {
            const cap = await Capacitor.create(pkgDir, config.capacitor);
            await cap.initialize();
            await cap.build(outPath);
            results.push({
              name,
              target: "client",
              type: "capacitor",
              success: true,
            });
          } catch (err) {
            results.push({
              name,
              target: "client",
              type: "capacitor",
              success: false,
              errors: [err instanceof Error ? err.message : String(err)],
            });
            state.hasError = true;
          }
        }

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
        this._logger.debug(`${name} (client) 완료`);
      });
    }

    // serverPackages: JS 빌드만 (dts 생성 제외)
    for (const { name, config } of classified.serverPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`${name} (server) 시작`);
        const serverWorker: WorkerProxy<typeof ServerWorkerModule> =
          Worker.create<typeof ServerWorkerModule>(serverWorkerPath);

        try {
          const buildResult = await serverWorker.build({
            name,
            cwd: this._cwd,
            pkgDir,
            env: { ...baseEnv, ...config.env },
            configs: config.configs,
            externals: config.externals,
            pm2: config.pm2,
            packageManager: config.packageManager,
          });

          results.push({
            name,
            target: "server",
            type: "js",
            success: buildResult.success,
            errors: buildResult.errors,
            warnings: buildResult.warnings,
          });
          if (!buildResult.success) state.hasError = true;
        } finally {
          await serverWorker.terminate();
        }
        this._logger.debug(`${name} (server) 완료`);
      });
    }

    // 모든 빌드를 병렬 실행
    await Promise.allSettled(buildTasks.map((task) => task()));
    this._logger.success("Build");

    // 결과 출력
    const allDiagnostics: ts.Diagnostic[] = [];
    for (const result of results) {
      const typeLabel = result.type === "dts" ? "dts" : result.target;

      // warnings 출력
      if (result.warnings != null) {
        const warnLines: string[] = [`${result.name} (${typeLabel})`];
        for (const warning of result.warnings) {
          for (const line of warning.split("\n")) {
            warnLines.push(`  → ${line}`);
          }
        }
        this._logger.warn(warnLines.join("\n"));
      }

      // errors 출력
      if (!result.success) {
        const errorLines: string[] = [`${result.name} (${typeLabel})`];
        if (result.errors != null) {
          for (const error of result.errors) {
            for (const line of error.split("\n")) {
              errorLines.push(`  → ${line}`);
            }
          }
        }
        this._logger.error(errorLines.join("\n"));
      }
      if (result.diagnostics != null) {
        allDiagnostics.push(...result.diagnostics);
      }
    }

    // diagnostics 출력 (중복 제거)
    if (allDiagnostics.length > 0) {
      const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
      const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
      process.stdout.write(message);
    }

    // 결과 로그 출력
    if (state.hasError) {
      this._logger.error("빌드 실패");
    } else {
      this._logger.info("빌드 완료");
    }

    return state.hasError;
  }

  /**
   * Orchestrator 종료 (현재는 정리할 리소스 없음)
   */
  async shutdown(): Promise<void> {
    // 프로덕션 빌드는 일회성이므로 종료 시 정리할 리소스가 없음
    // Worker는 각 빌드 태스크 내에서 terminate()로 정리됨
    await Promise.resolve();
  }
}

//#endregion
