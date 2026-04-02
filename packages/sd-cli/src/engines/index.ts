import { consola } from "consola";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import { hasAngularCoreDependency } from "../utils/package-utils";
import { NgtscEngine } from "./NgtscEngine";
import { ServerEsbuildEngine } from "./ServerEsbuildEngine";
import { TscEngine } from "./TscEngine";
import { ViteEngine } from "./ViteEngine";
import type { BuildEngine, BuildPackageInfo, ClientPackageInfo, ServerPackageInfo } from "./types";

const logger = consola.withTag("sd:cli:engine");

export { BaseEngine } from "./BaseEngine";
export type { BaseEngineOptions, CommonBuildWorkerEvents, CommonBuildWorkerModule } from "./BaseEngine";
export { NgtscEngine } from "./NgtscEngine";
export type { NgtscEngineOptions } from "./NgtscEngine";
export { ServerEsbuildEngine } from "./ServerEsbuildEngine";
export type { ServerEsbuildEngineOptions } from "./ServerEsbuildEngine";
export { TscEngine } from "./TscEngine";
export type { TscEngineOptions } from "./TscEngine";
export { ViteEngine } from "./ViteEngine";
export type { ViteEngineOptions } from "./ViteEngine";
export type { BuildEngine, BuildOutput, BuildPackageInfo, ClientPackageInfo, EngineResult, PackageInfo, ServerPackageInfo } from "./types";

/**
 * 주어진 패키지에 맞는 BuildEngine을 생성한다.
 *
 * 클라이언트 패키지는 ViteEngine을 사용한다.
 * 서버 패키지는 ServerEsbuildEngine을 사용한다.
 * Angular 라이브러리 패키지(package.json에 @angular/core 의존성 감지)는 NgtscEngine을 사용한다.
 * 기타 라이브러리 패키지(node/browser/neutral)는 TscEngine을 사용한다.
 */
export function createBuildEngine(
  pkg: BuildPackageInfo | ServerPackageInfo | ClientPackageInfo,
  options: {
    cwd: string;
    replaceDeps?: Record<string, string>;
    resolvedReplaceDeps?: Array<{ packageName: string; sourcePath: string }>;
    resultCollector?: ResultCollector;
    rebuildManager?: RebuildManager;
    /** 클라이언트 빌드 출력 경로 (ViteEngine에만 적용) */
    outDir?: string;
    /** Vite base 경로 (ViteEngine에만 적용, 미설정 시 /{pkgName}/) */
    base?: string;
  },
): BuildEngine {
  if (pkg.config.target === "client") {
    logger.debug(`[${pkg.name}] 엔진 선택: ViteEngine (client)`);
    return new ViteEngine({
      cwd: options.cwd,
      pkg: pkg as ClientPackageInfo,
      resultCollector: options.resultCollector,
      rebuildManager: options.rebuildManager,
      replaceDeps: options.resolvedReplaceDeps,
      outDir: options.outDir,
      base: options.base,
    });
  }

  if (pkg.config.target === "server") {
    logger.debug(`[${pkg.name}] 엔진 선택: ServerEsbuildEngine`);
    return new ServerEsbuildEngine({ ...options, pkg: pkg as ServerPackageInfo });
  }

  if (hasAngularCoreDependency(pkg.dir)) {
    logger.debug(`[${pkg.name}] 엔진 선택: NgtscEngine (angular 의존성 감지)`);
    return new NgtscEngine({ ...options, pkg: pkg as BuildPackageInfo });
  }

  logger.debug(`[${pkg.name}] 엔진 선택: TscEngine (target: ${pkg.config.target})`);
  return new TscEngine({ ...options, pkg: pkg as BuildPackageInfo });
}
