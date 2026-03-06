import path from "path";
import { fsx, FsWatcher } from "@simplysm/core-node";

/**
 * Copy files matching glob patterns from src/ to dist/
 * Relative paths are preserved: src/a/b.css → dist/a/b.css
 *
 * @param pkgDir Package root directory
 * @param patterns Array of glob patterns (relative to src/)
 */
export async function copySrcFiles(pkgDir: string, patterns: string[]): Promise<void> {
  const srcDir = path.join(pkgDir, "src");
  const distDir = path.join(pkgDir, "dist");

  for (const pattern of patterns) {
    const files = await fsx.glob(pattern, { cwd: srcDir, absolute: true });
    for (const file of files) {
      const relativePath = path.relative(srcDir, file);
      const distPath = path.join(distDir, relativePath);
      await fsx.mkdir(path.dirname(distPath));
      await fsx.copy(file, distPath);
    }
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
  const srcDir = path.join(pkgDir, "src");
  const distDir = path.join(pkgDir, "dist");

  // Initial copy
  await copySrcFiles(pkgDir, patterns);

  // Start watch
  const watchPaths = patterns.map((p) => path.join(srcDir, p));
  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      const relPath = path.relative(srcDir, filePath);
      const distPath = path.join(distDir, relPath);

      if (event === "unlink") {
        await fsx.rm(distPath);
      } else if (event === "add" || event === "change") {
        await fsx.mkdir(path.dirname(distPath));
        await fsx.copy(filePath, distPath);
      }
    }
  });

  return watcher;
}
