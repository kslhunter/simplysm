import path from "path";
import fs from "fs";
import { pathx } from "@simplysm/core-node";
import { createLazyLogger } from "../../runtime/lazy-logger";
import { discoverWorkspacePackages } from "../../utils/package-utils";

const logger = createLazyLogger("sd:cli:collect-deps");

export interface DepsResult {
  workspaceDeps: string[];
  replaceDeps: string[];
}

/**
 * 워크스페이스 디렉토리(packages/, tests/) 스캔 기반으로 packages/ 패키지의 name → 상대 디렉토리 맵을 구성한다.
 * tests/ 패키지는 제외된다.
 * 예: "@simplysm/core-node" → "packages/core-node"
 */
function buildWorkspacePkgMap(cwd: string): Map<string, string> {
  const map = new Map<string, string>();
  const wsPkgs = discoverWorkspacePackages(cwd);
  for (const [, relDir] of wsPkgs) {
    if (relDir.startsWith("tests/")) continue;
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

  // 워크스페이스 디렉토리 스캔으로 packages/ 패키지 맵 구성 (tests/ 제외)
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
