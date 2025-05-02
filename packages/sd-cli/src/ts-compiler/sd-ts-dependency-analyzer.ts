import * as ts from "typescript";
import { PathUtils, TNormPath } from "@simplysm/sd-core-node";
import { ISdBuildMessage } from "../types/build.types";
import * as module from "node:module";
import path from "path";

export class SdTsDependencyAnalyzer {
  static analyze(
    program: ts.Program,
    compilerHost: ts.CompilerHost,
    scopePaths: TNormPath[],
  ) {
    const compilerOpts = program.getCompilerOptions();
    const allDepMap = new Map<TNormPath, Set<TNormPath>>();
    const visited = new Set<TNormPath>();
    const messages: ISdBuildMessage[] = [];

    const getOrgSourceFile = (sf: ts.SourceFile) => {
      if (sf.fileName.endsWith(".ngtypecheck.ts")) {
        const orgFileName = sf.fileName.slice(0, -15) + ".ts";
        return program.getSourceFile(orgFileName);
      }

      return sf;
    };

    const inScope = (filePath: string): boolean => {
      return scopePaths.some((scope) => PathUtils.isChildPath(filePath, scope));
    };

    const resolveModule = (text: string, base: string): {
      resolvedFileName: string,
      isFallback: boolean
    } | undefined => {
      const res = ts.resolveModuleName(text, base, compilerOpts, compilerHost);
      if (res.resolvedModule) {
        return { resolvedFileName: res.resolvedModule.resolvedFileName, isFallback: false };
      }

      const absPath = path.resolve(path.dirname(base), text);
      if (compilerHost.fileExists(absPath)) {
        return { resolvedFileName: absPath, isFallback: true };
      }

      return undefined;
    };

    const error = (sf: ts.SourceFile, node: ts.Node, msg: string) => {
      try {
        const pos = ts.getLineAndCharacterOfPosition(sf, node.getStart());
        messages.push({
          filePath: PathUtils.norm(sf.fileName),
          line: pos.line,
          char: pos.character,
          code: undefined,
          severity: "error",
          message: msg,
          type: "deps",
        });
      }
      catch {
        messages.push({
          filePath: PathUtils.norm(sf.fileName),
          line: 0,
          char: 0,
          code: undefined,
          severity: "error",
          message: `${msg} (pos unknown)`,
          type: "deps",
        });
      }
    };

    const collectDeps = (sf: ts.SourceFile, fromFile: TNormPath) => {
      if (allDepMap.has(fromFile)) return;
      const deps = new Set<TNormPath>();

      const pushDep = (raw: string, node: ts.Node) => {
        if (module.builtinModules.includes(raw.replace(/^node:/, ""))) return;

        const resolved = resolveModule(raw, sf.fileName);
        if (!resolved) {
          error(sf, node, `파일 "${sf.fileName}"에서 "${raw}" 모듈을 해석할 수 없습니다.`);
          return;
        }

        if (!inScope(resolved.resolvedFileName)) return;

        const norm = PathUtils.norm(resolved.resolvedFileName);
        deps.add(norm);

        if (!visited.has(norm) && !resolved.isFallback) {
          visited.add(norm);
          const targetSf = program.getSourceFile(norm);
          if (!targetSf) {
            error(
              sf,
              node,
              `모듈 "${raw}"은(는) "${resolved}" 파일로 해석되었으나, 해당 파일의 ts.SourceFile이 없습니다.`,
            );
            return;
          }

          collectDeps(targetSf, norm);
        }
      };

      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const spec = node.moduleSpecifier;
          if (spec && ts.isStringLiteral(spec)) pushDep(spec.text, node);
        }
        else if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          pushDep(node.arguments[0].text, node);
        }
        else if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require" &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          pushDep(node.arguments[0].text, node);
        }
        else if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === "require" &&
          node.expression.name.text === "resolve" &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          pushDep(node.arguments[0].text, node);
        }
        else if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isMetaProperty(node.expression.expression) &&
          node.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
          node.expression.name.text === "meta" &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          pushDep(node.arguments[0].text, node);
        }
        ts.forEachChild(node, visit);
      };

      ts.forEachChild(sf, visit);
      allDepMap.set(fromFile, deps);
    };

    const sourceFileSet = new Set(
      program.getSourceFiles()
        .map((sf) => getOrgSourceFile(sf))
        .filterExists()
    );

    for (const sf of sourceFileSet) {
      if (!inScope(sf.fileName)) continue;
      const normFile = PathUtils.norm(sf.fileName);
      collectDeps(sf, normFile);
    }

    return {
      allDepMap,
      sourceFileSet,
      messages,
    };
  }
}