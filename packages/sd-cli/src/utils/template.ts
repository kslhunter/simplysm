import path from "path";
import Handlebars from "handlebars";
import { fsCopy, fsMkdir, fsRead, fsReaddir, fsStat, fsWrite } from "@simplysm/core-node";

/**
 * Recursively traverse template directory, render with Handlebars, and generate files
 *
 * - `.hbs` extension files: Compile with Handlebars → save with `.hbs` removed from name
 * - If `.hbs` result is empty string/whitespace only: skip file creation
 * - Other files: copy as-is (binary)
 *
 * @param srcDir - Template source directory
 * @param destDir - 출력 대상 디렉토리
 * @param context - Handlebars 템플릿 변수
 * @param dirReplacements - 디렉토리 이름 치환 맵 (예: `{ __CLIENT__: "client-admin" }`)
 */
export async function renderTemplateDir(
  srcDir: string,
  destDir: string,
  context: Record<string, unknown>,
  dirReplacements?: Record<string, string>,
): Promise<void> {
  await fsMkdir(destDir);

  const entries = await fsReaddir(srcDir);

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const stat = await fsStat(srcPath);

    if (stat.isDirectory()) {
      // 디렉토리 이름 치환 적용
      const destName = dirReplacements?.[entry] ?? entry;
      await renderTemplateDir(
        path.join(srcDir, entry),
        path.join(destDir, destName),
        context,
        dirReplacements,
      );
    } else if (entry.endsWith(".hbs")) {
      // Handlebars 템플릿 렌더링
      const source = await fsRead(srcPath);
      const template = Handlebars.compile(source, { noEscape: true });
      const result = template(context);

      // 빈 결과면 파일 생성 스킵
      if (result.trim().length === 0) continue;

      const destFileName = entry.slice(0, -4); // .hbs 제거
      await fsWrite(path.join(destDir, destFileName), result);
    } else {
      // 바이너리 파일은 그대로 복사
      await fsCopy(srcPath, path.join(destDir, entry));
    }
  }
}
