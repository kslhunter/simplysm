/* eslint-disable no-console */
import { ArrayLiteralExpression, Identifier, SyntaxKind, TypeReferenceNode } from "ts-morph";
import getTsMortphSourceFiles from "./getTsMortphSourceFiles";

function parseTargets(symbols: string[]) {
  return symbols.map((symbol) => {
    const [importSource, symbolName] = symbol.split("#");
    return { importSource, symbolName };
  });
}

export default function removeSymbols(symbols: string[]) {
  const targets = parseTargets(symbols);
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    let changed = false;

    for (const { importSource, symbolName } of targets) {
      // 1. Import 제거
      for (const importDecl of sourceFile.getImportDeclarations()) {
        if (importDecl.getModuleSpecifierValue() !== importSource) continue;

        for (const namedImport of importDecl.getNamedImports()) {
          if (namedImport.getName() === symbolName) {
            console.log(
              `[import] ${sourceFile.getBaseName()} :: ${importSource} :: removed '${symbolName}'`,
            );
            namedImport.remove();
            changed = true;
          }
        }

        if (importDecl.getNamedImports().length === 0) {
          console.log(
            `[import] ${sourceFile.getBaseName()} :: removed empty import from '${importSource}'`,
          );
          importDecl.remove();
          changed = true;
        }
      }

      // 2. 타입 참조 제거
      sourceFile.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.TypeReference) return;

        const typeNode = node as TypeReferenceNode;
        const typeName = typeNode.getTypeName().getText();
        if (typeName !== symbolName) return;

        const decl = node.getFirstAncestor(
          (a) =>
            a.getKind() === SyntaxKind.VariableStatement ||
            a.getKind() === SyntaxKind.Parameter ||
            a.getKind() === SyntaxKind.PropertyDeclaration,
        );

        if (decl) {
          console.log(
            `[type] ${sourceFile.getBaseName()} :: removed type usage of '${symbolName}'`,
          );

          const removable =
            decl.asKind(SyntaxKind.VariableStatement) ??
            decl.asKind(SyntaxKind.Parameter) ??
            decl.asKind(SyntaxKind.PropertyDeclaration);

          if (removable) {
            removable.remove();
            changed = true;
          }
        }
      });

      // 3. ArrayLiteral 내 사용 제거 (예: imports: [SdButtonControl])
      sourceFile.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.ArrayLiteralExpression) return;

        const arr = node as ArrayLiteralExpression;
        const elements = arr.getElements();

        for (const el of elements) {
          if (
            el.getKind() === SyntaxKind.Identifier &&
            (el as Identifier).getText() === symbolName
          ) {
            console.log(
              `[usage] ${sourceFile.getBaseName()} :: removed '${symbolName}' from array`,
            );
            arr.removeElement(el);
            changed = true;
            break;
          }
        }
      });
    }

    if (changed) {
      sourceFile.saveSync();
    }
  }
}
