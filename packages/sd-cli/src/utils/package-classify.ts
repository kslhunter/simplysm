import path from "path";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import type {
  BuildTarget,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdPackageConfig,
  SdScriptsPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";

const logger = consola.withTag("sd:cli:package-classify");

/**
 * 패키지 config를 순회하며 null 필터링 + target 필터링을 수행한다.
 * 3개 분류 함수(classifyPackages, classifyWatchPackages, classifyDevPackages)의
 * 공통 순회 로직을 추출한 유틸이다.
 */
export function iteratePackages(
  packages: Record<string, SdPackageConfig | undefined>,
  targets: string[],
): Array<{ name: string; config: SdPackageConfig }> {
  const result: Array<{ name: string; config: SdPackageConfig }> = [];
  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;
    if (targets.length > 0 && !targets.includes(name)) continue;
    result.push({ name, config });
  }
  return result;
}

/**
 * targets로 패키지 설정을 필터링한다 (scripts target 제외)
 * @param packages 패키지 설정 맵
 * @param targets 필터링할 패키지명 목록. 빈 배열이면 scripts를 제외한 모든 패키지 반환
 * @returns 필터링된 패키지 설정 맵
 * @internal 테스트용으로 export
 */
export function filterPackagesByTargets(
  packages: Record<string, SdPackageConfig | undefined>,
  targets: string[],
): Record<string, SdPackageConfig> {
  logger.debug(`패키지 필터링 시작 (targets: ${targets.length > 0 ? targets.join(", ") : "전체"})`);
  const result: Record<string, SdPackageConfig> = {};

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;

    // watch hook이 설정되지 않은 scripts target 제외
    if (config.target === "scripts" && config.watch == null) continue;

    // targets가 비어있으면 모든 패키지 포함
    if (targets.length === 0) {
      result[name] = config;
      continue;
    }

    // targets에 포함된 패키지만 필터링
    if (targets.includes(name)) {
      result[name] = config;
    }
  }

  logger.debug(`패키지 필터링 완료 (${Object.keys(result).length}개)`);
  return result;
}

//#region Classify functions

const isLibraryTarget = (target: string): target is BuildTarget =>
  target === "node" || target === "browser" || target === "neutral";

export interface WatchClassifiedPackages {
  libraryPackages: Array<{ name: string; dir: string; config: SdBuildPackageConfig }>;
  watchHookPackages: Array<{ name: string; dir: string; config: SdBuildPackageConfig | SdScriptsPackageConfig }>;
}

/**
 * Watch 모드용 패키지 분류.
 * Watch 모드용 패키지 분류. WatchOrchestrator에서 사용한다.
 */
export function classifyWatchPackages(
  allPackages: Record<string, SdPackageConfig>,
  cwd: string,
  pathMap: Map<string, string>,
): WatchClassifiedPackages {
  logger.debug("watch 패키지 분류 시작");
  const libraryPackages: WatchClassifiedPackages["libraryPackages"] = [];
  const watchHookPackages: WatchClassifiedPackages["watchHookPackages"] = [];

  for (const { name, config } of iteratePackages(allPackages, [])) {
    const relPath = pathMap.get(name) ?? `packages/${name}`;
    const pkgDir = pathx.posix(path.join(cwd, relPath));
    if (isLibraryTarget(config.target)) {
      const buildConfig = config as SdBuildPackageConfig;
      libraryPackages.push({ name, dir: pkgDir, config: buildConfig });
      if (buildConfig.watch != null) {
        watchHookPackages.push({ name, dir: pkgDir, config: buildConfig });
      }
    } else if (config.target === "scripts" && (config).watch != null) {
      watchHookPackages.push({
        name,
        dir: pkgDir,
        config: config,
      });
    }
  }

  logger.debug(`watch 패키지 분류 완료 (library: ${libraryPackages.length}, watchHook: ${watchHookPackages.length})`);
  return { libraryPackages, watchHookPackages };
}

export interface DevClassifiedPackages {
  serverPackages: Array<{ name: string; dir: string; config: SdServerPackageConfig }>;
  clientPackages: Array<{ name: string; dir: string; config: SdClientPackageConfig }>;
  serverClientsMap: Map<string, string[]>;
}

/**
 * Dev 모드용 패키지 분류.
 * Dev 모드용 패키지 분류. DevOrchestrator에서 사용한다.
 */
export function classifyDevPackages(
  allPackages: Record<string, SdPackageConfig>,
  cwd: string,
  pathMap: Map<string, string>,
): DevClassifiedPackages {
  logger.debug("dev 패키지 분류 시작");
  const serverPackages: DevClassifiedPackages["serverPackages"] = [];
  const clientPackages: DevClassifiedPackages["clientPackages"] = [];
  const serverClientsMap = new Map<string, string[]>();

  const entries = iteratePackages(allPackages, []);

  // 1차 패스: 서버 이름 수집
  const serverNames = new Set<string>();
  for (const { name, config } of entries) {
    if (config.target === "server") {
      serverNames.add(name);
    }
  }

  // 2차 패스: 모든 패키지 분류
  for (const { name, config } of entries) {
    const relPath = pathMap.get(name) ?? `packages/${name}`;
    const pkgDir = pathx.posix(path.join(cwd, relPath));
    if (config.target === "server") {
      serverPackages.push({
        name,
        dir: pkgDir,
        config: config,
      });
    } else if (config.target === "client") {
      clientPackages.push({
        name,
        dir: pkgDir,
        config: config,
      });

      // 서버-클라이언트 매핑 구성
      const clientConfig = config;
      if (typeof clientConfig.server === "string") {
        if (serverNames.has(clientConfig.server)) {
          const clients = serverClientsMap.get(clientConfig.server) ?? [];
          clients.push(name);
          serverClientsMap.set(clientConfig.server, clients);
        } else {
          process.stdout.write(
            `⚠ 클라이언트 "${name}"의 서버 "${clientConfig.server}"가 dev 대상에 없어 독립 실행됩니다.\n`,
          );
        }
      }
    }
    // 라이브러리 및 scripts 패키지는 dev 모드에서 제외
  }

  logger.debug(`dev 패키지 분류 완료 (server: ${serverPackages.length}, client: ${clientPackages.length})`);
  return { serverPackages, clientPackages, serverClientsMap };
}

//#endregion
