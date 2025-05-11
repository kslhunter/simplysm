/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertOrderingInterface() {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    let changed = false;

    // 1. import 교체
    for (const importDecl of sourceFile.getImportDeclarations()) {
      if (importDecl.getModuleSpecifierValue() !== "@simplysm/sd-angular") continue;

      const namedImports = importDecl.getNamedImports();

      let hasOld = false;
      let hasNew = false;

      for (const ni of namedImports) {
        const name = ni.getName();
        if (name === "ISdSheetColumnOrderingVM") {
          ni.remove(); // ← ✅ 이 방식으로 제거
          hasOld = true;
        }
        if (name === "ISortingDef") {
          hasNew = true;
        }
      }

      if (hasOld && !hasNew) {
        importDecl.addNamedImport("ISortingDef");
        changed = true;
        console.log(`[import-updated] ${sourceFile.getBaseName()} :: import 교체 완료`);
      }
    }

    // 2. 타입 참조 교체
    sourceFile.forEachDescendant((node) => {
      if (
        node.getKind() === SyntaxKind.TypeReference &&
        node.getText() === "ISdSheetColumnOrderingVM"
      ) {
        node.replaceWithText("ISortingDef");
        changed = true;
        console.log(`[type-replaced] ${sourceFile.getBaseName()} :: 타입 참조 변경`);
      }
    });

    if (changed) {
      sourceFile.saveSync();
    }
  }

  console.log("[완료] ISdSheetColumnOrderingVM → ISortingDef 변환 완료");
}
