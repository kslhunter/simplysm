import ts from "typescript";
import { SdDependencyCache } from "./sd-dependency-cache";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { NgtscProgram } from "@angular/compiler-cli";
import { ScopePathSet } from "../pkg-builders/commons/scope-path";

export class SdDependencyAnalyzer {
  static analyze(
    program: ts.Program,
    compilerHost: ts.CompilerHost,
    scopePathSet: ScopePathSet,
    depCache: SdDependencyCache,
  ): void {
    const compilerOpts = program.getCompilerOptions();
    const typeChecker = program.getTypeChecker();

    const resolveModule = (text: string, base: string): TNormPath[] => {
      const res = ts.resolveModuleName(
        text,
        base,
        compilerOpts,
        compilerHost,
      );

      if (res.resolvedModule) {
        return [
          PathUtils.norm(res.resolvedModule.resolvedFileName),
        ];
      }

      const absPath = path.resolve(path.dirname(base), text);
      if (!scopePathSet.inScope(absPath)) {
        return [];
      }
      else if (
        // 지원되게할 .png등이면 그냥 가져오고 (bundling  loader에 들어가는것들과 .ts, .json등)
        // fallback일때는 absPath에 .ts, .d.ts, .js, .json 등 다붙여서 가져와야함
        [
          ".ts",
          ".d.ts",
          ".js",
          ".json",

          ".html",
          ".scss",
          ".css",

          ".png",
          ".jpeg",
          ".jpg",
          ".jfif",
          ".gif",
          ".svg",
          ".woff",
          ".woff2",
          ".ttf",
          ".ttc",
          ".eot",
          ".ico",
          ".otf",
          ".csv",
          ".xlsx",
          ".xls",
          ".pptx",
          ".ppt",
          ".docx",
          ".doc",
          ".zip",
          ".pfx",
          ".pkl",
          ".mp3",
          ".ogg",
        ].some(ext => absPath.endsWith(ext))
      ) {
        return [
          PathUtils.norm(absPath),
        ];
      }
      else {
        return [
          PathUtils.norm(absPath + ".ts"),
          PathUtils.norm(absPath + ".js"),
          PathUtils.norm(absPath + ".d.ts"),
          PathUtils.norm(absPath + ".json"),
        ];
      }
    };

    const isInImportOrExport = (node: ts.Node) => {
      let curr = node as ts.Node | undefined;
      while (curr) {
        if (
          ts.isImportDeclaration(curr) ||
          ts.isExportDeclaration(curr) ||
          ts.isImportSpecifier(curr) ||
          ts.isExportSpecifier(curr) ||
          ts.isNamespaceImport(curr)
        ) {
          return true;
        }
        curr = curr.parent;
      }
      return false;
    };

    const typeCache = new WeakMap<ts.Node, ts.Type>();

    const getCachedType = (node: ts.Node) => {
      if (typeCache.has(node)) return typeCache.get(node);
      const type = typeChecker.getTypeAtLocation(node) as ts.Type | undefined;
      if (type) typeCache.set(node, type);
      return type;
    };

    const collectDeps = (sf: ts.SourceFile) => {
      const sfNPath = PathUtils.norm(sf.fileName);
      if (depCache.hasCollected(sfNPath)) return;
      depCache.addCollected(sfNPath);

      const visit = (node: ts.Node) => {
        // --- import ... from '...'
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const resolvedNPaths = resolveModule(node.moduleSpecifier.text, sf.fileName);
          for (const resolvedNPath of resolvedNPaths) {
            if (
              node.importClause &&
              node.importClause.namedBindings &&
              ts.isNamedImports(node.importClause.namedBindings)
            ) {
              for (const element of node.importClause.namedBindings.elements) {
                depCache.addImport(
                  sfNPath,
                  resolvedNPath,
                  element.propertyName?.text ?? element.name.text,
                );
              }
            }
            else {
              depCache.addImport(sfNPath, resolvedNPath, 0);
            }
          }
        }

        // --- export * from '...'
        else if (
          ts.isExportDeclaration(node) &&
          !node.exportClause &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const resolvedNPaths = resolveModule(node.moduleSpecifier.text, sf.fileName);
          for (const resolvedNPath of resolvedNPaths) {
            depCache.addReexport(sfNPath, resolvedNPath, 0);
          }
        }

        // --- export { A as B } from '...'
        if (
          ts.isExportDeclaration(node) &&
          node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const resolvedNPaths = resolveModule(node.moduleSpecifier.text, sf.fileName);
          for (const resolvedNPath of resolvedNPaths) {
            for (const element of node.exportClause.elements) {
              const local = element.propertyName?.text ?? element.name.text;
              const exported = element.name.text;
              depCache.addReexport(sfNPath, resolvedNPath, {
                importSymbol: local,
                exportSymbol: exported,
              });
            }
          }
        }

        // --- export const A = ...
        else if (
          ts.isVariableStatement(node) &&
          node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              depCache.addExport(sfNPath, decl.name.text);
            }
          }
        }

