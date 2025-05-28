import { Node, SyntaxKind } from "ts-morph";
import getTsMorphSourceFiles from "./core/get-ts-morph-source-files";

export default function convertPrintParams() {
  const sourceFiles = getTsMorphSourceFiles();

  for (const sourceFile of sourceFiles) {
    const typeChecker = sourceFile.getProject().getTypeChecker();

    const callExprs = sourceFile
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter((callExpr) => {
        const expr = callExpr.getExpression();
        return (
          Node.isPropertyAccessExpression(expr) &&
          expr.getName() === "printAsync" &&
          expr.getExpression().getText() === "this._sdPrint"
        );
      });

    for (const callExpr of callExprs) {
      const args = callExpr.getArguments();
      if (args.length < 2) continue;

      const firstArg = args[0];
      const type = typeChecker.getTypeAtLocation(firstArg);

      // 클래스 타입인지 확인 (Symbol이 존재하고, 선언이 class인지 여부 판단)
      const symbol = type.getSymbol();
      const isClass =
        symbol?.getDeclarations().some((decl) => Node.isClassDeclaration(decl)) ?? false;

      if (!isClass) continue;

      // 변환 처리
      const typeText = firstArg.getText();
      const inputsText = args[1]?.getText() ?? "{}";

      const props = [`type: ${typeText}`, `inputs: ${inputsText}`];
      const objectLiteralText = `{\n  ${props.join(",\n  ")}\n}`;

      const newArgs = [`${objectLiteralText}`, ...args.slice(2).map((arg) => arg.getText())].join(
        ", ",
      );

      callExpr.replaceWithText(`this._sdPrint.printAsync(${newArgs})`);
    }

    sourceFile.saveSync();
  }
}
