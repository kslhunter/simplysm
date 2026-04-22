import path from "path";
import fs from "fs";
import { SdError } from "@simplysm/core-common";
import { pathx } from "@simplysm/core-node";
import { createLazyLogger } from "../runtime/lazy-logger";
import type {
  SdPackageConfig,
} from "../sd-config.types";

const logger = createLazyLogger("sd:cli:package-utils");

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

    merged[name] = { target: "node" };
    pathMap.set(name, relPath);
  }

  logger.debug(`tests 패키지 병합 완료 (총 ${Object.keys(merged).length}개)`);
  return { merged, pathMap };
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

