import path from "path";
import { fsGlob, fsCopy, fsMkdir } from "@simplysm/core-node";

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
