import path from "path";
import {
  fsx,
  pathx,
  FsWatcher,
} from "@simplysm/core-node";

/**
 * public/ 및 public-dev/ 디렉토리의 파일을 dist/로 복사한다.
 * public-dev/가 public/보다 우선한다 (오버레이).
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param includeDev public-dev/ 포함 여부 (dev 모드에서만 true)
 */
export async function copyPublicFiles(pkgDir: string, includeDev: boolean): Promise<void> {
  const distDir = pathx.posix(path.join(pkgDir, "dist"));
  await fsx.mkdir(distDir);

  // public/ 복사
  const publicDir = pathx.posix(path.join(pkgDir, "public"));
  if (await fsx.exists(publicDir)) {
    const files = await fsx.glob("**/*", { cwd: publicDir, absolute: true });
    await Promise.all(
      files.map(async (file) => {
        const relativePath = pathx.posix(path.relative(publicDir, file));
        const distPath = pathx.posix(path.join(distDir, relativePath));
        await fsx.mkdir(pathx.posix(path.dirname(distPath)));
        await fsx.copy(file, distPath);
      }),
    );
  }

  // public-dev/ 복사 (오버레이: public/ 덮어쓰기)
  if (includeDev) {
    const publicDevDir = pathx.posix(path.join(pkgDir, "public-dev"));
    if (await fsx.exists(publicDevDir)) {
      const files = await fsx.glob("**/*", { cwd: publicDevDir, absolute: true });
      await Promise.all(
        files.map(async (file) => {
          const relativePath = pathx.posix(path.relative(publicDevDir, file));
          const distPath = pathx.posix(path.join(distDir, relativePath));
          await fsx.mkdir(pathx.posix(path.dirname(distPath)));
          await fsx.copy(file, distPath);
        }),
      );
    }
  }
}

/**
 * public/ 및 public-dev/ 디렉토리를 감시하고 변경사항을 실시간으로 dist/에 복사한다.
 * 초기 복사 후 변경/추가/삭제를 자동으로 반영한다.
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param includeDev public-dev/ 포함 여부 (dev 모드에서만 true)
 * @returns FsWatcher 인스턴스 (종료 시 close() 호출 필요) 또는 감시 대상이 없으면 undefined
 */
export async function watchPublicFiles(
  pkgDir: string,
  includeDev: boolean,
): Promise<FsWatcher | undefined> {
  const distDir = pathx.posix(path.join(pkgDir, "dist"));
  const publicDir = pathx.posix(path.join(pkgDir, "public"));
  const publicDevDir = pathx.posix(path.join(pkgDir, "public-dev"));

  // 초기 복사
  await copyPublicFiles(pkgDir, includeDev);

  // 감시 대상 경로 수집
  const watchPaths: string[] = [];
  if (await fsx.exists(publicDir)) {
    watchPaths.push(pathx.posix(path.join(publicDir, "**/*")));
  }
  if (includeDev && (await fsx.exists(publicDevDir))) {
    watchPaths.push(pathx.posix(path.join(publicDevDir, "**/*")));
  }

  if (watchPaths.length === 0) {
    return undefined;
  }

  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      // 변경이 발생한 소스 디렉토리 결정
      let sourceDir: string;
      if (pathx.isChildPath(filePath, publicDevDir)) {
        sourceDir = publicDevDir;
      } else {
        sourceDir = publicDir;
      }

      const relPath = pathx.posix(path.relative(sourceDir, filePath));
      const distPath = pathx.posix(path.join(distDir, relPath));

      if (event === "unlink") {
        // public에서 삭제된 경우, public-dev에 같은 파일이 있으면 삭제하지 않음
        if (sourceDir === publicDir && includeDev) {
          const devOverride = pathx.posix(path.join(publicDevDir, relPath));
          if (await fsx.exists(devOverride)) {
            continue;
          }
        }
        // public-dev에서 삭제된 경우, public에 파일이 있으면 복원 (폴백 복원)
        if (sourceDir === publicDevDir && includeDev) {
          const publicFallback = pathx.posix(path.join(publicDir, relPath));
          if (await fsx.exists(publicFallback)) {
            await fsx.mkdir(pathx.posix(path.dirname(distPath)));
            await fsx.copy(publicFallback, distPath);
            continue;
          }
        }
        await fsx.rm(distPath);
      } else if (event === "add" || event === "change") {
        // public에서 변경된 경우, public-dev에 같은 파일이 있으면 스킵 (오버레이 우선)
        if (sourceDir === publicDir && includeDev) {
          const devOverride = pathx.posix(path.join(publicDevDir, relPath));
          if (await fsx.exists(devOverride)) {
            continue;
          }
        }
        await fsx.mkdir(pathx.posix(path.dirname(distPath)));
        await fsx.copy(filePath, distPath);
      }
    }
  });

  return watcher;
}
