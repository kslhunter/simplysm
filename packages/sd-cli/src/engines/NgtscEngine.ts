import type * as LibraryBuildWorkerModule from "../workers/library-build.worker";
import type { ResultCollector } from "../runtime/ResultCollector";
import type { RebuildManager } from "../runtime/rebuild-manager";
import type { BuildOutput, BuildPackageInfo, EngineResult } from "./types";
import { BaseEngine, type CommonBuildWorkerModule } from "./BaseEngine";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:engine:ngtsc");

/**
 * NgtscEngine 옵션
 */
export interface NgtscEngineOptions {
  cwd: string;
  pkg: BuildPackageInfo;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
  /** 워치 모드 리빌드 보고용 ResultCollector */
  resultCollector?: ResultCollector;
  /** 워치 모드 배치 조정용 RebuildManager */
  rebuildManager?: RebuildManager;
}

/**
 * NgtscProgram 기반 Angular 라이브러리 패키지용 빌드 엔진
 *
 * 통합된 library-build.worker를 사용하며, globalScss: true를 전달하여
 * Angular AOT 컴파일 + SCSS 빌드를 활성화한다.
 */
export class NgtscEngine extends BaseEngine<
  BuildPackageInfo,
  typeof LibraryBuildWorkerModule & CommonBuildWorkerModule
> {
  constructor(options: NgtscEngineOptions) {
    super(options);
  }

  protected _getWorkerPath(): string {
    return import.meta.resolve("../workers/library-build.worker");
  }

  protected _getTarget(): string {
    return this._pkg.config.target;
  }

  protected async _callBuild(output: BuildOutput): Promise<EngineResult> {
    logger.debug(`[${this._pkg.name}] worker.build 호출`);
    const result = await this._worker!.build({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output: { ...output, globalScss: true },
    });

    return this._normalizeResult(result);
  }

  protected async _callStartWatch(output: BuildOutput): Promise<void> {
    logger.debug(`[${this._pkg.name}] worker.startWatch 호출`);
    await this._worker!.startWatch({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output: { ...output, globalScss: true },
      replaceDeps: this._replaceDeps,
    });
  }
}
