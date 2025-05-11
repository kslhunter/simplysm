import ts from "typescript";

export function createModelRewriteTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const factory = context.factory;

    return (sourceFile) => {
      const newStatements: ts.Statement[] = [];

      for (const stmt of sourceFile.statements) {
        // model(...) 할당을 찾아서 변형
        if (
          ts.isVariableStatement(stmt) &&
          stmt.declarationList.declarations.length === 1
        ) {
          const decl = stmt.declarationList.declarations[0];

          if (
            decl.initializer &&
            ts.isCallExpression(decl.initializer) &&
            ts.isIdentifier(decl.initializer.expression) &&
            decl.initializer.expression.text === "model"
          ) {
            const varName = (decl.name as ts.Identifier).text;
            const valueNode = decl.initializer.arguments[0];

            // __value = input(...)
            const inputDecl = factory.createVariableStatement(
              [factory.createModifier(ts.SyntaxKind.ConstKeyword)],
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    `__${varName}`,
                    undefined,
                    undefined,
                    factory.createCallExpression(
                      factory.createIdentifier("input"),
                      undefined,
                      [
                        valueNode, factory.createObjectLiteralExpression([
                        factory.createPropertyAssignment(
                          factory.createIdentifier("alias"),
                          factory.createStringLiteral(varName),
                        ),
                      ]),
                      ],
                    ),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            );

            // __valueChange = output(...)
            const outputDecl = factory.createVariableStatement(
              [factory.createModifier(ts.SyntaxKind.ConstKeyword)],
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    `__${varName}Change`,
                    undefined,
                    undefined,
                    factory.createCallExpression(
                      factory.createIdentifier("output"),
                      undefined,
                      [
                        factory.createObjectLiteralExpression([
                          factory.createPropertyAssignment(
                            factory.createIdentifier("alias"),
                            factory.createStringLiteral(`${varName}Change`),
                          ),
                        ]),
                      ],
                    ),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            );

            // value = $model(__value, __valueChange)
            const modelDecl = factory.createVariableStatement(
              [factory.createModifier(ts.SyntaxKind.ConstKeyword)],
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    factory.createIdentifier(varName),
                    undefined,
                    undefined,
                    factory.createCallExpression(
                      factory.createIdentifier("$model"),
                      undefined,
                      [
                        factory.createIdentifier(`__${varName}`),
                        factory.createIdentifier(`__${varName}Change`),
                      ],
                    ),
                  ),
                ],
                ts.NodeFlags.Const,
              ),
            );

            newStatements.push(inputDecl, outputDecl, modelDecl);
            continue; // skip original `value = model(...)`
          }
        }

        // 그대로 유지
        newStatements.push(stmt);
      }

      return factory.updateSourceFile(
        sourceFile,
        ts.setTextRange(factory.createNodeArray(newStatements), sourceFile.statements),
      );
    };
  };
}
