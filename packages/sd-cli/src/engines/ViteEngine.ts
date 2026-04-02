import { Worker, type WorkerProxy } from "@simplysm/core-node";
import { consola } from "consola";
import type * as ClientWorkerModule from "../workers/client.worker";
import type { BuildResult, ResultCollector } from "../infra/ResultCollector";
import { stopEngineWorker } from "../utils/engine-stop";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildEngine, BuildOutput, ClientPackageInfo, EngineResult } from "./types";

const logger = consola.withTag("sd:cli:engine:vite");

/**
 * ViteEngine 옵션
 */
export interface ViteEngineOptions {
  cwd: string;
  pkg: ClientPackageInfo;
  /** 워치 모드 리빌드 보고용 ResultCollector */
  resultCollector?: ResultCollector;
  /** 워치 모드 배치 조정용 RebuildManager */
  rebuildManager?: RebuildManager;
  /** sdScopeWatchPlugin용 replaceDeps 항목 */
  replaceDeps?: Array<{ packageName: string; sourcePath: string }>;
}

/**
 * Angular 클라이언트 패키지용 Vite 기반 빌드 엔진
 *
 * sdAngularPlugin을 통한 Angular AOT 컴파일과 함께
 * Vite의 createServer/build API를 직접 사용하는 client.worker를 래핑한다.
 */
export class ViteEngine implements BuildEngine {
  private readonly _cwd: string;
  private readonly _pkg: ClientPackageInfo;
  private readonly _resultCollector: ResultCollector | undefined;
  private readonly _rebuildManager: RebuildManager | undefined;
  private readonly _replaceDeps: Array<{ packageName: string; sourcePath: string }> | undefined;

  private _worker: WorkerProxy<typeof ClientWorkerModule> | undefined;
  private _isWatchMode = false;

  /** 개발 서버 포트 (워치 모드에서 serverReady 이벤트로 설정됨) */
  port: number | undefined;

  constructor(options: ViteEngineOptions) {
    this._cwd = options.cwd;
    this._pkg = options.pkg;
    this._resultCollector = options.resultCollector;
    this._rebuildManager = options.rebuildManager;
    this._replaceDeps = options.replaceDeps;
  }

  /**
   * 일회성 빌드 (프로덕션)
   */
  async run(output: BuildOutput): Promise<EngineResult> {
    logger.debug(`[${this._pkg.name}] ViteEngine.run 시작`);
    this._createWorker();

    const result = await this._worker!.build({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      browserSupport: this._pkg.config.browserSupport,
      enableLint: output.lint,
      exclude: this._pkg.config.exclude,
    });

    logger.debug(`[${this._pkg.name}] ViteEngine.run 완료 (success: ${result.success})`);
    return {
      success: result.success,
      build: {
        success: result.success,
        errors: result.errors ?? [],
        warnings: result.warnings ?? [],
        diagnostics: [],
      },
      lint: result.lint,
    };
  }

  /**
   * 워치 모드 시작 (Vite 개발 서버)
   * worker의 startWatch()가 완료되면 Promise가 resolve된다.
   */
  async startWatch(output: BuildOutput): Promise<void> {
    logger.debug(`[${this._pkg.name}] ViteEngine.startWatch 시작`);
    this._isWatchMode = true;
    this._createWorker();

    // serverReady를 감지하여 포트 캡처
    this._worker!.on("serverReady", (data) => {
      const event = data as { port: number };
      this.port = event.port;
    });

    // 리빌드 이벤트 처리 (HMR)
    let resolver: (() => void) | undefined;
    const workerKey = `vite:${this._pkg.name}`;

    this._worker!.on("buildStart", () => {
      if (this._rebuildManager != null) {
        resolver = this._rebuildManager.registerBuild(workerKey, `${this._pkg.name} (client)`);
      }
    });

    this._worker!.on("build", (data) => {
      const event = data as {
        success: boolean;
        errors?: string[];
        warnings?: string[];
        lint?: { success: boolean; errorCount: number; warningCount: number; formattedOutput: string };
      };
      const buildResult: BuildResult = {
        name: this._pkg.name,
        target: "client",
        type: "build",
        status: event.success ? "success" : "error",
        message: event.errors?.join("\n"),
      };
      this._resultCollector?.add(buildResult);

      // 린트 결과 보고 (있는 경우)
      if (event.lint != null) {
        const lintResult: BuildResult = {
          name: this._pkg.name,
          target: "client",
          type: "lint",
          status: event.lint.success ? "success" : "error",
          message: event.lint.formattedOutput !== "" ? event.lint.formattedOutput : undefined,
        };
        this._resultCollector?.add(lintResult);
      }

      resolver?.();
      resolver = undefined;
    });

    this._worker!.on("scopeRebuild", () => {
      logger.info(`${this._pkg.name}: 의존성 변경 감지됨`);
    });

    this._worker!.on("error", (data) => {
      const event = data as { message: string };
      logger.error(`${this._pkg.name}: ${event.message}`);

      const buildResult: BuildResult = {
        name: this._pkg.name,
        target: "client",
        type: "build",
        status: "error",
        message: event.message,
      };
      this._resultCollector?.add(buildResult);

      resolver?.();
      resolver = undefined;
    });

    const port =
      typeof this._pkg.config.server === "number"
        ? this._pkg.config.server
        : undefined;

    await this._worker!.startWatch({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      port,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      replaceDeps: this._replaceDeps,
      browserSupport: this._pkg.config.browserSupport,
      enableLint: output.lint,
      exclude: this._pkg.config.exclude,
    });
  }

  /**
   * 엔진을 중지하고 리소스를 정리한다
   */
  async stop(): Promise<void> {
    logger.debug(`[${this._pkg.name}] ViteEngine stop 시작`);
    await stopEngineWorker(this._worker, this._isWatchMode);
    this._worker = undefined;
    logger.debug(`[${this._pkg.name}] ViteEngine stop 완료`);
  }

  /**
   * 워커 인스턴스를 생성한다
   */
  private _createWorker(): void {
    const workerPath = import.meta.resolve("../workers/client.worker");
    this._worker = Worker.create<typeof ClientWorkerModule>(workerPath);
  }
}
