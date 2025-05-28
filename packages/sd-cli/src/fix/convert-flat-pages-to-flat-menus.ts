/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export function convertFlatPagesToUsableFlatMenus() {
  const sourceFiles = getTsMorphSourceFiles();
  let totalChanged = 0;

  for (const sourceFile of sourceFiles) {
    let changed = false;

    for (const cls of sourceFile.getClasses()) {
      // 1. flatPages property 선언 확인
      const prop = cls.getInstanceProperty("flatPages")?.asKind(SyntaxKind.PropertyDeclaration);
      if (!prop) continue;

      const initializer = prop.getInitializer();
      if (!initializer) continue;

      const callExpr = initializer.asKind(SyntaxKind.CallExpression);
      if (!callExpr) continue;

      const expr = callExpr.getExpression();
      if (
        expr.getKind() === SyntaxKind.PropertyAccessExpression &&
        expr.getText() === "this._sdAppStructure.getFlatPages"
      ) {
        // 2. 선언 변경
        prop.rename("flatMenus");
        prop.setInitializer("this._sdAppStructure.usableFlatMenus()");
        changed = true;
        console.log(`[변환됨] ${sourceFile.getBaseName()} → flatPages 선언 → flatMenus`);
      }

      // 3. 클래스 내 this.flatPages → this.flatMenus 치환
      cls.forEachDescendant((node) => {
        if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propAccess = node.asKind(SyntaxKind.PropertyAccessExpression)!;
          if (
            propAccess.getExpression().getKind() === SyntaxKind.ThisKeyword &&
            propAccess.getName() === "flatPages"
          ) {
            propAccess.replaceWithText("this.flatMenus");
            changed = true;
          }
        }
      });

      // 4. @Component의 template 내 문자열 치환
      const componentDecorator = cls.getDecorator("Component");
      const arg = componentDecorator?.getArguments()[0]?.asKind(SyntaxKind.ObjectLiteralExpression);
      const templateProp = arg?.getProperty("template")?.asKind(SyntaxKind.PropertyAssignment);
      const templateInit = templateProp?.getInitializer();
      if (
        templateInit &&
        (templateInit.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral ||
          templateInit.getKind() === SyntaxKind.StringLiteral ||
          templateInit.getKind() === SyntaxKind.TemplateExpression)
      ) {
        const originalText = templateInit.getText();
        const newText = originalText.replace(/\bflatPages\b/g, "flatMenus");

        if (newText !== originalText) {
          templateInit.replaceWithText(newText);
          changed = true;
          console.log(`[변환됨] ${sourceFile.getBaseName()} → 템플릿 내 flatPages → flatMenus`);
        }
      }
    }

    if (changed) {
      sourceFile.saveSync();
      totalChanged++;
      console.log(`[updated] ${sourceFile.getBaseName()} :: flatMenus 변환 완료`);
    }
  }

  console.log(
    totalChanged > 0
      ? `\n[완료] flatPages → flatMenus 전체 변환 완료 (총 ${totalChanged}개)`
      : `[완료] 변환 대상 없음`,
  );
}
