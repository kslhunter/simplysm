/* eslint-disable no-console */

import { Identifier, SyntaxKind } from "ts-morph";
import getTsMortphSourceFiles from "./get-ts-morph-source-files";

interface SymbolReplacement {
  oldModule: string;
  oldName: string;
  newModule: string;
  newName: string;
}

function parseReplacements(input: Record<string, string>): SymbolReplacement[] {
  return Object.entries(input).map(([oldKey, newValue]) => {
    const [oldModule, oldName] = oldKey.split("#");
    const [newModule, newName] = newValue.split("#");
    return { oldModule, oldName, newModule, newName };
  });
}

function getSourceFileModule(filePath: string): string {
  const match = filePath.match(/packages[\\/](.*?)[\\/]src[\\/]/);
  return `@simplysm/${match![1]}`;
}

export default function convertSymbols(raw: Record<string, string>) {
  const replacements = parseReplacements(raw);
  const sourceFiles = getTsMortphSourceFiles();

  for (const sourceFile of sourceFiles) {
    const sourceFileModule = getSourceFileModule(sourceFile.getFilePath());

    let changed = false;

    const usedReplacements = new Set<string>(); // 실제 사용된 newModule#newName 추적
    const existingImportMap: Map<string, Set<string>> = new Map();

    // 1. 참조 치환 (Identifier)
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.Identifier) return;
      if (node.getFirstAncestorByKind(SyntaxKind.ImportSpecifier)) return;

      const identifier = node as Identifier;
      const name = identifier.getText();

      const symbol = identifier.getSymbol();
      if (!symbol) return;

      const declarations = symbol.getDeclarations();
      if (declarations.length === 0) return;

      const importDecl = declarations[0].getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
      if (!importDecl) return;

      const importModule = importDecl.getModuleSpecifierValue();

      const match = replacements.find((r) => r.oldModule === importModule && r.oldName === name);
      if (!match || match.oldModule === sourceFileModule || match.newModule === sourceFileModule)
        return;

      identifier.replaceWithText(match.newName);
      usedReplacements.add(`${match.newModule}#${match.newName}`);
      changed = true;
      console.log(
        `[ref] ${sourceFile.getBaseName()} :: ${importModule} :: ${name} → ${match.newName}`,
      );
    });

    // 2. import 교체
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();
      const namedImports = importDecl.getNamedImports();

      for (const ni of namedImports) {
        const oldName = ni.getName();

        const match = replacements.find((r) => r.oldModule === specifier && r.oldName === oldName);
        if (
          !match ||
          match.oldModule === sourceFileModule ||
          match.newModule === sourceFileModule
        ) {
          // 기존 import 유지 기록
          if (!existingImportMap.has(specifier)) {
            existingImportMap.set(specifier, new Set());
          }
          existingImportMap.get(specifier)!.add(oldName);
        } else {
          ni.remove();

          // 만약 모듈이 동일하다면 즉시 대체
          if (match.oldModule === match.newModule) {
            importDecl.addNamedImport(match.newName);
          } else {
            // 새로 import할 목록에 기록
            usedReplacements.add(`${match.newModule}#${match.newName}`);
          }

          changed = true;
          console.log(
            `[import] ${sourceFile.getBaseName()} :: ${specifier} :: ${oldName} → ${match.newName}`,
          );
        }
      }
    }

    // 3. 필요 시 새 import 추가
    for (const key of usedReplacements) {
      const [newModule, newName] = key.split("#");

      const already = existingImportMap.get(newModule)?.has(newName);
      const existsInFile = sourceFile
        .getImportDeclarations()
        .some(
          (decl) =>
            decl.getModuleSpecifierValue() === newModule &&
            decl.getNamedImports().some((ni) => ni.getName() === newName),
        );

      if (already || existsInFile) continue;

      sourceFile.addImportDeclaration({
        moduleSpecifier: newModule,
        namedImports: [newName],
      });

      changed = true;
      console.log(`[new-import] ${sourceFile.getBaseName()} :: ${newModule} :: ${newName}`);
    }

    if (changed) {
      sourceFile.saveSync();
    }
  }
}
