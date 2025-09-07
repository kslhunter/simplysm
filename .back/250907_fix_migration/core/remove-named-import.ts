export default function removeNamedImport(sourceFile, moduleSpecifier, symbolName) {
  const importDecl = sourceFile.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === moduleSpecifier,
  );
  if (importDecl == null) return;
  importDecl
    .getNamedImports()
    .filter((n) => n.getName() === symbolName)
    .forEach((n) => n.remove());
  // 만약 named import가 모두 사라지면 import문 자체 삭제
  if (importDecl.getNamedImports().length === 0) {
    importDecl.remove();
  }
}
