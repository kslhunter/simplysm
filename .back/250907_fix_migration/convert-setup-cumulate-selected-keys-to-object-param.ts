/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertSetupCumulateSelectedKeysToObjectParam() {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    let changed = false;

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;

      const callExpr = node.asKindOrThrow(SyntaxKind.CallExpression);
      const exprText = callExpr.getExpression().getText();

      if (exprText !== "setupCumulateSelectedKeys") return;
      const args = callExpr.getArguments();
      if (args.length !== 5) return;

      const [items, selectMode, selectedItems, selectedItemIds, keySelectorFn] = args;

      // 객체 리터럴 생성
      const newArgText = `{
        items: ${items.getText()},
        selectMode: ${selectMode.getText()},
        selectedItems: ${selectedItems.getText()},
        selectedItemKeys: ${selectedItemIds.getText()},
        keySelectorFn: ${keySelectorFn.getText()}
      }`;

      callExpr.replaceWithText(`setupCumulateSelectedKeys(${newArgText})`);
      changed = true;
      console.log(`[updated] ${sourceFile.getBaseName()} :: setupCumulateSelectedKeys 인자 구조 변경`);
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (changed) {
      sourceFile.saveSync();
    }
  }

  console.log("[완료] setupCumulateSelectedKeys → object parameter 구조 변환 완료");
}