import path from "path";
import { fsx, pathx, FsWatcher } from "@simplysm/core-node";

/**
 * Copy files matching glob patterns from src/ to dist/
 * Relative paths are preserved: src/a/b.css → dist/a/b.css
 *
 * @param pkgDir Package root directory
 * @param patterns Array of glob patterns (relative to src/)
 */
export async function copySrcFiles(pkgDir: string, patterns: string[]): Promise<void> {
  const srcDir = pathx.posix(path.join(pkgDir, "src"));
  const distDir = pathx.posix(path.join(pkgDir, "dist"));

  for (const pattern of patterns) {
    const files = await fsx.glob(pattern, { cwd: srcDir, absolute: true });
    await Promise.all(
      files.map(async (file) => {
        const relativePath = pathx.posix(path.relative(srcDir, file));
        const distPath = pathx.posix(path.join(distDir, relativePath));
        await fsx.mkdir(pathx.posix(path.dirname(distPath)));
        await fsx.copy(file, distPath);
      }),
    );
  }
}

/**
 * Watch and copy files matching glob patterns from src/ to dist/
 * Automatically reflects changes, additions, and deletions after initial copy.
 *
 * @param pkgDir Package root directory
 * @param patterns Array of glob patterns (relative to src/)
 * @returns FsWatcher instance (call close() on shutdown)
 */
export async function watchCopySrcFiles(pkgDir: string, patterns: string[]): Promise<FsWatcher> {
  const srcDir = pathx.posix(path.join(pkgDir, "src"));
  const distDir = pathx.posix(path.join(pkgDir, "dist"));

  // Initial copy
  await copySrcFiles(pkgDir, patterns);

  // Start watch
  const watchPaths = patterns.map((p) => pathx.posix(path.join(srcDir, p)));
  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      const relPath = pathx.posix(path.relative(srcDir, filePath));
      const distPath = pathx.posix(path.join(distDir, relPath));

      if (event === "unlink") {
        await fsx.rm(distPath);
      } else if (event === "add" || event === "change") {
        await fsx.mkdir(pathx.posix(path.dirname(distPath)));
        await fsx.copy(filePath, distPath);
      }
    }
  });

  return watcher;
}
