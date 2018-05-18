import * as tslint from "tslint";
import * as path from "path";

const context = process.argv[2];

process.on("message", () => {
  const tsconfigPath = path.resolve(context, "tsconfig.json");
  const tsLinterProgram = tslint.Linter.createProgram(tsconfigPath, context);

  const tsLinter = new tslint.Linter(
    {formatter: "json", fix: false},
    tsLinterProgram
  );

  const result: string[] = [];
  for (const filePath of tslint.Linter.getFileNames(tsLinterProgram)) {
    const sourceFile = tsLinterProgram.getSourceFile(filePath);
    if (!sourceFile) continue;

    const lintConfig = tslint.Configuration.findConfiguration(path.resolve(context, "tslint.json"), filePath);
    tsLinter.lint(filePath, sourceFile.getFullText(), lintConfig.results);

    const lintResult = tsLinter.getResult();

    const errorMessages: string[] = lintResult.failures.map(failure => {
      const severity = failure.getRuleSeverity();
      const message = `${failure.getFailure()}`;
      const rule = `(${failure.getRuleName()})`;
      const fileName = failure.getFileName();
      const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
      const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;
      return `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} ${rule}`;
    });

    for (const errorMessage of errorMessages) {
      if (result.some(item => item === errorMessage)) continue;
      result.push(errorMessage);
    }
  }

  process.send!(result);
});