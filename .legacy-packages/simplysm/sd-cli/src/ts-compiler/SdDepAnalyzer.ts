import ts from "typescript";
import type { SdDepCache } from "./SdDepCache";
import type { TNormPath } from "@simplysm/sd-core-node";
import { PathUtils } from "@simplysm/sd-core-node";
import path from "path";
import type { NgtscProgram } from "@angular/compiler-cli";
import type { ScopePathSet } from "./ScopePathSet";

export class SdDepAnalyzer {
  static analyze(
    program: ts.Program,
    compilerHost: ts.CompilerHost,
    scopePathSet: ScopePathSet,
    cache: {
      dep: SdDepCache;
      type: WeakMap<ts.Node, ts.Type | undefined>;
      prop: WeakMap<ts.Type, Map<string, ts.Symbol | undefined>>;
      declFiles: WeakMap<ts.Symbol, TNormPath[]>;
      ngOrg: Map<TNormPath, ts.SourceFile>;
    },
  ): void {
    const compilerOpts = program.getCompilerOptions();
    const typeChecker = program.getTypeChecker();

    const moduleResolutionCache = compilerHost.getModuleResolutionCache!();

    const resolveModule = (text: string, base: string): TNormPath[] => {
      const res = ts.resolveModuleName(
        text,
        base,
        compilerOpts,
        compilerHost,
        moduleResolutionCache,
      );

      if (res.resolvedModule) {
        return [PathUtils.norm(res.resolvedModule.resolvedFileName)];
      }

      const absPath = path.resolve(path.dirname(base), text);
      if (!scopePathSet.inScope(absPath)) {
        return [];
      } else if (
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
        ].some((ext) => absPath.endsWith(ext))
      ) {
        return [PathUtils.norm(absPath)];
      } else {
        return [
          PathUtils.norm(absPath + ".ts"),
          PathUtils.norm(absPath + ".js"),
          PathUtils.norm(absPath + ".d.ts"),
          PathUtils.norm(absPath + ".json"),
        ];
      }
    };

    const isInImportOrExport = (node: ts.Node) => {
      const p = node.parent;
      return (
        ts.isImportDeclaration(p) ||
        ts.isExportDeclaration(p) ||
        ts.isImportSpecifier(p) ||
        ts.isExportSpecifier(p) ||
        ts.isNamespaceImport(p)
      );
    };

    const isDeclarationIdentifier = (id: ts.Identifier): boolean => {
      const p = id.parent;
      return (
        (ts.isParameter(p) && p.name === id) ||
        (ts.isVariableDeclaration(p) && p.name === id) ||
        (ts.isFunctionDeclaration(p) && p.name === id) ||
        (ts.isClassDeclaration(p) && p.name === id) ||
        (ts.isInterfaceDeclaration(p) && p.name === id) ||
        (ts.isTypeAliasDeclaration(p) && p.name === id) ||
        (ts.isEnumDeclaration(p) && p.name === id) ||
        (ts.isPropertySignature(p) && p.name === id) ||
        (ts.isPropertyDeclaration(p) && p.name === id) ||
        (ts.isMethodSignature(p) && p.name === id) ||
        (ts.isMethodDeclaration(p) && p.name === id)
      );
    };

    // const typeCache = new WeakMap<ts.Node, ts.Type | undefined>();

    const getCachedType = (node: ts.Node) => {
      if (cache.type.has(node)) return cache.type.get(node);
      const type = typeChecker.getTypeAtLocation(node) as ts.Type | undefined;
      if (!type) return undefined;

      const skipMask =
        ts.TypeFlags.Any |
        ts.TypeFlags.Unknown |
        ts.TypeFlags.Never |
        ts.TypeFlags.Null |
        ts.TypeFlags.Undefined |
        ts.TypeFlags.BooleanLike |
        ts.TypeFlags.NumberLike |
        ts.TypeFlags.StringLike |
        ts.TypeFlags.BigIntLike |
        ts.TypeFlags.ESSymbolLike;

      const result = (type.flags & skipMask) !== 0 ? undefined : type;
      cache.type.set(node, result);

      return result;
    };

    // const propCache = new WeakMap<ts.Type, Map<string, ts.Symbol | undefined>>();

    const getCachedProp = (type: ts.Type | undefined, name: string) => {
      if (!type) return undefined;
      let map = cache.prop.get(type);
      if (!map) {
        map = new Map();
        cache.prop.set(type, map);
      }
      if (map.has(name)) return map.get(name);
      const s = type.getProperty(name);
      map.set(name, s);
      return s;
    };

    const getDeclFileNPaths = (sym: ts.Symbol | undefined): TNormPath[] => {
      if (!sym) return [];
      const c = cache.declFiles.get(sym);
      if (c) return c;
      const paths = (sym.getDeclarations() ?? []).map((d) =>
        PathUtils.norm(d.getSourceFile().fileName),
      );
      cache.declFiles.set(sym, paths);
      return paths;
    };

