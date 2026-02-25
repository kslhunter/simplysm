import path from "path";
import {
  fsCopy,
  fsMkdir,
  fsRm,
  fsGlob,
  FsWatcher,
  fsExists,
  pathIsChildPath,
} from "@simplysm/core-node";

/**
 * Copy files from public/ and public-dev/ directories to dist/.
 * public-dev/ takes priority over public/ (overlay).
 *
 * @param pkgDir Package root directory
 * @param includeDev Whether to include public-dev/ (true only in dev mode)
 */
export async function copyPublicFiles(pkgDir: string, includeDev: boolean): Promise<void> {
  const distDir = path.join(pkgDir, "dist");
  await fsMkdir(distDir);

  // Copy public/
  const publicDir = path.join(pkgDir, "public");
  if (await fsExists(publicDir)) {
    const files = await fsGlob("**/*", { cwd: publicDir, absolute: true });
    for (const file of files) {
      const relativePath = path.relative(publicDir, file);
      const distPath = path.join(distDir, relativePath);
      await fsMkdir(path.dirname(distPath));
      await fsCopy(file, distPath);
    }
  }

  // Copy public-dev/ (overlay: overwrites public/)
  if (includeDev) {
    const publicDevDir = path.join(pkgDir, "public-dev");
    if (await fsExists(publicDevDir)) {
      const files = await fsGlob("**/*", { cwd: publicDevDir, absolute: true });
      for (const file of files) {
        const relativePath = path.relative(publicDevDir, file);
        const distPath = path.join(distDir, relativePath);
        await fsMkdir(path.dirname(distPath));
        await fsCopy(file, distPath);
      }
    }
  }
}

/**
 * Watch public/ and public-dev/ directories and copy files to dist/ in real-time.
 * Automatically reflects changes/additions/deletions after initial copy.
 *
 * @param pkgDir Package root directory
 * @param includeDev Whether to include public-dev/ (true only in dev mode)
 * @returns FsWatcher instance (must call close() on shutdown) or undefined if no watch targets
 */
export async function watchPublicFiles(
  pkgDir: string,
  includeDev: boolean,
): Promise<FsWatcher | undefined> {
  const distDir = path.join(pkgDir, "dist");
  const publicDir = path.join(pkgDir, "public");
  const publicDevDir = path.join(pkgDir, "public-dev");

  // Initial copy
  await copyPublicFiles(pkgDir, includeDev);

  // Collect watch target paths
  const watchPaths: string[] = [];
  if (await fsExists(publicDir)) {
    watchPaths.push(path.join(publicDir, "**/*"));
  }
  if (includeDev && (await fsExists(publicDevDir))) {
    watchPaths.push(path.join(publicDevDir, "**/*"));
  }

  if (watchPaths.length === 0) {
    return undefined;
  }

  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      // Determine which source directory the change came from
      let sourceDir: string;
      if (pathIsChildPath(filePath, publicDevDir)) {
        sourceDir = publicDevDir;
      } else {
        sourceDir = publicDir;
      }

      const relPath = path.relative(sourceDir, filePath);
      const distPath = path.join(distDir, relPath);

      if (event === "unlink") {
        // If deleted from public, don't delete if same file exists in public-dev
        if (sourceDir === publicDir && includeDev) {
          const devOverride = path.join(publicDevDir, relPath);
          if (await fsExists(devOverride)) {
            continue;
          }
        }
        // If deleted from public-dev, restore from public if it exists (fallback restore)
        if (sourceDir === publicDevDir && includeDev) {
          const publicFallback = path.join(publicDir, relPath);
          if (await fsExists(publicFallback)) {
            await fsMkdir(path.dirname(distPath));
            await fsCopy(publicFallback, distPath);
            continue;
          }
        }
        await fsRm(distPath);
      } else if (event === "add" || event === "change") {
        // If changed in public, skip if same file exists in public-dev (overlay takes priority)
        if (sourceDir === publicDir && includeDev) {
          const devOverride = path.join(publicDevDir, relPath);
          if (await fsExists(devOverride)) {
            continue;
          }
        }
        await fsMkdir(path.dirname(distPath));
        await fsCopy(filePath, distPath);
      }
    }
  });

  return watcher;
}
