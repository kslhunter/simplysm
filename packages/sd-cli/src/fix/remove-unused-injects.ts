/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export function removeUnusedInjects() {
  const sourceFiles = getTsMorphSourceFiles();
  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;

    for (const cls of sourceFile.getClasses()) {
      const injectVars = cls
        .getInstanceProperties()
        .filter(
          (p) =>
            p.isKind(SyntaxKind.PropertyDeclaration) &&
            p.getInitializer()?.isKind(SyntaxKind.CallExpression) &&
            p.getInitializer()!.getText().startsWith("inject("),
        );

      for (const propDecl of injectVars) {
        const name = propDecl.getName();

        // 클래스 전체에서 해당 변수명이 참조되고 있는지 확인
        const references = cls
          .getDescendants()
          .filter((desc) => desc.getText() === name && desc !== propDecl.getNameNode());

        if (references.length === 0) {
          propDecl.remove();
          changed = true;
          console.log(`[정리됨] ${sourceFile.getBaseName()} → 미사용 inject: ${name}`);
        }
      }
    }

    if (changed) {
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[updated] ${sourceFile.getBaseName()} :: inject 정리 완료`);
    }
  }

  console.log(
    totalChanged > 0
      ? `\n[완료] 미사용 inject 정리 완료 (총 ${totalChanged}개)`
      : `[완료] 정리 대상 없음`,
  );
}