    const collectDeps = (sf: ts.SourceFile) => {
      const sfNPath = PathUtils.norm(sf.fileName);
      if (cache.dep.hasCollected(sfNPath)) return;
      cache.dep.addCollected(sfNPath);
      if (!scopePathSet.inScope(sfNPath)) return;

      const visit = (node: ts.Node) => {
        // --- import ... from '...'
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const resolvedNPaths = resolveModule(node.moduleSpecifier.text, sf.fileName);
          for (const resolvedNPath of resolvedNPaths) {
            if (!scopePathSet.inScope(resolvedNPath)) continue;

            if (
              node.importClause &&
              node.importClause.namedBindings &&
              ts.isNamedImports(node.importClause.namedBindings)
            ) {
              // import ... from '...'
              for (const element of node.importClause.namedBindings.elements) {
                cache.dep.addImport(
                  sfNPath,
                  resolvedNPath,
                  element.propertyName?.text ?? element.name.text,
                );
              }
            } else {
              cache.dep.addImport(sfNPath, resolvedNPath, 0);
            }
          }

          return;
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
            if (!scopePathSet.inScope(resolvedNPath)) continue;

            cache.dep.addReexport(sfNPath, resolvedNPath, 0);
          }

          return;
        }

        // --- export { A as B } from '...'
        else if (
          ts.isExportDeclaration(node) &&
          node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        ) {
          const resolvedNPaths = resolveModule(node.moduleSpecifier.text, sf.fileName);
          for (const resolvedNPath of resolvedNPaths) {
            if (!scopePathSet.inScope(resolvedNPath)) continue;

            for (const element of node.exportClause.elements) {
              const local = element.propertyName?.text ?? element.name.text;
              const exported = element.name.text;
              cache.dep.addReexport(sfNPath, resolvedNPath, {
                importSymbol: local,
                exportSymbol: exported,
              });
            }
          }

          return;
        }

        // --- export const A = ...
        else if (
          ts.isVariableStatement(node) &&
          node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          for (const decl of node.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              cache.dep.addExport(sfNPath, decl.name.text);
            }
          }
        }

        // --- export function/class/interface A ...
        if (
          (ts.isFunctionDeclaration(node) ||
            ts.isClassDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node) ||
            ts.isEnumDeclaration(node)) &&
          node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) &&
          node.name
        ) {
          cache.dep.addExport(sfNPath, node.name.text);
        } else if (
          ts.isIdentifier(node) &&
          isDeclarationIdentifier(node) &&
          !isInImportOrExport(node)
        ) {
          const orgValSymbol = typeChecker.getSymbolAtLocation(node);
          let valSymbol = orgValSymbol;
          if (orgValSymbol && orgValSymbol.flags & ts.SymbolFlags.Alias) {
            // 현 파일 선언으로 확정되면 굳이 치환 불필요
            const declNPaths = getDeclFileNPaths(orgValSymbol);
            const external = declNPaths.some((declNPath) => declNPath !== sfNPath);
            if (external) {
              valSymbol = typeChecker.getAliasedSymbol(orgValSymbol);
            }
          }

          for (const declNPath of getDeclFileNPaths(valSymbol)) {
            if (declNPath !== sfNPath && scopePathSet.inScope(declNPath)) {
              cache.dep.addImport(sfNPath, declNPath, 0);
            }
          }
        } else if (ts.isPropertyAccessExpression(node)) {
          const type = getCachedType(node.expression);
          const propSymbol = getCachedProp(type, node.name.text);

          if (propSymbol) {
            for (const declNPath of getDeclFileNPaths(propSymbol)) {
              if (declNPath !== sfNPath && scopePathSet.inScope(declNPath)) {
                cache.dep.addImport(sfNPath, declNPath, 0);
              }
            }
          }
        } else if (
          ts.isElementAccessExpression(node) &&
          ts.isStringLiteral(node.argumentExpression)
        ) {
          const type = getCachedType(node.expression);
          const propSymbol = getCachedProp(type, node.argumentExpression.text);

          if (propSymbol) {
            for (const declNPath of getDeclFileNPaths(propSymbol)) {
              if (declNPath !== sfNPath && scopePathSet.inScope(declNPath)) {
                cache.dep.addImport(sfNPath, declNPath, 0);
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
        const sfNPath = PathUtils.norm(sf.fileName);
        let org = cache.ngOrg.get(sfNPath);
        if (!org) {
          const orgPath = sf.fileName.slice(0, -15) + ".ts";
          org = program.getSourceFile(orgPath) ?? sf;

          const realOrg = program.getSourceFile(orgPath);
          if (realOrg) cache.ngOrg.set(sfNPath, realOrg);
        }
        return org;
      }
      return sf;
    };

    const sourceFileSet = new Set(
      program
        .getSourceFiles()
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
    depCache: SdDepCache,
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
