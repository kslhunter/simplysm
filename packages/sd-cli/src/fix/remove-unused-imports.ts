/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export function removeUnusedImports() {
  const sourceFiles = getTsMorphSourceFiles();
  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;

    for (const importDecl of sourceFile.getImportDeclarations()) {
      // ⚠️ 사이드이펙트 import는 유지
      if (importDecl.getNamedImports().length === 0) {
        continue;
      }

      // ⚙️ Named import 제거
      for (const namedImport of importDecl.getNamedImports()) {
        const name = namedImport.getName();
        const used = sourceFile
          .getDescendantsOfKind(SyntaxKind.Identifier)
          .some((id) => id.getText() === name && id !== namedImport.getNameNode());
        if (!used) {
          namedImport.remove();
          changed = true;
          console.log(`[정리됨] ${sourceFile.getBaseName()} → 미사용 import: ${name}`);
        }
      }

      // 모든 import가 제거된 경우 전체 import 선언 제거
      if (importDecl.getNamedImports().length === 0) {
        importDecl.remove();
        changed = true;
      }
    }

    if (changed) {
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[updated] ${sourceFile.getBaseName()} :: import 정리 완료`);
    }
  }

  console.log(
    totalChanged > 0
      ? `\n[완료] 미사용 import 정리 완료 (총 ${totalChanged}개)`
      : `[완료] 정리 대상 없음`,
  );
}
