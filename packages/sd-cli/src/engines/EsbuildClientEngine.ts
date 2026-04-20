import fs from "node:fs";
import path from "path";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type * as ClientWorkerModule from "../workers/client.worker";
import type { ResultCollector } from "../runtime/ResultCollector";
import { stopEngineWorker } from "../runtime/engine-stop";
import { setupWatchEvents, type NormalizedBuildInfo } from "../runtime/engine-watch-events";
import { createLazyLogger } from "../runtime/lazy-logger";
import type { RebuildManager } from "../runtime/rebuild-manager";
import type { BuildEngine, BuildOutput, ClientPackageInfo, EngineResult } from "./types";

const logger = createLazyLogger("sd:cli:engine:esbuild-client");

/**
 * EsbuildClientEngine 옵션
 */
export interface EsbuildClientEngineOptions {
  cwd: string;
  pkg: ClientPackageInfo;
  /** 워치 모드 리빌드 보고용 ResultCollector */
  resultCollector?: ResultCollector;
  /** 워치 모드 배치 조정용 RebuildManager */
  rebuildManager?: RebuildManager;
  /** 빌드 출력 경로 (미설정 시 pkgDir/dist) */
  outDir?: string;
  /** base 경로 (미설정 시 /{pkgName}/) */
  base?: string;
}

/**
 * 클라이언트 패키지용 esbuild 기반 빌드 엔진
 *
 * esbuild context + HTTP dev server + HMR service를 사용하는 client.worker를 래핑한다.
 */
export class EsbuildClientEngine implements BuildEngine {
  private readonly _cwd: string;
  private readonly _pkg: ClientPackageInfo;
  private readonly _resultCollector: ResultCollector | undefined;
  private readonly _rebuildManager: RebuildManager | undefined;
  private readonly _outDir: string | undefined;
  private readonly _base: string | undefined;

  private _worker: WorkerProxy<typeof ClientWorkerModule> | undefined;
  private _isWatchMode = false;

  /** 개발 서버 포트 (워치 모드에서 serverReady 이벤트로 설정됨) */
  port: number | undefined;

  constructor(options: EsbuildClientEngineOptions) {
    this._cwd = options.cwd;
    this._pkg = options.pkg;
    this._resultCollector = options.resultCollector;
    this._rebuildManager = options.rebuildManager;
    this._outDir = options.outDir;
    this._base = options.base;
  }

  /**
   * 일회성 빌드 (프로덕션)
   */
  async run(_output: BuildOutput): Promise<EngineResult> {
    logger.debug(`[${this._pkg.name}] EsbuildClientEngine.run 시작`);
    this._createWorker();

    const result = await this._worker!.build({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      pwa: this._pkg.config.pwa,
      outDir: this._outDir,
      base: this._base,
      browserSupport: this._pkg.config.browserSupport,
    });

    logger.debug(`[${this._pkg.name}] EsbuildClientEngine.run 완료 (success: ${result.success})`);
    return {
      build: {
        success: result.success,
        errors: result.errors ?? [],
        warnings: result.warnings ?? [],
        diagnostics: [],
      },
    };
  }

  /**
   * 워치 모드 시작 (esbuild watch + HTTP dev server + HMR)
   * worker의 startWatch()가 완료되면 Promise가 resolve된다.
   */
  async startWatch(_output: BuildOutput): Promise<void> {
    logger.debug(`[${this._pkg.name}] EsbuildClientEngine.startWatch 시작`);
    this._isWatchMode = true;
    this._createWorker();

    // serverReady를 감지하여 포트 캡처 (EsbuildClientEngine 전용)
    this._worker!.on("serverReady", (data) => {
      const event = data as { port: number };
      this.port = event.port;
    });

    // 공통 이벤트 처리 (buildStart/build/error)
    const { resolveInitialBuild } = setupWatchEvents(this._worker!, {
      name: this._pkg.name,
      target: "client",
      resultCollector: this._resultCollector,
      rebuildManager: this._rebuildManager,
      normalizeBuild: (data) => data as NormalizedBuildInfo,
    });
    resolveInitialBuild(); // EsbuildClientEngine은 worker.startWatch() await로 초기 빌드 완료를 감지하므로 즉시 정리

    const port =
      typeof this._pkg.config.server === "number"
        ? this._pkg.config.server
        : undefined;

    const result = await this._worker!.startWatch({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      port,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      pwa: this._pkg.config.pwa,
      browserSupport: this._pkg.config.browserSupport,
    });

    const warningsText = result.warnings != null && result.warnings.length > 0
      ? result.warnings.join("\n")
      : undefined;

    if (!result.success) {
      const errorDetail = result.errors?.join("\n") ?? "unknown error";
      this._resultCollector?.add({
        name: this._pkg.name,
        target: "client",
        type: "build",
        status: "error",
        message: errorDetail,
        warnings: warningsText,
      });
    } else if (warningsText != null) {
      this._resultCollector?.add({
        name: this._pkg.name,
        target: "client",
        type: "build",
        status: "success",
        warnings: warningsText,
      });
    }
  }

  /**
   * 엔진을 중지하고 리소스를 정리한다
   */
  async stop(): Promise<void> {
    logger.debug(`[${this._pkg.name}] EsbuildClientEngine stop 시작`);

    // .dev-port 파일 삭제
    const portFile = path.join(this._pkg.dir, "dist", ".dev-port");
    try { fs.unlinkSync(portFile); } catch { /* 파일 없으면 무시 */ }

    await stopEngineWorker(this._worker, this._isWatchMode);
    this._worker = undefined;
    logger.debug(`[${this._pkg.name}] EsbuildClientEngine stop 완료`);
  }

  /**
   * 워커 인스턴스를 생성한다
   */
  private _createWorker(): void {
    const workerPath = import.meta.resolve("../workers/client.worker");
    this._worker = Worker.create<typeof ClientWorkerModule>(workerPath, {
      resourceLimits: { maxOldGenerationSizeMb: 8192 },
    });
  }
}
