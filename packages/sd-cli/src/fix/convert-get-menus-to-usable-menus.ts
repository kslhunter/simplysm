/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export function convertGetMenusToUsableMenus() {
  const sourceFiles = getTsMorphSourceFiles();
  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;

    for (const cls of sourceFile.getClasses()) {
      const menusProp = cls.getInstanceProperty("menus")?.asKind(SyntaxKind.PropertyDeclaration);
      if (!menusProp) continue;

      const initializer = menusProp.getInitializer()?.asKind(SyntaxKind.CallExpression);
      if (
        !initializer ||
        initializer.getFirstChildByKind(SyntaxKind.Identifier)?.getText() !== "$computed"
      ) {
        continue;
      }

      const arrowFn = initializer
        .asKind(SyntaxKind.CallExpression)
        ?.getArguments()
        .first()
        ?.asKind(SyntaxKind.ArrowFunction);
      if (!arrowFn) continue;

      const body = arrowFn.getBody().asKind(SyntaxKind.CallExpression);
      if (!body || !body.getText().includes("this._sdAppStructure.getMenus")) {
        continue;
      }

      const callExpr = body.asKind(SyntaxKind.CallExpression)!;
      const calleeExpr = callExpr.getExpression();
      if (
        calleeExpr.getKind() === SyntaxKind.PropertyAccessExpression &&
        calleeExpr.getText() === "this._sdAppStructure.getMenus"
      ) {
        // 수정 실행: getMenus → usableMenus
        calleeExpr.replaceWithText("this._sdAppStructure.usableMenus");
        changed = true;
      }
    }

    if (changed) {
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[updated] ${sourceFile.getBaseName()} :: menus → usableMenus 변경 완료`);
    }
  }

  console.log(
    totalChanged > 0
      ? `\n[완료] usableMenus 변경 완료 (총 ${totalChanged}개)`
      : `[완료] 변환 대상 없음`,
  );
}
