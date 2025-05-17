/* eslint-disable no-console */
import { Identifier, SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./get-ts-morph-source-files";

export default function convertSymbols(replacements: Record<string, Record<string, string | undefined> | undefined>) {
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    let changed = false;

    // 1. 타입 참조 및 값 참조 치환
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.Identifier) return;
      if (node.getFirstAncestorByKind(SyntaxKind.ImportSpecifier)) return;

      const identifier = node as Identifier;
      const name = identifier.getText();

      // 해당 이름이 어디서 import됐는지 확인
      const symbol = identifier.getSymbol();
      if (symbol == null) return;

      const declarations = symbol.getDeclarations();
      if (declarations.length === 0) return;

      const importSpecifier = declarations[0].getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
      if (importSpecifier == null) return;

      const importModule = importSpecifier.getModuleSpecifierValue();
      const replacementRecord = replacements[importModule];
      if (replacementRecord == null) return;

      const newName = replacementRecord[name];
      if (newName == null || newName === name) return;

      identifier.replaceWithText(newName);
      changed = true;
      console.log(`[ref] ${sourceFile.getBaseName()} :: ${importModule} :: ${name} → ${newName}`);
    });

    // 2. import 교체
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();
      const replacementRecord = replacements[specifier];
      if (replacementRecord == null) continue;

      const namedImports = importDecl.getNamedImports();

      for (const ni of namedImports) {
        const oldName = ni.getName();
        const newName = replacementRecord[oldName];
        if (newName == null) continue;

        ni.remove();
        importDecl.addNamedImport(newName);
        changed = true;
        console.log(`[import] ${sourceFile.getBaseName()} :: ${specifier} :: ${oldName} → ${newName}`);
      }
    }

    if (changed) {
      sourceFile.saveSync();
    }
  }
}
