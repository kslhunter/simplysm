import { pathx } from "@simplysm/core-node";
import { collectDeps, type DepsResult } from "../deps/replace-deps/collect-deps";

export interface BuildWatchPathsOptions {
  pkgDir: string;
  cwd: string;
  /** 자체 src 디렉토리 내 glob 패턴 (예: "*.ts", "*.{ts,scss,css}", "*") */
  srcGlobs: string[];
  /** src 외에 추가로 감시할 디렉토리와 해당 glob */
  extraDirs?: Array<{ dir: string; globs: string[] }>;
  /** sd.config.ts의 replaceDeps 설정 */
  replaceDeps?: Record<string, string>;
}

export interface BuildWatchPathsResult {
  watchPaths: string[];
  deps: DepsResult;
}

export function buildWatchPaths(options: BuildWatchPathsOptions): BuildWatchPathsResult {
  const { pkgDir, cwd, srcGlobs, extraDirs, replaceDeps: replaceDepsConfig } = options;
  const deps = collectDeps(pkgDir, cwd, replaceDepsConfig);

  const watchDirs = [
    pkgDir,
    ...deps.workspaceDeps.map((d) => pathx.posixResolve(cwd, "packages", d)),
  ];

  const watchPaths: string[] = [];

  for (const dir of watchDirs) {
    for (const glob of srcGlobs) {
      watchPaths.push(pathx.posixResolve(dir, "src", "**", glob));
    }
    if (extraDirs != null) {
      for (const extra of extraDirs) {
        for (const glob of extra.globs) {
          watchPaths.push(pathx.posixResolve(dir, extra.dir, "**", glob));
        }
      }
    }
  }

  for (const pkg of deps.replaceDeps) {
    watchPaths.push(
      pathx.posixResolve(cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs,d.ts,d.mts,d.cts}"),
    );
    watchPaths.push(
      pathx.posixResolve(pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs,d.ts,d.mts,d.cts}"),
    );
  }

  return { watchPaths, deps };
}
