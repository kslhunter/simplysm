import { Worker, type WorkerProxy } from "@simplysm/core-node";
import { consola } from "consola";
import type { BuildResult, ResultCollector } from "../infra/ResultCollector";
import { stopEngineWorker } from "../utils/engine-stop";
import type { LintWithProgramResult } from "../utils/lint-with-program";
import type { RebuildManager } from "../utils/rebuild-manager";
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
 * ViteEngine은 이 계층에 포함되지 않음 — serverReady 이벤트, port 관리 등 생명주기가 다름.
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

    return new Promise<void>((resolve) => {
      let isInitialBuild = true;
      let resolver: (() => void) | undefined;
      const workerKey = `${this._pkg.name}:build`;

      this._worker!.on("buildStart", () => {
        if (this._rebuildManager != null) {
          resolver = this._rebuildManager.registerBuild(
            workerKey,
            `${this._pkg.name} (${this._getTarget()})`,
          );
        }
      });

      this._worker!.on("build", (data) => {
        const event = data;

        if (event.build.warnings != null && event.build.warnings.length > 0) {
          logger.warn(`${this._pkg.name}: ${event.build.warnings.join(", ")}`);
        }

        // 빌드 결과 보고
        const buildResult: BuildResult = {
          name: this._pkg.name,
          target: this._getTarget(),
          type: "build",
          status: event.build.success ? "success" : "error",
          message: event.build.errors?.join("\n"),
        };
        this._resultCollector?.add(buildResult);

        // 린트 결과 보고 (있는 경우)
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

        resolver?.();
        resolver = undefined;

        if (isInitialBuild) {
          isInitialBuild = false;
          logger.debug(`[${this._pkg.name}] 초기 빌드 완료 (success: ${event.build.success})`);
          resolve();
        }
      });

      this._worker!.on("error", (data) => {
        const event = data as { message: string };
        const result: BuildResult = {
          name: this._pkg.name,
          target: this._getTarget(),
          type: "build",
          status: "error",
          message: event.message,
        };
        this._resultCollector?.add(result);

        resolver?.();
        resolver = undefined;

        // 에러 경로: 항상 resolve (reject하지 않음) — 호출자가 ResultCollector에서 상태를 확인
        if (isInitialBuild) {
          isInitialBuild = false;
          resolve();
        }
      });

      this._callStartWatch(output).catch(() => {
        if (isInitialBuild) {
          isInitialBuild = false;
          resolve();
        }
      });
    });
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
