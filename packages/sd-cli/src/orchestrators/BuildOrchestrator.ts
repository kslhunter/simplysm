import path from "path";
import ts from "typescript";
import { fsx } from "@simplysm/core-node";
import { consola } from "consola";
import type {
  SdConfig,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";
import { loadAndValidateConfig } from "../utils/orchestrator-utils";
import { getVersion } from "../utils/build-env";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import { copySrcFiles } from "../utils/copy-src";
import { formatBuildMessages } from "../utils/output-utils";
import { createBuildEngine } from "../engines/index";
import { runWithConcurrency, getMaxConcurrency } from "../utils/concurrency";
import { iteratePackages } from "../utils/package-utils";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";

//#region Types

/**
 * Build Orchestrator options
 */
export interface BuildOrchestratorOptions {
  /** Package filter for build (empty array includes all packages) */
  targets: string[];
  /** Additional options to pass to sd.config.ts */
  options: string[];
}

/**
 * Build result
 */
interface BuildStepResult {
  name: string;
  target: string;
  type: "js" | "dts" | "lint";
  success: boolean;
  errors?: string[];
  warnings?: string[];
  diagnostics?: ts.Diagnostic[];
}

/**
 * Package classification result
 */
interface ClassifiedPackages {
  /** node/browser/neutral target (JS + dts) */
  buildPackages: Array<{ name: string; config: SdBuildPackageConfig }>;
  /** server target (JS build, no dts) */
  serverPackages: Array<{ name: string; config: SdServerPackageConfig }>;
  /** client target (Vite production build, no dts) */
  clientPackages: Array<{ name: string; config: SdClientPackageConfig }>;
}

//#endregion

//#region Utilities

/**
 * Classify packages by target
 * - node/browser/neutral: buildPackages (JS + dts)
 * - server: serverPackages (JS build, no dts)
 * - client: clientPackages (Vite production build, no dts)
 * - scripts: excluded
 */
export function classifyPackages(
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
  const serverPackages: ClassifiedPackages["serverPackages"] = [];
  const clientPackages: ClassifiedPackages["clientPackages"] = [];

  for (const { name, config } of iteratePackages(packages, targets)) {
    if (config.target === "scripts") continue;

    if (config.target === "client") {
      clientPackages.push({ name, config: config });
    } else if (config.target === "server") {
      serverPackages.push({ name, config: config });
    } else {
      buildPackages.push({ name, config: config });
    }
  }

  return { buildPackages, serverPackages, clientPackages };
}

/**
 * Delete dist folders
 */
async function cleanDistFolders(cwd: string, packageNames: string[]): Promise<void> {
  await Promise.all(packageNames.map((name) => fsx.rm(path.join(cwd, "packages", name, "dist"))));
}

//#endregion

//#region BuildOrchestrator

/**
 * Orchestrator for coordinating production builds
 *
 * Classifies packages based on sd.config.ts and executes builds.
 * - Clean dist folders (clean build)
 * - Run lint + build concurrently
 * - node/browser/neutral targets: esbuild JS build + dts generation
 * - server targets: esbuild JS build
 * - client targets: Vite production build
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
   * Initialize Orchestrator
   * - Load sd.config.ts
   * - Configure replaceDeps
   * - Classify packages
   * - Prepare environment variables
   */
  async initialize(): Promise<void> {
    this._logger.debug("빌드 시작", { targets: this._options.targets });

    // sd.config.ts 로드 및 대상 유효성 검사
    try {
      this._sdConfig = await loadAndValidateConfig({
        cwd: this._cwd,
        dev: false,
        options: this._options.options,
        targets: this._options.targets,
      });
      this._logger.debug("sd.config.ts 로드 완료");
    } catch (err) {
      this._logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // 환경변수 준비 (VER, DEV)
    const version = await getVersion(this._cwd);
    this._baseEnv = { VER: version, DEV: "false" };
    this._logger.debug("환경변수 준비 완료", { VER: version, DEV: "false" });

    // 패키지 분류
    this._classified = classifyPackages(this._sdConfig.packages, this._options.targets);
    this._allPackageNames = [
      ...this._classified.buildPackages.map((p) => p.name),
      ...this._classified.serverPackages.map((p) => p.name),
      ...this._classified.clientPackages.map((p) => p.name),
    ];

    if (this._allPackageNames.length === 0) {
      process.stdout.write("✔ 빌드할 패키지가 없습니다.\n");
      return;
    }

    this._logger.debug("패키지 분류 완료", {
      buildPackages: this._classified.buildPackages.map((p) => `${p.name} (${p.config.target})`),
      serverPackages: this._classified.serverPackages.map((p) => p.name),
      clientPackages: this._classified.clientPackages.map((p) => p.name),
    });
  }

  /**
   * Execute build
   * - Clean
   * - Lint + Build (concurrent)
   * - Output results
   *
   * @returns whether errors occurred (true: errors present)
   */
  async start(): Promise<boolean> {
    if (this._allPackageNames.length === 0) {
      return false;
    }

    const classified = this._classified!;
    const baseEnv = this._baseEnv!;

    // Collect results
    const results: BuildStepResult[] = [];
    // Track errors (wrapped in object to allow mutation tracking in callbacks)
    const state = { hasError: false };

    // File cache (for diagnostics output)
    const fileCache = new Map<string, string>();

    // formatHost (for diagnostics output)
    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => this._cwd,
      getNewLine: () => ts.sys.newLine,
    };

    // Phase 1: dist 클린
    this._logger.start(`dist 폴더 정리 중... (${this._allPackageNames.length}개 패키지)`);
    await cleanDistFolders(this._cwd, this._allPackageNames);
    this._logger.success("dist 폴더 정리 완료");

    // Phase 2: 빌드
    const concurrency = getMaxConcurrency();

    // Create list of build tasks
    const buildTasks: Array<() => Promise<void>> = [];

    // buildPackages: JS build + dts generation via BuildEngine
    for (const { name, config } of classified.buildPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`[${name}] (${config.target}) 빌드 시작`);
        const engine = createBuildEngine(
          { name, dir: pkgDir, config },
          { cwd: this._cwd },
        );

        try {
          const engineResult = await engine.run({ js: true, dts: true, lint: true });

          // JS 빌드 결과 처리
          results.push({
            name,
            target: config.target,
            type: "js",
            success: engineResult.js.success,
            errors: engineResult.js.errors.length > 0 ? engineResult.js.errors : undefined,
            warnings: engineResult.js.warnings.length > 0 ? engineResult.js.warnings : undefined,
          });
          if (!engineResult.js.success) state.hasError = true;

          // DTS 결과 처리
          const diagnostics = engineResult.dts.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: config.target,
            type: "dts",
            success: engineResult.dts.success,
            errors: engineResult.dts.errors.length > 0 ? engineResult.dts.errors : undefined,
            diagnostics,
          });
          if (!engineResult.dts.success) state.hasError = true;

          // 린트 결과 처리
          if (engineResult.lint != null) {
            results.push({
              name,
              target: config.target,
              type: "lint",
              success: engineResult.lint.success,
              errors: engineResult.lint.formattedOutput !== "" ? [engineResult.lint.formattedOutput] : undefined,
            });
            if (!engineResult.lint.success) state.hasError = true;
          }

        } finally {
          await engine.stop();
        }

        // copySrc 파일 복사
        if (config.copySrc != null && config.copySrc.length > 0) {
          this._logger.debug(`[${name}] copySrc 파일 복사 중 (${config.copySrc.length}개)`);
          await copySrcFiles(pkgDir, config.copySrc);
        }
        this._logger.debug(`[${name}] (${config.target}) 빌드 완료`);
      });
    }

    // serverPackages: JS build + typecheck via BuildEngine
    for (const { name, config } of classified.serverPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`[${name}] (server) 빌드 시작`);
        const engine = createBuildEngine(
          { name, dir: pkgDir, config: { ...config, env: { ...baseEnv, ...config.env } } },
          { cwd: this._cwd },
        );

        try {
          const engineResult = await engine.run({ js: true, dts: false, lint: true });

          // JS 빌드 결과 처리
          results.push({
            name,
            target: "server",
            type: "js",
            success: engineResult.js.success,
            errors: engineResult.js.errors.length > 0 ? engineResult.js.errors : undefined,
            warnings: engineResult.js.warnings.length > 0 ? engineResult.js.warnings : undefined,
          });
          if (!engineResult.js.success) state.hasError = true;

          // DTS/타입체크 결과 처리
          const diagnostics = engineResult.dts.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: "server",
            type: "dts",
            success: engineResult.dts.success,
            errors: engineResult.dts.errors.length > 0 ? engineResult.dts.errors : undefined,
            diagnostics,
          });
          if (!engineResult.dts.success) state.hasError = true;

          // 린트 결과 처리
          if (engineResult.lint != null) {
            results.push({
              name,
              target: "server",
              type: "lint",
              success: engineResult.lint.success,
              errors: engineResult.lint.formattedOutput !== "" ? [engineResult.lint.formattedOutput] : undefined,
            });
            if (!engineResult.lint.success) state.hasError = true;
          }

        } finally {
          await engine.stop();
        }
        this._logger.debug(`[${name}] (server) 빌드 완료`);
      });
    }

    // clientPackages: Vite production build via ViteEngine (no dts)
    for (const { name, config } of classified.clientPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`[${name}] (client) 빌드 시작`);
        const engine = createBuildEngine(
          { name, dir: pkgDir, config: { ...config, env: { ...baseEnv, ...config.env } } },
          { cwd: this._cwd },
        );

        try {
          const engineResult = await engine.run({ js: true, dts: false, lint: true });

          // JS 빌드 결과 처리
          results.push({
            name,
            target: "client",
            type: "js",
            success: engineResult.js.success,
            errors: engineResult.js.errors.length > 0 ? engineResult.js.errors : undefined,
            warnings: engineResult.js.warnings.length > 0 ? engineResult.js.warnings : undefined,
          });
          if (!engineResult.js.success) state.hasError = true;

          // DTS 결과 처리
          const diagnostics = engineResult.dts.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: "client",
            type: "dts",
            success: engineResult.dts.success,
            errors: engineResult.dts.errors.length > 0 ? engineResult.dts.errors : undefined,
            diagnostics,
          });
          if (!engineResult.dts.success) state.hasError = true;

          // 린트 결과 처리
          if (engineResult.lint != null) {
            results.push({
              name,
              target: "client",
              type: "lint",
              success: engineResult.lint.success,
              errors: engineResult.lint.formattedOutput !== "" ? [engineResult.lint.formattedOutput] : undefined,
            });
            if (!engineResult.lint.success) state.hasError = true;
          }

          // 네이티브 빌드 (JS 빌드 성공 시에만 실행)
          if (engineResult.js.success) {
            const distPath = path.join(pkgDir, "dist");
            const nativeBuildPromises: Array<Promise<void>> = [];

            if (config.capacitor != null) {
              this._logger.debug(`[${name}] Capacitor 네이티브 빌드 시작`);
              nativeBuildPromises.push(
                (async () => {
                  const cap = await Capacitor.create(pkgDir, config.capacitor!, config.exclude);
                  await cap.initialize();
                  await cap.build(distPath);
                  this._logger.debug(`[${name}] Capacitor 네이티브 빌드 완료`);
                })(),
              );
            }

            if (config.electron != null) {
              this._logger.debug(`[${name}] Electron 네이티브 빌드 시작`);
              nativeBuildPromises.push(
                (async () => {
                  const elc = await Electron.create(pkgDir, config.electron!, config.exclude);
                  await elc.initialize();
                  await elc.build(distPath);
                  this._logger.debug(`[${name}] Electron 네이티브 빌드 완료`);
                })(),
              );
            }

            if (nativeBuildPromises.length > 0) {
              const nativeResults = await Promise.allSettled(nativeBuildPromises);
              for (const nativeResult of nativeResults) {
                if (nativeResult.status === "rejected") {
                  state.hasError = true;
                  const err = nativeResult.reason;
                  this._logger.error(
                    `[${name}] 네이티브 빌드 실패: ${err instanceof Error ? err.message : String(err)}`,
                  );
                }
              }
            }
          }
        } finally {
          await engine.stop();
        }
        this._logger.debug(`[${name}] (client) 빌드 완료`);
      });
    }

    this._logger.start(`빌드 실행 중... (${buildTasks.length}개 작업, 동시성: ${concurrency})`);
    this._logger.debug("빌드 작업 목록", { tasks: buildTasks.length, concurrency });
    const buildResults = await runWithConcurrency(buildTasks, concurrency);
    for (const settledResult of buildResults) {
      if (settledResult.status === "rejected") {
        const err = settledResult.reason;
        const stack = err instanceof Error ? err.stack : undefined;
        this._logger.error("빌드 중 예기치 않은 에러", {
          error: String(err),
        });
        if (stack != null) {
          this._logger.debug(`빌드 예외 스택:\n${stack}`);
        }
        state.hasError = true;
      }
    }
    this._logger.success("빌드 실행 완료");

    // 결과 출력
    const allDiagnostics: ts.Diagnostic[] = [];
    for (const result of results) {
      const typeLabel = result.type === "dts" ? "dts" : result.type === "lint" ? "lint" : result.target;

      // 경고 출력
      if (result.warnings != null) {
        this._logger.warn(formatBuildMessages(result.name, typeLabel, result.warnings));
      }

      // 에러 출력
      if (!result.success) {
        if (result.errors != null) {
          this._logger.error(formatBuildMessages(result.name, typeLabel, result.errors));
        } else {
          this._logger.error(`[${result.name}] (${typeLabel}) 실패`);
        }
      }
      if (result.diagnostics != null) {
        allDiagnostics.push(...result.diagnostics);
      }
    }

    // 진단 정보 출력 (중복 제거)
    if (allDiagnostics.length > 0) {
      const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
      const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
      process.stdout.write(message);
    }

    // 최종 결과 로그
    const errorCount = results.filter((r) => !r.success).length;
    const warningCount = results.filter((r) => r.warnings != null).length;
    if (state.hasError) {
      this._logger.error("빌드 에러 발생", { errorCount, warningCount });
    } else {
      this._logger.info("빌드 완료", { errorCount, warningCount });
    }

    return state.hasError;
  }

  /**
   * Shutdown Orchestrator (no resources to clean up currently)
   */
  async shutdown(): Promise<void> {
    // Production builds are one-time operations, so there are no resources to clean up at shutdown
    // Workers are cleaned up with terminate() within each build task
    await Promise.resolve();
  }
}

//#endregion
