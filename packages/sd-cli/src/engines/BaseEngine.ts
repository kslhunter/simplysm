import { Worker, type WorkerProxy } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import type { BuildResult, ResultCollector } from "../runtime/ResultCollector";
import { stopEngineWorker } from "../runtime/engine-stop";
import { setupWatchEvents } from "../runtime/engine-watch-events";
import type { LintWithProgramResult } from "../lint/lint-with-program";
import type { RebuildManager } from "../runtime/rebuild-manager";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization";
import type { BuildEngine, BuildOutput, EngineResult, PackageInfo } from "./types";

const logger = consola.withTag("sd:cli:engine");

/**
 * 모든 빌드 워커가 공유하는 공통 빌드 워커 이벤트
 * (library-build, ngtsc-build, server-build)
 */
export interface CommonBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: {
    build: { success: boolean; errors?: string[]; warnings?: string[] };
    lint?: LintWithProgramResult;
  };
  error: { message: string };
}

/**
 * BaseEngine을 위한 최소 워커 모듈 타입.
 * 공통 계약을 정의: stopWatch 메서드 + 공유 이벤트.
 */
export interface CommonBuildWorkerModule {
  default: {
    __methods: {
      stopWatch: () => Promise<void>;
      [key: string]: (...args: never[]) => unknown;
    };
    __events: CommonBuildWorkerEvents;
  };
}

/**
 * BaseEngine 옵션
 */
export interface BaseEngineOptions<TPkg extends PackageInfo> {
  cwd: string;
  pkg: TPkg;
  replaceDeps?: Record<string, string>;
  resultCollector?: ResultCollector;
  rebuildManager?: RebuildManager;
}

/**
 * 빌드 엔진의 추상 기본 클래스 (TscEngine, NgtscEngine, ServerEsbuildEngine).
 *
 * 템플릿 메서드 패턴 구현: 공통 생명주기 로직 (생성자, stop, startWatch
 * 이벤트 처리)이 여기에 위치하며, 서브클래스는 추상 메서드를 통해
 * 워커 경로, 빌드/워치 호출 파라미터, 타겟 결정을 제공한다.
 *
 * EsbuildClientEngine은 이 계층에 포함되지 않음 — serverReady 이벤트, port 관리 등 생명주기가 다름.
 */
export abstract class BaseEngine<
  TPkg extends PackageInfo,
  TWorkerModule extends CommonBuildWorkerModule,
> implements BuildEngine
{
  protected readonly _cwd: string;
  protected readonly _pkg: TPkg;
  protected readonly _replaceDeps: Record<string, string> | undefined;
  protected readonly _resultCollector: ResultCollector | undefined;
  protected readonly _rebuildManager: RebuildManager | undefined;

  protected _worker: WorkerProxy<TWorkerModule> | undefined;
  private _isWatchMode = false;

  constructor(options: BaseEngineOptions<TPkg>) {
    this._cwd = options.cwd;
    this._pkg = options.pkg;
    this._replaceDeps = options.replaceDeps;
    this._resultCollector = options.resultCollector;
    this._rebuildManager = options.rebuildManager;
  }

  /**
   * 워커 모듈 경로 (서브클래스에서 import.meta.resolve로 해석)
   */
  protected abstract _getWorkerPath(): string;

  /**
   * BuildResult용 타겟 문자열 (예: config.target 또는 "server")
   */
  protected abstract _getTarget(): string;

  /**
   * 워커를 통해 일회성 빌드를 실행한다. 서브클래스가 엔진별 인자로 worker.build()를 호출한다.
   */
  protected abstract _callBuild(output: BuildOutput): Promise<EngineResult>;

  /**
   * 워커를 통해 워치 모드를 시작한다. 서브클래스가 엔진별 인자로 worker.startWatch()를 호출한다.
   */
  protected abstract _callStartWatch(output: BuildOutput): Promise<void>;

  /**
   * Worker 빌드 결과를 EngineResult로 정규화한다.
   * errors/warnings가 undefined이면 빈 배열로 변환한다.
   */
  protected _normalizeResult(result: {
    build: {
      success: boolean;
      errors?: string[];
      warnings?: string[];
      diagnostics: SerializedDiagnostic[];
    };
    lint?: LintWithProgramResult;
  }): EngineResult {
    return {
      build: {
        success: result.build.success,
        errors: result.build.errors ?? [],
        warnings: result.build.warnings ?? [],
        diagnostics: result.build.diagnostics,
      },
      lint: result.lint,
    };
  }

  /**
   * 서브클래스가 제공하는 워커 경로로 워커 인스턴스를 생성한다.
   */
  protected _createWorker(): void {
    const workerPath = this._getWorkerPath();
    this._worker = Worker.create<TWorkerModule>(workerPath, {
      resourceLimits: { maxOldGenerationSizeMb: 8192 },
    });
  }

  /**
   * 일회성 빌드 (프로덕션)
   */
  async run(output: BuildOutput): Promise<EngineResult> {
    logger.debug(`[${this._pkg.name}] run 시작 (js: ${output.js}, dts: ${output.dts}, env: ${output.env ?? "none"})`);
    this._createWorker();
    const result = await this._callBuild(output);
    logger.debug(`[${this._pkg.name}] run 완료 (success: ${result.build.success})`);
    return result;
  }

  /**
   * 워치 모드를 시작한다.
   * 초기 빌드가 완료되면 Promise가 resolve된다.
   */
  async startWatch(output: BuildOutput): Promise<void> {
    logger.debug(`[${this._pkg.name}] startWatch 시작`);
    this._isWatchMode = true;
    this._createWorker();

    const { waitForInitialBuild, resolveInitialBuild } = setupWatchEvents(this._worker!, {
      name: this._pkg.name,
      target: this._getTarget(),
      resultCollector: this._resultCollector,
      rebuildManager: this._rebuildManager,
      normalizeBuild: (data) =>
        (data as CommonBuildWorkerEvents["build"]).build,
    });

    // BaseEngine 전용: 린트 결과 보고
    this._worker!.on("build", (data) => {
      const event = data;

      if (event.lint != null) {
        const lintResult: BuildResult = {
          name: this._pkg.name,
          target: this._getTarget(),
          type: "lint",
          status: event.lint.success ? "success" : "error",
          message: event.lint.formattedOutput !== "" ? event.lint.formattedOutput : undefined,
        };
        this._resultCollector?.add(lintResult);
      }
    });

    this._callStartWatch(output).catch((err: unknown) => {
      logger.debug(`[${this._pkg.name}] startWatch 실패:`, errNs.message(err));
      this._resultCollector?.add({
        name: this._pkg.name,
        target: this._getTarget(),
        type: "build",
        status: "error",
        message: errNs.message(err),
      });
      resolveInitialBuild();
    });

    return waitForInitialBuild();
  }

  /**
   * 엔진을 중지하고 리소스를 정리한다
   */
  async stop(): Promise<void> {
    logger.debug(`[${this._pkg.name}] stop (watchMode: ${this._isWatchMode})`);
    await stopEngineWorker(this._worker, this._isWatchMode);
    this._worker = undefined;
  }
}
