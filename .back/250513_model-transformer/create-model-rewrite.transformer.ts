import ts from "typescript";
import path from "path";

export function createModelRewriteTransformer(pkgRoot: string, pkgName: string): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      const newStatements: ts.Statement[] = [];
      let didInsertModel = false;
      let hasInput = false;
      let hasOutput = false;
      let hasModel = false;

      for (const stmt of sourceFile.statements) {
        if (ts.isImportDeclaration(stmt) && stmt.importClause?.namedBindings && ts.isNamedImports(
          stmt.importClause.namedBindings)) {
          const bindings = stmt.importClause.namedBindings.elements.map(e => e.name.text);
          const module = (stmt.moduleSpecifier as ts.StringLiteral).text;

          if (module === "@angular/core") {
            if (bindings.includes("input")) hasInput = true;
            if (bindings.includes("output")) hasOutput = true;
          }

          if (module === "@simplysm/sd-angular" || module.endsWith("/utils/hooks")) {
            if (bindings.includes("$model")) hasModel = true;
          }
        }
      }

      for (const stmt of sourceFile.statements) {
        if (ts.isClassDeclaration(stmt)) {
          const newMembers: ts.ClassElement[] = [];

          for (const member of stmt.members) {
            if (
              ts.isPropertyDeclaration(member) &&
              member.initializer &&
              ts.isCallExpression(member.initializer) &&
              ts.isIdentifier(member.initializer.expression) &&
              member.initializer.expression.text === "model" &&
              ts.isIdentifier(member.name)
            ) {
              const varName = member.name.text;
              const valueExpr = member.initializer.arguments.first() ?? factory.createIdentifier(
                "undefined");
              const typeArg = member.initializer.typeArguments?.[0];

              const inputField = factory.createPropertyDeclaration(
                [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                `__${varName}`,
                undefined,
                typeArg ? factory.createTypeReferenceNode("InputSignal", [typeArg]) : undefined,
                factory.createCallExpression(factory.createIdentifier("input"), undefined, [
                  valueExpr,
                  factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment("alias", factory.createStringLiteral(varName)),
                  ]),
                ]),
              );

              const outputField = factory.createPropertyDeclaration(
                [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                `__${varName}Change`,
                undefined,
                typeArg
                  ? factory.createTypeReferenceNode("OutputEmitterRef", [typeArg])
                  : undefined,
                factory.createCallExpression(factory.createIdentifier("output"), undefined, [
                  factory.createObjectLiteralExpression([
                    factory.createPropertyAssignment(
                      "alias",
                      factory.createStringLiteral(`${varName}Change`),
                    ),
                  ]),
                ]),
              );

              const modelField = factory.updatePropertyDeclaration(
                member,
                [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
                member.name,
                member.questionToken,
                typeArg
                  ? factory.createTypeReferenceNode("SdWritableSignal", [typeArg])
                  : undefined,
                factory.createCallExpression(factory.createIdentifier("$model"), undefined, [
                  factory.createPropertyAccessExpression(factory.createThis(), `__${varName}`),
                  factory.createPropertyAccessExpression(
                    factory.createThis(),
                    `__${varName}Change`,
                  ),
                ]),
              );

              newMembers.push(inputField, outputField, modelField);
              didInsertModel = true;
            }
            else {
              newMembers.push(member);
            }
          }

          const newClass = factory.updateClassDeclaration(
            stmt,
            stmt.modifiers,
            stmt.name,
            stmt.typeParameters,
            stmt.heritageClauses,
            newMembers,
          );

          newStatements.push(newClass);
          continue;
        }

        newStatements.push(stmt);
      }

      const importDecls: ts.ImportDeclaration[] = [];
      if (didInsertModel) {
        if (!hasInput || !hasOutput) {
          const specifiers: ts.ImportSpecifier[] = [];
          if (!hasInput) specifiers.push(ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier("input"),
          ));
          if (!hasOutput) specifiers.push(ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier("output"),
          ));

          importDecls.push(ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(
              false,
              undefined,
              ts.factory.createNamedImports(specifiers),
            ),
            ts.factory.createStringLiteral("@angular/core"),
          ));
        }

        if (!hasModel) {
          const fileDir = path.dirname(sourceFile.fileName);
          const hooksPath = path.resolve(pkgRoot, "src/utils/hooks/$model.ts");
          let importPath = "@simplysm/sd-angular";

          const normalizedFile = path.normalize(sourceFile.fileName);
          const normalizedSrc = path.normalize(path.resolve(pkgRoot, "src")) + path.sep;

          if (normalizedFile.startsWith(normalizedSrc) && pkgName === "@simplysm/sd-angular") {
            if (normalizedFile.startsWith(normalizedSrc)) {
              importPath = path.relative(fileDir, hooksPath)
                .replace(/\\/g, "/")
                .replace(/\.ts$/, "");
            }

            if (!importPath.startsWith(".")) {
              importPath = "./" + importPath;
            }
          }
          else {
            importPath = "@simplysm/sd-angular";
          }

          importDecls.push(ts.factory.createImportDeclaration(
            undefined,
            ts.factory.createImportClause(
              false,
              undefined,
              ts.factory.createNamedImports([
                ts.factory.createImportSpecifier(
                  false,
                  undefined,
                  ts.factory.createIdentifier("$model"),
                ),
              ]),
            ),
            ts.factory.createStringLiteral(importPath),
          ));
        }

        newStatements.unshift(...importDecls);
      }

      return factory.updateSourceFile(
        sourceFile,
        ts.setTextRange(factory.createNodeArray(newStatements), sourceFile.statements),
      );
    };
  };
}
