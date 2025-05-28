import { Node, SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertModalShowParams() {
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
      if (args.length < 3) continue; // 최소 3개는 있어야 함

      const typeText = args[0].getText();
      const titleText = args[1].getText();
      const inputsText = args[2]?.getText() ?? "{}";

      const props = [`type: ${typeText}`, `title: ${titleText}`, `inputs: ${inputsText}`];
      const objectLiteralText = `{\n  ${props.join(",\n  ")}\n}`;

      const newArgs = [`${objectLiteralText}`, ...args.slice(3).map((arg) => arg.getText())].join(", ");

      callExpr.replaceWithText(`this._sdModal.showAsync(${newArgs})`);
    }

    sourceFile.saveSync();
  }
}
