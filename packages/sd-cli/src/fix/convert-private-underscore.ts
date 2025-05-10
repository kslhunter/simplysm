import {
  MethodDeclaration,
  Project,
  PropertyAccessExpression,
  PropertyDeclaration,
  SyntaxKind,
} from "ts-morph";

export default function convertPrivateUnderscore() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.base.json",
  });

  const sourceFiles = project.getSourceFiles("packages/*/src/**/*.ts");

  for (const sourceFile of sourceFiles) {
    for (const classDec of sourceFile.getClasses()) {
      const members = classDec.getMembers();

      for (const member of members) {
        // 타입 좁히기
        if (
          member.getKind() !== SyntaxKind.PropertyDeclaration &&
          member.getKind() !== SyntaxKind.MethodDeclaration
        ) {
          continue;
        }

        const namedMember = member as PropertyDeclaration | MethodDeclaration;
        const nameNode = namedMember.getNameNode();
        if (nameNode.getKind() !== SyntaxKind.Identifier) continue;

        const originalName = nameNode.getText();
        const modifiers = namedMember.getModifiers().map(mod => mod.getText());

        // 예외 조건들
        if (originalName.startsWith("_")) continue;
        if (/^[A-Z0-9_]+$/.test(originalName)) continue;
        if (modifiers.includes("protected") && modifiers.includes("readonly")) continue;

        if (modifiers.includes("private") || modifiers.includes("protected")) {
          const newName = `_${originalName}`;

          namedMember.rename(newName);

          // this.속성 참조도 수정
          sourceFile
            .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
            .forEach((expr: PropertyAccessExpression) => {
              if (
                expr.getName() === originalName &&
                expr.getExpression().getKind() === SyntaxKind.ThisKeyword
              ) {
                expr.getNameNode().replaceWithText(newName);
              }
            });

          console.log(`[updated] ${sourceFile.getBaseName()} :: ${originalName} → ${newName}`);
        }
      }
    }

    sourceFile.saveSync();
  }

  console.log("✅ private/protected prefix 변환 완료");
}