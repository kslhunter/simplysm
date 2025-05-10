/* eslint-disable no-console */

import { MethodDeclaration, Project, PropertyAccessExpression, SyntaxKind } from "ts-morph";

export default function convertPrivate() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.base.json",
  });

  const sourceFiles = project.getSourceFiles("packages/*/src/**/*.ts");

  for (const sourceFile of sourceFiles) {
    for (const classDec of sourceFile.getClasses()) {
      let changed = false;

      // (1) #x → private _x
      for (const prop of classDec.getInstanceProperties()) {
        const nameNode = prop.getNameNode();
        if (nameNode.getKind() !== SyntaxKind.PrivateIdentifier) continue;

        const baseName = nameNode.getText().slice(1);
        const newName = `_${baseName}`;

        nameNode.replaceWithText(newName);
        if (!prop.hasModifier(SyntaxKind.PrivateKeyword)) {
          prop.toggleModifier("private", true);
        }

        console.log(`[private-field] ${sourceFile.getBaseName()} :: #${baseName} → private ${newName}`);
        changed = true;
      }

      // (2) #foo() → private _foo()
      for (const member of classDec.getMembers()) {
        if (member.getKind() !== SyntaxKind.MethodDeclaration) continue;

        const method = member as MethodDeclaration;
        const nameNode = method.getNameNode();
        if (nameNode.getKind() !== SyntaxKind.PrivateIdentifier) continue;

        const baseName = nameNode.getText().slice(1);
        const newName = `_${baseName}`;

        nameNode.replaceWithText(newName);
        if (!method.hasModifier(SyntaxKind.PrivateKeyword)) {
          method.toggleModifier("private", true);
        }

        console.log(`[private-method] ${sourceFile.getBaseName()} :: #${baseName}() → private ${newName}()`);
        changed = true;
      }

      // (3) this.#x → this._x
      classDec.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
        .forEach((expr: PropertyAccessExpression) => {
          const nameNode = expr.getNameNode();
          if (nameNode.getKind() !== SyntaxKind.PrivateIdentifier) return;

          const baseName = nameNode.getText().slice(1);
          const newName = `_${baseName}`;
          nameNode.replaceWithText(newName);

          console.log(`[ref] ${sourceFile.getBaseName()} :: this.#${baseName} → this.${newName}`);
          changed = true;
        });

      if (changed) {
        sourceFile.saveSync();
      }
    }
  }

  console.log("✅ ECMAScript private (#field) → TypeScript private _field 변환 완료");
}