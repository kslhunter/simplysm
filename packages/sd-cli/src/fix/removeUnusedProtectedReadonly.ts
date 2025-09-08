/* eslint-disable no-console */
import { SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/getTsMortphSourceFiles";

export default function removeUnusedProtectedReadonly() {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    const classes = sourceFile.getClasses();

    for (const cls of classes) {
      // @Component 데코레이터가 있는 클래스만 대상
      const componentDecorator = cls.getDecorator("Component");
      if (!componentDecorator) continue;

      // 템플릿 문자열 추출
      const templateArg = componentDecorator
        .getArguments()
        .find((arg) => arg.getKind() === SyntaxKind.ObjectLiteralExpression);

      if (!templateArg || !templateArg.asKind(SyntaxKind.ObjectLiteralExpression)) continue;

      const templateProp = templateArg
        .asKindOrThrow(SyntaxKind.ObjectLiteralExpression)
        .getProperty("template");

      if (!templateProp || !templateProp.asKind(SyntaxKind.PropertyAssignment)) continue;

      const initializer =
        templateProp
          .asKindOrThrow(SyntaxKind.PropertyAssignment)
          .getInitializerIfKind(SyntaxKind.NoSubstitutionTemplateLiteral) ??
        templateProp
          .asKindOrThrow(SyntaxKind.PropertyAssignment)
          .getInitializerIfKind(SyntaxKind.TemplateExpression) ??
        templateProp
          .asKindOrThrow(SyntaxKind.PropertyAssignment)
          .getInitializerIfKind(SyntaxKind.StringLiteral);

      const templateText = initializer?.getText().slice(1, -1); // `...` 또는 '...' 제거
      if (templateText == null) continue;

      // protected readonly 필드 중 템플릿에서 사용되지 않은 것 삭제
      const protectedReadonlyFields = cls
        .getProperties()
        .filter((prop) => prop.getScope() === "protected" && prop.isReadonly() && !prop.isStatic());

      for (const field of protectedReadonlyFields) {
        const name = field.getName();

        const usedInTemplate =
          templateText.includes(name) || new RegExp(`\\b${name}\\b`).test(templateText);

        const identifiers = cls.getDescendantsOfKind(SyntaxKind.Identifier);
        const usedInClass = identifiers.some((id) => {
          if (id.getText() !== name) return false;
          return id !== field.getNameNode();
        });

        if (!usedInTemplate && !usedInClass) {
          console.log(`🧹 Removing unused field: ${name} in ${sourceFile.getBaseName()}`);
          field.remove();
        }
      }
    }

    sourceFile.saveSync();
  }
}
