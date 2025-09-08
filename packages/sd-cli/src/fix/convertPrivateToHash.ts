/* eslint-disable no-console */

import { Node, SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./core/getTsMortphSourceFiles";

export default function convertPrivateToHash() {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    let changed = false;

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

            const kind = Node.isMethodDeclaration(member)
              ? "method"
              : Node.isGetAccessorDeclaration(member) || Node.isSetAccessorDeclaration(member)
                ? "accessor"
                : "field";

            console.log(
              `[private-${kind}] ${sourceFile.getBaseName()} :: private ${oldName} → ${newName}`,
            );
            changed = true;
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
            console.log(`[ref] ${sourceFile.getBaseName()} :: this.${name} → this.${newName}`);
            changed = true;
          }
        }
      });
    }

    if (changed) {
      sourceFile.saveSync();
      console.log(`[save] ${sourceFile.getFilePath()}`);
    }
  }

  console.log("[완료] private → ECMAScript # 멤버 변환 완료");
}
