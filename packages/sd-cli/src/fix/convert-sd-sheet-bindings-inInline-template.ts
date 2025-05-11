/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertSdSheetBindingsSafely() {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    for (const classDecl of sourceFile.getClasses()) {
      const decorator = classDecl.getDecorator("Component");
      if (!decorator) continue;

      const arg = decorator.getArguments()[0];
      if (!arg.asKind(SyntaxKind.ObjectLiteralExpression)) continue;

      const obj = arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);
      const templateProp = obj.getProperty("template");
      if (!templateProp || !templateProp.isKind(SyntaxKind.PropertyAssignment)) continue;

      const initializer = templateProp.getInitializer();
      if (!initializer) continue;

      let rawTemplate: string | undefined;
      if (initializer.isKind(SyntaxKind.NoSubstitutionTemplateLiteral) || initializer.isKind(
        SyntaxKind.StringLiteral)) {
        rawTemplate = initializer.getLiteralText();
      }
      else if (initializer.isKind(SyntaxKind.TemplateExpression)) {
        rawTemplate = initializer.getFullText().slice(1, -1);
      }
      else continue;

      // 정규식으로 <sd-sheet> 안에서만 바인딩 속성 치환
      let newTemplate = rawTemplate.replace(
        /<sd-sheet([\s\S]*?)>/g,
        (match) =>
          match
            .replace(/\[\(page\)\]/g, "[(currentPage)]")
            .replace(/\[pageLength\]/g, "[totalPageCount]")
            .replace(/\[\(ordering\)\]/g, "[(sorts)]")
            .replace(/\[pageItemCount\]/g, "[itemsPerPage]"),
      );

      newTemplate = newTemplate.replace(
        /<sd-pagination([\s\S]*?)>/g,
        (match) =>
          match
            .replace(/\[\(page\)\]/g, "[(currentPage)]")
            .replace(/\[pageLength\]/g, "[totalPageCount]")
            .replace(/\[displayPageLength\]/g, "[visiblePageCount]"),
      );

      if (rawTemplate !== newTemplate) {
        initializer.replaceWithText("`" + newTemplate + "`");
        console.log(`[template-updated] ${sourceFile.getBaseName()} :: 바인딩 속성 안전하게 변경 완료`);
        sourceFile.saveSync();
      }
    }
  }

  console.log("[완료] 정규식 기반 안전한 sd-sheet 바인딩 속성 변경 완료");
}