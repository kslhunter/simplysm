import ts from "typescript";

/**
 * Web Worker/SharedWorker의 `new Worker(new URL('path', import.meta.url))` 패턴을
 * 감지하여 fileProcessor로 번들된 경로로 치환하는 TypeScript transformer를 생성한다.
 *
 * @angular/build의 web-worker-transformer.js 원본을 이식한 구현.
 */
export function createWorkerTransformer(
  fileProcessor: (workerFile: string, containingFile: string) => string,
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const nodeFactory = context.factory;

    const visitNode = (node: ts.Node): ts.Node => {
      // new Worker(...) 또는 new SharedWorker(...) 감지
      if (
        !ts.isNewExpression(node) ||
        !ts.isIdentifier(node.expression) ||
        (node.expression.text !== "Worker" && node.expression.text !== "SharedWorker")
      ) {
        return ts.visitEachChild(node, visitNode, context);
      }

      // Worker 인자: 1개 또는 2개
      if (node.arguments == null || node.arguments.length < 1 || node.arguments.length > 2) {
        return node;
      }

      // 첫 인자: new URL(...)
      const workerUrlNode = node.arguments[0];
      if (
        !ts.isNewExpression(workerUrlNode) ||
        !ts.isIdentifier(workerUrlNode.expression) ||
        workerUrlNode.expression.text !== "URL"
      ) {
        return node;
      }

      // URL 인자: 정확히 2개
      if (workerUrlNode.arguments == null || workerUrlNode.arguments.length !== 2) {
        return node;
      }

      // URL 첫 인자: 문자열 리터럴
      if (!ts.isStringLiteralLike(workerUrlNode.arguments[0])) {
        return node;
      }

      // URL 둘째 인자: import.meta.url
      const secondArg = workerUrlNode.arguments[1];
      if (
        !ts.isPropertyAccessExpression(secondArg) ||
        !ts.isMetaProperty(secondArg.expression) ||
        secondArg.name.text !== "url"
      ) {
        return node;
      }

      const filePath = workerUrlNode.arguments[0].text;
      const importer = node.getSourceFile().fileName;

      // fileProcessor 호출
      const replacementPath = fileProcessor(filePath, importer);

      // 경로가 변경되지 않았으면 원본 유지
      if (replacementPath === filePath) {
        return node;
      }

      // AST 치환
      return nodeFactory.updateNewExpression(
        node,
        node.expression,
        node.typeArguments,
        ts.setTextRange(
          nodeFactory.createNodeArray(
            [
              // URL 인자 치환
              nodeFactory.updateNewExpression(
                workerUrlNode,
                workerUrlNode.expression,
                workerUrlNode.typeArguments,
                ts.setTextRange(
                  nodeFactory.createNodeArray(
                    [nodeFactory.createStringLiteral(replacementPath), workerUrlNode.arguments[1]],
                    workerUrlNode.arguments.hasTrailingComma,
                  ),
                  workerUrlNode.arguments,
                ),
              ),
              // 두 번째 인자: 기존 options가 있으면 유지, 없으면 { type: 'module' } 추가
              node.arguments.length > 1
                ? node.arguments[1]
                : nodeFactory.createObjectLiteralExpression([
                    nodeFactory.createPropertyAssignment(
                      "type",
                      nodeFactory.createStringLiteral("module"),
                    ),
                  ]),
            ],
            node.arguments.hasTrailingComma,
          ),
          node.arguments,
        ),
      );
    };

    return (sourceFile) => {
      // 'Worker' 문자열이 없으면 변환을 건너뛴다
      if (!sourceFile.text.includes("Worker")) {
        return sourceFile;
      }
      return ts.visitEachChild(sourceFile, visitNode, context);
    };
  };
}
