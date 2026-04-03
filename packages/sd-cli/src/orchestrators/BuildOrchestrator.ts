import ts from "typescript";
import { fsx, pathx } from "@simplysm/core-node";
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
 * BuildOrchestrator 옵션
 */
export interface BuildOrchestratorOptions {
  /** 빌드 대상 패키지 필터 (빈 배열이면 전체) */
  targets: string[];
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

/**
 * 빌드 결과
 */
interface BuildStepResult {
  name: string;
  target: string;
  type: "build" | "lint";
  success: boolean;
  errors?: string[];
  warnings?: string[];
  diagnostics?: ts.Diagnostic[];
}

/**
 * 패키지 분류 결과
 */
interface ClassifiedPackages {
  /** node/browser/neutral 대상 (JS + DTS) */
  buildPackages: Array<{ name: string; config: SdBuildPackageConfig }>;
  /** server 대상 (JS 빌드, DTS 없음) */
  serverPackages: Array<{ name: string; config: SdServerPackageConfig }>;
  /** client 대상 (Vite 프로덕션 빌드, DTS 없음) */
  clientPackages: Array<{ name: string; config: SdClientPackageConfig }>;
}

//#endregion

//#region Utilities

/**
 * 패키지를 target별로 분류
 * - node/browser/neutral: buildPackages (JS + DTS)
 * - server: serverPackages (JS 빌드, DTS 없음)
 * - client: clientPackages (Vite 프로덕션 빌드, DTS 없음)
 * - scripts: 제외
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
 * dist 폴더 삭제
 */
async function cleanDistFolders(cwd: string, packageNames: string[]): Promise<void> {
  await Promise.all(packageNames.map((name) => fsx.rm(pathx.posixResolve(cwd, "packages", name, "dist"))));
}

//#endregion

//#region BuildOrchestrator

/**
 * 프로덕션 빌드를 조율하는 Orchestrator
 *
 * sd.config.ts 기반으로 패키지를 분류하고 빌드를 실행한다.
 * - dist 폴더 정리 (클린 빌드)
 * - lint + 빌드 동시 실행
 * - 라이브러리 패키지: TscEngine/NgtscEngine으로 JS + DTS 빌드
 * - 서버 패키지: BuildEngine으로 JS 빌드
 * - 클라이언트 패키지: ViteEngine으로 Vite 프로덕션 빌드
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
   * 빌드 실행
   * - 클린
   * - lint + 빌드 (동시 실행)
   * - 결과 출력
   *
   * @returns 에러 발생 여부 (true: 에러 있음)
   */
  async start(): Promise<boolean> {
    if (this._allPackageNames.length === 0) {
      return false;
    }

    const classified = this._classified!;
    const baseEnv = this._baseEnv!;

    // 결과 수집
    const results: BuildStepResult[] = [];
    // results에 포함되지 않는 에러 추적 (네이티브 빌드 실패, rejected 태스크 등)
    let hasUntrackedError = false;

    // 파일 캐시 (진단 출력용)
    const fileCache = new Map<string, string>();

    // formatHost (진단 출력용)
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

    // 빌드 태스크 목록 생성
    const buildTasks: Array<() => Promise<void>> = [];

    // 라이브러리 패키지: BuildEngine으로 JS + DTS 빌드
    for (const { name, config } of classified.buildPackages) {
      const pkgDir = pathx.posixResolve(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`[${name}] (${config.target}) 빌드 시작`);
        const engine = createBuildEngine(
          { name, dir: pkgDir, config },
          { cwd: this._cwd },
        );

        try {
          const engineResult = await engine.run({ js: true, dts: true, lint: false });

          // 빌드 결과 처리
          const diagnostics = engineResult.build.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: config.target,
            type: "build",
            success: engineResult.build.success,
            errors: engineResult.build.errors.length > 0 ? engineResult.build.errors : undefined,
            warnings: engineResult.build.warnings.length > 0 ? engineResult.build.warnings : undefined,
            diagnostics,
          });

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

    // 서버 패키지: BuildEngine으로 JS 빌드 + 타입체크
    for (const { name, config } of classified.serverPackages) {
      const pkgDir = pathx.posixResolve(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`[${name}] (server) 빌드 시작`);
        const engine = createBuildEngine(
          { name, dir: pkgDir, config: { ...config, env: { ...baseEnv, ...config.env } } },
          { cwd: this._cwd },
        );

        try {
          const engineResult = await engine.run({ js: true, dts: false, lint: false });

          // 빌드 결과 처리
          const diagnostics = engineResult.build.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: "server",
            type: "build",
            success: engineResult.build.success,
            errors: engineResult.build.errors.length > 0 ? engineResult.build.errors : undefined,
            warnings: engineResult.build.warnings.length > 0 ? engineResult.build.warnings : undefined,
            diagnostics,
          });

        } finally {
          await engine.stop();
        }
        this._logger.debug(`[${name}] (server) 빌드 완료`);
      });
    }

    // 클라이언트 패키지: ViteEngine으로 Vite 프로덕션 빌드 (DTS 없음)
    for (const { name, config } of classified.clientPackages) {
      const pkgDir = pathx.posixResolve(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`[${name}] (client) 빌드 시작`);
        const isNativeBuild = config.capacitor != null || config.electron != null;
        const outDir = config.capacitor != null
          ? pathx.posixResolve(pkgDir, ".capacitor/www")
          : undefined;
        const engine = createBuildEngine(
          { name, dir: pkgDir, config: { ...config, env: { ...baseEnv, ...config.env } } },
          { cwd: this._cwd, outDir, base: isNativeBuild ? "" : undefined },
        );

        try {
          const engineResult = await engine.run({ js: true, dts: false, lint: false });

          // 빌드 결과 처리
          const diagnostics = engineResult.build.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: "client",
            type: "build",
            success: engineResult.build.success,
            errors: engineResult.build.errors.length > 0 ? engineResult.build.errors : undefined,
            warnings: engineResult.build.warnings.length > 0 ? engineResult.build.warnings : undefined,
            diagnostics,
          });

          // 네이티브 빌드 (빌드 성공 시에만 실행)
          if (engineResult.build.success) {
            const distPath = pathx.posixResolve(pkgDir, "dist");
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
                  hasUntrackedError = true;
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
        hasUntrackedError = true;
      }
    }
    this._logger.success("빌드 실행 완료");

    // 결과 출력
    const allDiagnostics: ts.Diagnostic[] = [];
    for (const result of results) {
      const typeLabel = result.type === "lint" ? "lint" : result.target;

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
    const hasError = errorCount > 0 || hasUntrackedError;
    if (hasError) {
      this._logger.error("빌드 에러 발생", { errorCount, warningCount });
    } else {
      this._logger.info("빌드 완료", { errorCount, warningCount });
    }

    return hasError;
  }

  /**
   * Orchestrator 종료 (현재 정리할 리소스 없음)
   */
  async shutdown(): Promise<void> {
    // 프로덕션 빌드는 일회성 작업이므로 종료 시 정리할 리소스가 없음
    // Worker는 각 빌드 태스크 내에서 terminate()로 정리됨
    await Promise.resolve();
  }
}

//#endregion
