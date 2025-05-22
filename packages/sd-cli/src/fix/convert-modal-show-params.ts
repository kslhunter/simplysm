import { Node, SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertShowAsyncCall() {
  const sourceFiles = getTsMorphSourceFiles();

  for (const sourceFile of sourceFiles) {
    const callExprs = sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((callExpr) => {
        const expr = callExpr.getExpression();
        return (
          Node.isPropertyAccessExpression(expr) &&
          expr.getName() === "showAsync" &&
          expr.getExpression().getText() === "this._sdModal"
        );
      });

    for (const callExpr of callExprs) {
      const args = callExpr.getArguments();
      if (args.length < 2 || args.length > 3) continue;

      const [typeArg, titleArg, inputsArg] = args;

      // 반드시 교체 전에 텍스트만 추출
      const typeText = typeArg.getText();
      const titleText = titleArg.getText();
      const inputsText = inputsArg.getText();

      const props: string[] = [`type: ${typeText}`, `title: ${titleText}`, `inputs: ${inputsText}`];

      const objectLiteralText = `{
  ${props.join(",\n  ")}
}`;

      callExpr.replaceWithText(`this._sdModal.showAsync(${objectLiteralText})`);
    }

    sourceFile.saveSync();
  }
}
