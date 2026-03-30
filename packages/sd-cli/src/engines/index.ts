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
 * Create a BuildEngine for the given package.
 *
 * Client packages use ViteEngine (Angular buildApplicationInternal / serveWithVite).
 * Server packages use ServerEsbuildEngine.
 * Angular Library packages (detected by @angular/core in package.json) use NgtscEngine.
 * Other Library packages (node/browser/neutral) use TscEngine.
 */
export function createBuildEngine(
  pkg: BuildPackageInfo | ServerPackageInfo | ClientPackageInfo,
  options: {
    cwd: string;
    replaceDeps?: Record<string, string>;
    resolvedReplaceDeps?: Array<{ packageName: string; sourcePath: string }>;
    resultCollector?: ResultCollector;
    rebuildManager?: RebuildManager;
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
