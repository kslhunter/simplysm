import { consola } from "consola";
import type { ResultCollector } from "../runtime/ResultCollector";
import type { RebuildManager } from "../runtime/rebuild-manager";
import { hasAngularCoreDependency } from "../utils/package-utils";
import { NgtscEngine } from "./NgtscEngine";
import { ServerEsbuildEngine } from "./ServerEsbuildEngine";
import { TscEngine } from "./TscEngine";
import { EsbuildClientEngine } from "./EsbuildClientEngine";
import type { BuildEngine, BuildPackageInfo, ClientPackageInfo, ServerPackageInfo } from "./types";

const logger = consola.withTag("sd:cli:engine");

export type { BuildEngine, BuildOutput, BuildPackageInfo, ClientPackageInfo, EngineResult, PackageInfo, ServerPackageInfo } from "./types";

/**
 * 주어진 패키지에 맞는 BuildEngine을 생성한다.
 *
 * 클라이언트 패키지는 EsbuildClientEngine을 사용한다.
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
    /** 클라이언트 빌드 출력 경로 (EsbuildClientEngine에만 적용) */
    outDir?: string;
    /** base 경로 (EsbuildClientEngine에만 적용, 미설정 시 /{pkgName}/) */
    base?: string;
  },
): BuildEngine {
  if (pkg.config.target === "client") {
    logger.debug(`[${pkg.name}] 엔진 선택: EsbuildClientEngine (client)`);
    return new EsbuildClientEngine({
      cwd: options.cwd,
      pkg: pkg as ClientPackageInfo,
      resultCollector: options.resultCollector,
      rebuildManager: options.rebuildManager,
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

/**
 * 타입체크용 BuildEngine을 생성한다.
 *
 * client target은 browser로 재매핑하여 createBuildEngine에 위임한다.
 * (client 패키지의 타입체크는 EsbuildClientEngine이 아닌 TscEngine/NgtscEngine으로 수행)
 * 그 외 target은 createBuildEngine에 그대로 위임한다.
 */
export function createTypecheckEngine(
  pkg: BuildPackageInfo | ServerPackageInfo | ClientPackageInfo,
  options: { cwd: string },
): BuildEngine {
  if (pkg.config.target === "client") {
    const browserPkg: BuildPackageInfo = {
      ...pkg,
      config: { target: "browser" as const },
    };
    return createBuildEngine(browserPkg, options);
  }
  return createBuildEngine(pkg, options);
}
