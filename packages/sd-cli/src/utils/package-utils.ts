import path from "path";
import fs from "fs";
import type { SdPackageConfig } from "../sd-config.types";

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
  return { workspaceDeps, replaceDeps };
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

    // Exclude scripts target from watch/dev targets
    if (config.target === "scripts") continue;

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
