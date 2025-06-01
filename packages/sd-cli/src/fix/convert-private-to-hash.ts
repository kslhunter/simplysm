import { Node, SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertPrivateToHash() {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    for (const classDecl of sourceFile.getClasses()) {
      const renameMap = new Map<string, string>();

      // 1. 선언부에서 private을 #으로 바꾸고 이름 매핑 저장
      for (const member of classDecl.getMembers()) {
        if (
          Node.isPropertyDeclaration(member) ||
          Node.isMethodDeclaration(member) ||
          Node.isGetAccessorDeclaration(member) ||
          Node.isSetAccessorDeclaration(member)
        ) {
          if (member.hasModifier(SyntaxKind.PrivateKeyword)) {
            const nameNode = member.getNameNode();
            if (typeof nameNode.getText !== "function") continue;

            const oldName = nameNode.getText();
            const newName = oldName.startsWith("_") ? `#${oldName.slice(1)}` : `#${oldName}`;

            nameNode.replaceWithText(newName);
            member.toggleModifier("private", false);

            renameMap.set(oldName, newName);
          }
        }
      }

      if (renameMap.size === 0) continue;

      // 2. this.xxx 접근 표현식 전환
      classDecl.forEachDescendant((node) => {
        const propAccess = node.asKind(SyntaxKind.PropertyAccessExpression);
        if (propAccess) {
          const expr = propAccess.getExpression();
          const name = propAccess.getName();

          if (expr.getText() === "this" && renameMap.has(name)) {
            const newName = renameMap.get(name)!;
            propAccess.replaceWithText(`this.${newName}`);
          }
        }
      });
    }

    sourceFile.saveSync();
  }
}
