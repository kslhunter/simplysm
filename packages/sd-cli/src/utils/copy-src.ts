import path from "path";
import { fsx, pathx, FsWatcher } from "@simplysm/core-node";

/**
 * glob 패턴에 매칭되는 파일을 src/에서 dist/로 복사한다.
 * 상대 경로가 유지된다: src/a/b.css → dist/a/b.css
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param patterns glob 패턴 배열 (src/ 기준 상대 경로)
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
 * glob 패턴에 매칭되는 파일을 src/에서 dist/로 감시하며 복사한다.
 * 초기 복사 후 변경, 추가, 삭제를 자동으로 반영한다.
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param patterns glob 패턴 배열 (src/ 기준 상대 경로)
 * @returns FsWatcher 인스턴스 (종료 시 close() 호출)
 */
export async function watchCopySrcFiles(pkgDir: string, patterns: string[]): Promise<FsWatcher> {
  const srcDir = pathx.posix(path.join(pkgDir, "src"));
  const distDir = pathx.posix(path.join(pkgDir, "dist"));

  // 초기 복사
  await copySrcFiles(pkgDir, patterns);

  // 감시 시작
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
