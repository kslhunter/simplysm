import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.base.json",
});

const sourceFiles = project.getSourceFiles("packages/*/src/**/*.ts");

for (const sourceFile of sourceFiles) {
  for (const classDec of sourceFile.getClasses()) {
    let changed = false;

    // (1) 필드: #x → private _x
    for (const prop of classDec.getInstanceProperties()) {
      if (
        prop.getKind() === SyntaxKind.PropertyDeclaration &&
        prop.getNameNode().getKind() === SyntaxKind.PrivateIdentifier
      ) {
        const nameNode = prop.getNameNode();
        const baseName = nameNode.getText().slice(1); // remove '#'
        const newName = `_${baseName}`;

        nameNode.replaceWithText(newName);
        if (!prop.hasModifier(SyntaxKind.PrivateKeyword)) {
          prop.toggleModifier("private", true);
        }

        console.log(`[private-field] ${sourceFile.getBaseName()} :: #${baseName} → private ${newName}`);
        changed = true;
      }
    }

    // (2) 메서드: #foo() → private _foo()
    for (const method of classDec.getMembers()) {
      if (
        method.getKind() === SyntaxKind.MethodDeclaration &&
        method.getNameNode().getKind() === SyntaxKind.PrivateIdentifier
      ) {
        const nameNode = method.getNameNode();
        const baseName = nameNode.getText().slice(1);
        const newName = `_${baseName}`;

        nameNode.replaceWithText(newName);
        if (!method.hasModifier(SyntaxKind.PrivateKeyword)) {
          method.toggleModifier("private", true);
        }

        console.log(`[private-method] ${sourceFile.getBaseName()} :: #${baseName}() → private ${newName}()`);
        changed = true;
      }
    }

    // (3) 내부 참조: this.#x → this._x
    classDec.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach(expr => {
      const nameNode = expr.getNameNode();
      if (nameNode.getKind() === SyntaxKind.PrivateIdentifier) {
        const baseName = nameNode.getText().slice(1);
        const newName = `_${baseName}`;
        nameNode.replaceWithText(newName);

        console.log(`[ref] ${sourceFile.getBaseName()} :: this.#${baseName} → this.${newName}`);
        changed = true;
      }
    });

    if (changed) {
      sourceFile.saveSync();
    }
  }
}

console.log("✅ ECMAScript private (#field) → TypeScript private _field 변환 완료");
