import fs from "fs";
import path from "path";
import { globSync } from "glob";
import { pathx } from "@simplysm/core-node";

export interface WorkspacePackageDir {
  dirName: string;
  packageName: string;
  relPath: string;
  absPath: string;
}

interface WorkspaceRootPackageJson {
  workspaces?: unknown;
}

interface WorkspacePackageJson {
  name?: unknown;
}

/**
 * root package.json의 workspaces 값을 Bun workspace 패턴 배열로 정규화한다.
 */
export function parsePackageJsonWorkspaces(workspaces: unknown): string[] {
  const rawPatterns = Array.isArray(workspaces)
    ? workspaces
    : typeof workspaces === "object" && workspaces != null && Array.isArray((workspaces as { packages?: unknown }).packages)
      ? (workspaces as { packages: unknown[] }).packages
      : [];

  return rawPatterns
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

export function readWorkspacePatterns(workspaceRoot: string): string[] {
  const packageJsonPath = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) return [];

  const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8")) as WorkspaceRootPackageJson;
  return parsePackageJsonWorkspaces(pkgJson.workspaces);
}

export function findWorkspaceRoot(startDir: string): string | undefined {
  let current = path.resolve(startDir);
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }

  while (true) {
    if (readWorkspacePatterns(current).length > 0) {
      return pathx.posix(current);
    }

    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function splitWorkspacePatterns(patterns: string[]): { include: string[]; exclude: string[] } {
  const include: string[] = [];
  const exclude: string[] = [];

  for (const pattern of patterns) {
    if (pattern.startsWith("!")) {
      const excluded = pattern.slice(1).trim();
      if (excluded !== "") exclude.push(excluded);
    } else {
      include.push(pattern);
    }
  }

  return { include, exclude };
}

/**
 * Bun workspace root의 package.json#workspaces 기준으로 실제 패키지 디렉터리를 수집한다.
 */
export function collectWorkspacePackages(workspaceRoot: string): WorkspacePackageDir[] {
  const root = pathx.posix(path.resolve(workspaceRoot));
  const patterns = readWorkspacePatterns(root);
  const { include, exclude } = splitWorkspacePatterns(patterns);
  const absDirs = new Set<string>();

  for (const pattern of include) {
    const matches = globSync(pattern, {
      cwd: root,
      absolute: true,
      nodir: false,
      ignore: exclude,
    });

    for (const match of matches) {
      const absPath = pathx.posix(path.resolve(match));
      const packageJsonPath = path.join(absPath, "package.json");
      if (!fs.existsSync(packageJsonPath)) continue;
      if (!fs.statSync(absPath).isDirectory()) continue;
      absDirs.add(absPath);
    }
  }

  return [...absDirs]
    .sort((a, b) => a.localeCompare(b))
    .map((absPath): WorkspacePackageDir => {
      const relPath = pathx.posix(path.relative(root, absPath));
      const pkgJson = JSON.parse(fs.readFileSync(path.join(absPath, "package.json"), "utf-8")) as WorkspacePackageJson;
      const packageName = typeof pkgJson.name === "string" ? pkgJson.name : path.basename(absPath);
      return {
        dirName: path.basename(absPath),
        packageName,
        relPath,
        absPath,
      };
    });
}
