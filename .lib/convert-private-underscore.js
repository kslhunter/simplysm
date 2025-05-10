import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.base.json",
});

const sourceFiles = project.getSourceFiles("packages/*/src/**/*.ts");

for (const sourceFile of sourceFiles) {
  for (const classDec of sourceFile.getClasses()) {
    const members = classDec.getMembers();

    for (const member of members) {
      if (
        member.getKind() !== SyntaxKind.PropertyDeclaration &&
        member.getKind() !== SyntaxKind.MethodDeclaration
      ) {
        continue;
      }

      const nameNode = member.getNameNode();
      if (!nameNode || nameNode.getKind() !== SyntaxKind.Identifier) continue;

      const originalName = nameNode.getText();
      const modifiers = member.getModifiers().map(m => m.getText());

      // 예외 조건 1: 이미 _로 시작하면 skip
      if (originalName.startsWith("_")) continue;

      // 예외 조건 2: UPPER_CASE는 skip
      if (/^[A-Z0-9_]+$/.test(originalName)) continue;

      // 예외 조건 3: protected readonly 조합은 skip
      if (
        modifiers.includes("protected") &&
        modifiers.includes("readonly")
      ) {
        continue;
      }

      // 대상 조건: private 또는 protected
      if (
        modifiers.includes("private") ||
        modifiers.includes("protected")
      ) {
        const newName = "_" + originalName;

        // 이름 바꾸기
        member.rename(newName);

        // 클래스 내부 모든 참조 수정 (같은 소스파일 내에서만)
        sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach(expr => {
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
