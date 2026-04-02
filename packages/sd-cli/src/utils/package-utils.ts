import path from "path";
import fs from "fs";
import { consola } from "consola";
import { SdError } from "@simplysm/core-common";
import { pathx } from "@simplysm/core-node";
import type {
  BuildTarget,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdPackageConfig,
  SdScriptsPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";

const logger = consola.withTag("sd:cli:package-utils");

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
 * import.meta.dirname에서 위로 탐색하여 package.json을 찾고 패키지 루트를 반환한다.
 */
export function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(pathx.posix(path.join(dir, "package.json")))) {
    const parent = pathx.posix(path.dirname(dir));
    if (parent === dir) throw new Error("package.json not found");
    dir = parent;
  }
  return dir;
}

/**
 * packages/ 및 tests/ 디렉토리에서 모든 워크스페이스 패키지를 탐색한다.
 * 디렉토리명 → 상대 경로의 맵을 반환한다 (예: "orm" → "tests/orm").
 */
export function discoverWorkspacePackages(cwd: string): Map<string, string> {
  logger.debug("워크스페이스 패키지 탐색 시작");
  const map = new Map<string, string>();
  for (const dir of ["packages", "tests"]) {
    const baseDir = pathx.posix(path.join(cwd, dir));
    if (!fs.existsSync(baseDir)) continue;
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!fs.existsSync(pathx.posix(path.join(baseDir, entry.name, "package.json")))) continue;
      if (map.has(entry.name)) {
        throw new SdError(
          `Duplicate workspace package name: ${entry.name} (${map.get(entry.name)} and ${dir}/${entry.name})`,
        );
      }
      map.set(entry.name, `${dir}/${entry.name}`);
    }
  }
  logger.debug(`워크스페이스 패키지 탐색 완료 (${map.size}개)`);
  return map;
}

/**
 * sd.config.ts 패키지만으로 pathMap을 구성한다 (tests 패키지 제외).
 */
export function buildPathMapFromConfig(
  configPackages: Record<string, SdPackageConfig | undefined>,
): Map<string, string> {
  const pathMap = new Map<string, string>();
  for (const name of Object.keys(configPackages)) {
    pathMap.set(name, `packages/${name}`);
  }
  return pathMap;
}

/**
 * workspace에서 발견된 tests/ 패키지를 sd.config.ts 패키지에 병합한다.
 * tests 패키지는 기본적으로 `{ target: "node" }`가 할당된다.
 * 모든 패키지의 pathMap(name → 상대 경로)도 함께 구성한다.
 * tests 패키지명이 sd.config.ts 패키지명과 충돌하면 SdError를 던진다.
 */
export function mergeTestsPackagesIntoConfig(
  configPackages: Record<string, SdPackageConfig | undefined>,
  workspacePackages: Map<string, string>,
): { merged: Record<string, SdPackageConfig | undefined>; pathMap: Map<string, string> } {
  logger.debug("tests 패키지 병합 시작");
  const pathMap = new Map<string, string>();
  const merged: Record<string, SdPackageConfig | undefined> = { ...configPackages };

  // config 패키지의 기본 경로 설정
  for (const name of Object.keys(configPackages)) {
    pathMap.set(name, `packages/${name}`);
  }

  // tests 패키지 추가
  for (const [name, relPath] of workspacePackages) {
    if (!relPath.startsWith("tests/")) continue;

    if (name in configPackages) {
      throw new SdError(
        `Duplicate package name: "${name}" exists in both sd.config.ts and ${relPath}`,
      );
    }

    merged[name] = { target: "node" } as SdBuildPackageConfig;
    pathMap.set(name, relPath);
  }

  logger.debug(`tests 패키지 병합 완료 (총 ${Object.keys(merged).length}개)`);
  return { merged, pathMap };
}

export interface DepsResult {
  workspaceDeps: string[];
  replaceDeps: string[];
}

/**
 * pnpm-workspace.yaml 기반으로 workspace 패키지의 name → 상대 디렉토리 맵을 구성한다.
 * 예: "@simplysm/core-node" → "packages/core-node"
 */
