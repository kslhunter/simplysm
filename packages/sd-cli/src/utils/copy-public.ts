import path from "path";
import { fsCopy, fsMkdir, fsRm, fsGlob, FsWatcher, fsExists } from "@simplysm/core-node";

/**
 * public/ 및 public-dev/ 디렉토리의 파일을 dist/로 복사한다.
 * public-dev/가 public/보다 우선한다 (overlay).
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param includeDev public-dev/ 포함 여부 (dev 모드에서만 true)
 */
export async function copyPublicFiles(pkgDir: string, includeDev: boolean): Promise<void> {
  const distDir = path.join(pkgDir, "dist");
  await fsMkdir(distDir);

  // public/ 복사
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

  // public-dev/ 복사 (overlay: public/ 위에 덮어씀)
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
 * public/ 및 public-dev/ 디렉토리를 감시하여 dist/로 실시간 복사한다.
 * 초기 복사 후 변경/추가/삭제를 자동 반영한다.
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param includeDev public-dev/ 포함 여부 (dev 모드에서만 true)
 * @returns FsWatcher 인스턴스 (shutdown 시 close() 호출 필요) 또는 watch할 대상이 없으면 undefined
 */
export async function watchPublicFiles(pkgDir: string, includeDev: boolean): Promise<FsWatcher | undefined> {
  const distDir = path.join(pkgDir, "dist");
  const publicDir = path.join(pkgDir, "public");
  const publicDevDir = path.join(pkgDir, "public-dev");

  // 초기 복사
  await copyPublicFiles(pkgDir, includeDev);

  // watch 대상 경로 수집
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
      // 어느 소스 디렉토리에서 온 변경인지 판별
      let sourceDir: string;
      if (filePath.startsWith(publicDevDir + path.sep) || filePath.startsWith(publicDevDir + "/")) {
        sourceDir = publicDevDir;
      } else {
        sourceDir = publicDir;
      }

      const relPath = path.relative(sourceDir, filePath);
      const distPath = path.join(distDir, relPath);

      if (event === "unlink") {
        // public에서 삭제 시, public-dev에 같은 파일이 있으면 삭제하지 않음
        if (sourceDir === publicDir && includeDev) {
          const devOverride = path.join(publicDevDir, relPath);
          if (await fsExists(devOverride)) {
            continue;
          }
        }
        await fsRm(distPath);
      } else if (event === "add" || event === "change") {
        // public에서 변경 시, public-dev에 같은 파일이 있으면 overlay 우선이므로 스킵
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
