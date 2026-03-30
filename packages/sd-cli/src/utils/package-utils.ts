import path from "path";
import fs from "fs";
import { consola } from "consola";
import { SdError } from "@simplysm/core-common";
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
 * Walk up from import.meta.dirname to find package.json and return package root
 */
export function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json not found");
    dir = parent;
  }
  return dir;
}

/**
 * Discover all workspace packages from packages/ and tests/ directories.
 * Returns a map of directory name → relative path (e.g., "orm" → "tests/orm").
 */
export function discoverWorkspacePackages(cwd: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const dir of ["packages", "tests"]) {
    const baseDir = path.join(cwd, dir);
    if (!fs.existsSync(baseDir)) continue;
    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!fs.existsSync(path.join(baseDir, entry.name, "package.json"))) continue;
      if (map.has(entry.name)) {
        throw new SdError(
          `Duplicate workspace package name: ${entry.name} (${map.get(entry.name)} and ${dir}/${entry.name})`,
        );
      }
      map.set(entry.name, `${dir}/${entry.name}`);
    }
  }
  return map;
}

/**
 * Merge tests/ packages discovered from workspace into sd.config.ts packages.
 * Tests packages are assigned `{ target: "node" }` by default.
 * Also builds a pathMap (name → relative path) for all packages.
 * Throws SdError if a tests package name collides with an sd.config.ts package name.
 */
export function mergeTestsPackagesIntoConfig(
  configPackages: Record<string, SdPackageConfig | undefined>,
  workspacePackages: Map<string, string>,
): { merged: Record<string, SdPackageConfig | undefined>; pathMap: Map<string, string> } {
  const pathMap = new Map<string, string>();
  const merged: Record<string, SdPackageConfig | undefined> = { ...configPackages };

  // Set default paths for config packages
  for (const name of Object.keys(configPackages)) {
    pathMap.set(name, `packages/${name}`);
  }

  // Add tests packages
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

  return { merged, pathMap };
}

export interface DepsResult {
  workspaceDeps: string[];
  replaceDeps: string[];
}

export function collectDeps(
  pkgDir: string,
  cwd: string,
  replaceDepsConfig?: Record<string, string>,
): DepsResult {
  const startTime = performance.now();
  logger.debug("의존성 수집 시작");
  const rootPkgJsonPath = path.join(cwd, "package.json");
  const rootPkgJson = JSON.parse(fs.readFileSync(rootPkgJsonPath, "utf-8")) as { name: string };
  const scopeMatch = rootPkgJson.name.match(/^(@[^/]+)\//);
  const workspaceScope = scopeMatch != null ? scopeMatch[1] : undefined;

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
    const pkgJsonPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return;

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkgJson.dependencies ?? {});

    for (const dep of deps) {
      if (visited.has(dep)) continue;
      visited.add(dep);

      // Check for workspace package
      if (workspaceScope != null && dep.startsWith(workspaceScope + "/")) {
        const dirName = dep.slice(workspaceScope.length + 1);
        const depDir = path.join(cwd, "packages", dirName);
        if (fs.existsSync(path.join(depDir, "package.json"))) {
          workspaceDeps.push(dirName);
          traverse(depDir);
          continue;
        }
      }

      // Check replaceDeps pattern
      const matched = replaceDepsPatterns.find((p) => p.regex.test(dep));
      if (matched != null) {
        replaceDeps.push(dep);
        const depNodeModulesDir = path.join(cwd, "node_modules", ...dep.split("/"));
        if (fs.existsSync(path.join(depNodeModulesDir, "package.json"))) {
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
 * Check if package.json in the given directory has @angular/core
 * in dependencies or peerDependencies.
 */
export function hasAngularCoreDependency(pkgDir: string): boolean {
  const pkgJsonPath = path.join(pkgDir, "package.json");
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
 * Validate that all target names exist in the sdConfig packages.
 * Throws SdError if any unknown targets are found.
 * Does nothing when targets is empty.
 * @param targets - package name list to validate
 * @param packages - sdConfig.packages object
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
 * Filter packages config by targets (excluding scripts target)
 * @param packages Package config map
 * @param targets List of package names to filter. If empty array, return all packages except scripts
 * @returns Filtered package config map
 * @internal exported for testing
 */
export function filterPackagesByTargets(
  packages: Record<string, SdPackageConfig | undefined>,
  targets: string[],
): Record<string, SdPackageConfig> {
  const result: Record<string, SdPackageConfig> = {};

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;

    // Exclude scripts target unless watch hook is configured
    if (config.target === "scripts" && config.watch == null) continue;

    // If targets is empty, include all packages
    if (targets.length === 0) {
      result[name] = config;
      continue;
    }

    // Filter only packages included in targets
    if (targets.includes(name)) {
      result[name] = config;
    }
  }

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
  const libraryPackages: WatchClassifiedPackages["libraryPackages"] = [];
  const watchHookPackages: WatchClassifiedPackages["watchHookPackages"] = [];

  for (const { name, config } of iteratePackages(allPackages, [])) {
    const relPath = pathMap.get(name) ?? `packages/${name}`;
    const pkgDir = path.join(cwd, relPath);
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
  const serverPackages: DevClassifiedPackages["serverPackages"] = [];
  const clientPackages: DevClassifiedPackages["clientPackages"] = [];
  const serverClientsMap = new Map<string, string[]>();

  const entries = iteratePackages(allPackages, []);

  // First pass: collect server names
  const serverNames = new Set<string>();
  for (const { name, config } of entries) {
    if (config.target === "server") {
      serverNames.add(name);
    }
  }

  // Second pass: classify all packages
  for (const { name, config } of entries) {
    const relPath = pathMap.get(name) ?? `packages/${name}`;
    const pkgDir = path.join(cwd, relPath);
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

      // Build server-client mapping
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
    // Library and scripts packages are excluded from dev mode
  }

  return { serverPackages, clientPackages, serverClientsMap };
}

//#endregion
