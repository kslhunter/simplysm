import path from "path";
import fs from "fs";
import type { SdPackageConfig } from "../sd-config.types";

/**
 * import.meta.dirname에서 상위로 올라가며 package.json을 찾아 패키지 루트를 반환한다.
 */
export function findPackageRoot(startDir: string): string {
  let dir = startDir;
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json을 찾을 수 없습니다.");
    dir = parent;
  }
  return dir;
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

      // workspace package check
      if (workspaceScope != null && dep.startsWith(workspaceScope + "/")) {
        const dirName = dep.slice(workspaceScope.length + 1);
        const depDir = path.join(cwd, "packages", dirName);
        if (fs.existsSync(path.join(depDir, "package.json"))) {
          workspaceDeps.push(dirName);
          traverse(depDir);
          continue;
        }
      }

      // replaceDeps pattern check
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
  return { workspaceDeps, replaceDeps };
}

/**
 * 패키지 결과 상태
 */
export interface PackageResult {
  name: string;
  target: string;
  type: "build" | "dts" | "server" | "capacitor";
  status: "success" | "error" | "running";
  message?: string;
  port?: number;
}

/**
 * 패키지 설정에서 targets 필터링 (scripts 타겟 제외)
 * @param packages 패키지 설정 맵
 * @param targets 필터링할 패키지 이름 목록. 빈 배열이면 scripts를 제외한 모든 패키지 반환
 * @returns 필터링된 패키지 설정 맵
 * @internal 테스트용으로 export
 */
export function filterPackagesByTargets(
  packages: Record<string, SdPackageConfig | undefined>,
  targets: string[],
): Record<string, SdPackageConfig> {
  const result: Record<string, SdPackageConfig> = {};

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;

    // scripts 타겟은 watch/dev 대상에서 제외
    if (config.target === "scripts") continue;

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

  return result;
}