function buildWorkspacePkgMap(cwd: string): Map<string, string> {
  const map = new Map<string, string>();
  const wsPkgs = discoverWorkspacePackages(cwd);
  for (const [, relDir] of wsPkgs) {
    const pkgJsonPath = pathx.posix(path.join(cwd, relDir, "package.json"));
    if (!fs.existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as { name: string };
    map.set(pkgJson.name, relDir);
  }
  return map;
}

export function collectDeps(
  pkgDir: string,
  cwd: string,
  replaceDepsConfig?: Record<string, string>,
): DepsResult {
  const startTime = performance.now();
  logger.debug("의존성 수집 시작");

  // pnpm-workspace.yaml에서 workspace 패키지 디렉토리 패턴을 읽어 실제 패키지 맵 구성
  const workspacePkgMap = buildWorkspacePkgMap(cwd);

  const replaceDepsPatterns: Array<{ regex: RegExp }> = [];
  if (replaceDepsConfig != null) {
    for (const pattern of Object.keys(replaceDepsConfig)) {
      const regexStr = pattern.replace(/[.+]/g, (ch) => `\\${ch}`).replace(/\*/g, "[^/]+");
      replaceDepsPatterns.push({ regex: new RegExp(`^${regexStr}$`) });
    }
  }

  const workspaceDeps: string[] = [];
  const replaceDeps: string[] = [];
  const visited = new Set<string>();

  function traverse(dir: string): void {
    const pkgJsonPath = pathx.posix(path.join(dir, "package.json"));
    if (!fs.existsSync(pkgJsonPath)) return;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkgJson.dependencies ?? {});

    for (const dep of deps) {
      if (visited.has(dep)) continue;
      visited.add(dep);

      // 워크스페이스 패키지 확인
      const wsDir = workspacePkgMap.get(dep);
      if (wsDir != null) {
        workspaceDeps.push(path.basename(wsDir));
        traverse(pathx.posix(path.join(cwd, wsDir)));
        continue;
      }

      // replaceDeps 패턴 확인
      const matched = replaceDepsPatterns.find((p) => p.regex.test(dep));
      if (matched != null) {
        replaceDeps.push(dep);
        const depNodeModulesDir = pathx.posix(path.join(cwd, "node_modules", ...dep.split("/")));
        if (fs.existsSync(pathx.posix(path.join(depNodeModulesDir, "package.json")))) {
          traverse(depNodeModulesDir);
        }
        continue;
      }
    }
  }

  traverse(pkgDir);
  logger.debug(
    `의존성 수집 완료: workspace=${String(workspaceDeps.length)}, replace=${String(replaceDeps.length)} (${Math.round(performance.now() - startTime)}ms)`,
  );
  return { workspaceDeps, replaceDeps };
}

/**
 * 지정된 디렉토리의 package.json에 @angular/core가
 * dependencies 또는 peerDependencies에 있는지 확인한다.
 */
export function hasAngularCoreDependency(pkgDir: string): boolean {
  const pkgJsonPath = pathx.posix(path.join(pkgDir, "package.json"));
  if (!fs.existsSync(pkgJsonPath)) return false;
  try {
    const content = fs.readFileSync(pkgJsonPath, "utf-8");
    const pkgJson: {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    } = JSON.parse(content);
    const deps = pkgJson.dependencies ?? {};
    const peerDeps = pkgJson.peerDependencies ?? {};
    return "@angular/core" in deps || "@angular/core" in peerDeps;
  } catch {
    return false;
  }
}

/**
 * 모든 target 이름이 sdConfig 패키지에 존재하는지 검증한다.
 * 알 수 없는 target이 발견되면 SdError를 던진다.
 * targets가 비어있으면 아무 동작도 하지 않는다.
 * @param targets - 검증할 패키지명 목록
 * @param packages - sdConfig.packages 객체
 */
export function validateTargets(
  targets: string[],
  packages: Record<string, unknown>,
): void {
  if (targets.length === 0) return;
  const packageNames = Object.keys(packages);
  const unknown = targets.filter((t) => !packageNames.includes(t));
  if (unknown.length > 0) {
    throw new SdError(`Unknown target: ${unknown.join(", ")}`);
  }
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
 * DevWatchOrchestrator._classifyWatchPackages에서 추출한 standalone 함수.
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
 * DevWatchOrchestrator._classifyDevPackages에서 추출한 standalone 함수.
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