        // --- export function/class/interface A ...
        else if (
          (
            ts.isFunctionDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node) ||
            ts.isEnumDeclaration(node)
          ) &&
          node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) &&
          node.name
        ) {
          depCache.addExport(sfNPath, node.name.text);
        }

        else if (ts.isIdentifier(node) && !isInImportOrExport(node)) {
          const orgValSymbol = typeChecker.getSymbolAtLocation(node);

          // alias (import된 심볼)일 경우, 원본 심볼로 치환
          const valSymbol = (orgValSymbol && (orgValSymbol.flags & ts.SymbolFlags.Alias))
            ? typeChecker.getAliasedSymbol(orgValSymbol)
            : undefined;

          for (const decl of valSymbol?.getDeclarations() ?? []) {
            const declFile = decl.getSourceFile();
            const declNPath = PathUtils.norm(declFile.fileName);
            if (declNPath !== sfNPath && scopePathSet.inScope(declNPath)) {
              depCache.addImport(sfNPath, declNPath, 0);
            }
          }
        }
        else if (
          ts.isPropertyAccessExpression(node)
        ) {
          const type = getCachedType(node.expression);
          const propSymbol = type?.getProperty(node.name.text);

          if (propSymbol) {
            for (const decl of propSymbol.getDeclarations() ?? []) {
              const declFile = decl.getSourceFile();
              const declNPath = PathUtils.norm(declFile.fileName);
              if (declNPath !== sfNPath && scopePathSet.inScope(declNPath)) {
                depCache.addImport(sfNPath, declNPath, 0);
              }
            }
          }
        }
        else if (
          ts.isElementAccessExpression(node) &&
          ts.isStringLiteral(node.argumentExpression)
        ) {
          const type = getCachedType(node.expression);
          const propSymbol = type?.getProperty(node.argumentExpression.text);

          if (propSymbol) {
            for (const decl of propSymbol.getDeclarations() ?? []) {
              const declFile = decl.getSourceFile();
              const declNPath = PathUtils.norm(declFile.fileName);
              if (declNPath !== sfNPath && scopePathSet.inScope(declNPath)) {
                depCache.addImport(sfNPath, declNPath, 0);
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      ts.forEachChild(sf, visit);
    };

    const getOrgSourceFile = (sf: ts.SourceFile) => {
      if (sf.fileName.endsWith(".ngtypecheck.ts")) {
        const orgFileName = sf.fileName.slice(0, -15) + ".ts";
        return program.getSourceFile(orgFileName);
      }
      return sf;
    };

    const sourceFileSet = new Set(
      program.getSourceFiles()
        .filter((sf) => scopePathSet.inScope(sf.fileName))
        .map((sf) => getOrgSourceFile(sf))
        .filterExists(),
    );

    for (const sf of sourceFileSet) {
      collectDeps(sf);
    }
  }


  static analyzeAngularResources(
    ngProgram: NgtscProgram,
    scopePathSet: ScopePathSet,
    depCache: SdDependencyCache,
  ) {

    for (const sf of ngProgram.getTsProgram().getSourceFiles()) {
      const fileNPath = PathUtils.norm(sf.fileName);
      if (!scopePathSet.inScope(fileNPath)) continue;

      const dependencies = ngProgram.compiler.getResourceDependencies(sf);
      for (const dep of dependencies) {
        const depNPath = PathUtils.norm(dep);
        if (!scopePathSet.inScope(depNPath)) continue;

        depCache.addImport(fileNPath, depNPath, 0);
      }
    }
  }
}