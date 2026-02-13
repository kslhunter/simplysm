import path from "path";
import { fsGlob, fsCopy, fsMkdir, fsRm, FsWatcher } from "@simplysm/core-node";

/**
 * src/에서 glob 패턴에 매칭되는 파일을 dist/로 복사한다.
 * 상대 경로가 유지된다: src/a/b.css → dist/a/b.css
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param patterns glob 패턴 배열 (src/ 기준 상대 경로)
 */
export async function copySrcFiles(pkgDir: string, patterns: string[]): Promise<void> {
  const srcDir = path.join(pkgDir, "src");
  const distDir = path.join(pkgDir, "dist");

  for (const pattern of patterns) {
    const files = await fsGlob(pattern, { cwd: srcDir, absolute: true });
    for (const file of files) {
      const relativePath = path.relative(srcDir, file);
      const distPath = path.join(distDir, relativePath);
      await fsMkdir(path.dirname(distPath));
      await fsCopy(file, distPath);
    }
  }
}

/**
 * src/에서 glob 패턴에 매칭되는 파일을 감시하여 dist/로 복사한다.
 * 초기 복사 후 변경/추가/삭제를 자동 반영한다.
 *
 * @param pkgDir 패키지 루트 디렉토리
 * @param patterns glob 패턴 배열 (src/ 기준 상대 경로)
 * @returns FsWatcher 인스턴스 (shutdown 시 close() 호출 필요)
 */
export async function watchCopySrcFiles(pkgDir: string, patterns: string[]): Promise<FsWatcher> {
  const srcDir = path.join(pkgDir, "src");
  const distDir = path.join(pkgDir, "dist");

  // 초기 복사
  await copySrcFiles(pkgDir, patterns);

  // watch 시작
  const watchPaths = patterns.map((p) => path.join(srcDir, p));
  const watcher = await FsWatcher.watch(watchPaths);

  watcher.onChange({ delay: 300 }, async (changes) => {
    for (const { event, path: filePath } of changes) {
      const relPath = path.relative(srcDir, filePath);
      const distPath = path.join(distDir, relPath);

      if (event === "unlink") {
        await fsRm(distPath);
      } else if (event === "add" || event === "change") {
        await fsMkdir(path.dirname(distPath));
        await fsCopy(filePath, distPath);
      }
    }
  });

  return watcher;
}
