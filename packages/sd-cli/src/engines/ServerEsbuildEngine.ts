import type * as ServerBuildWorkerModule from "../workers/server-build.worker";
import type { ResultCollector } from "../runtime/ResultCollector";
import type { RebuildManager } from "../runtime/rebuild-manager";
import type { BuildOutput, EngineResult, ServerPackageInfo } from "./types";
import { BaseEngine, type CommonBuildWorkerModule } from "./BaseEngine";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:engine:server");

/**
 * ServerEsbuildEngine 옵션
 */
export interface ServerEsbuildEngineOptions {
  cwd: string;
  pkg: ServerPackageInfo;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
  /** 워치 모드 리빌드 보고용 ResultCollector */
  resultCollector?: ResultCollector;
  /** 워치 모드 배치 조정용 RebuildManager */
  rebuildManager?: RebuildManager;
}

/**
 * esbuild 기반 서버 패키지용 빌드 엔진
 *
 * esbuild(JS 번들) + tsc(타입체크)를 하나의 Worker 스레드에서 결합하는
 * server-build.worker를 래핑한다.
 */
export class ServerEsbuildEngine extends BaseEngine<
  ServerPackageInfo,
  typeof ServerBuildWorkerModule & CommonBuildWorkerModule
> {
  constructor(options: ServerEsbuildEngineOptions) {
    super(options);
  }

  protected _getWorkerPath(): string {
    return import.meta.resolve("../workers/server-build.worker");
  }

  protected _getTarget(): string {
    return "server";
  }

  protected async _callBuild(output: BuildOutput): Promise<EngineResult> {
    logger.debug(`[${this._pkg.name}] worker.build 호출`);
    const result = await this._worker!.build({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      externals: this._pkg.config.externals,
      pm2: this._pkg.config.pm2,
      packageManager: this._pkg.config.packageManager,
    });

    return this._normalizeResult(result);
  }

  protected async _callStartWatch(output: BuildOutput): Promise<void> {
    logger.debug(`[${this._pkg.name}] worker.startWatch 호출`);
    await this._worker!.startWatch({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      externals: this._pkg.config.externals,
      replaceDeps: this._replaceDeps,
    });
  }
}
