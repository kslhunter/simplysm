const tslint = require("tslint");
const path = require("path");

const packageName = process.argv[2];
const watch = process.argv[3] === "watch";
const tsConfigPath = process.argv[4];

const tsconfigFile = tsConfigPath || path.resolve(process.cwd(), "packages", packageName, "tsconfig.json");
const configFile = path.resolve(process.cwd(), "packages", packageName, "tslint.json");

process.on("message", (changedFiles) => {
  const program = tslint.Linter.createProgram(tsconfigFile, path.dirname(tsconfigFile));
  const linter = new tslint.Linter({formatter: "json", fix: false}, program);

  const prepareSourceFiles = (
    changedFiles.length > 0 ? changedFiles : program.getRootFileNames()
  ).map(file => program.getSourceFile(file)).filter(item => item);

  const sourceFiles = [];
  for (const item of prepareSourceFiles) {
    if (sourceFiles.every(item1 => item1.fileName !== item.fileName)) {
      sourceFiles.push(item);
    }
  }

  for (const sourceFile of sourceFiles) {
    if (/\.d\.ts$/.test(sourceFile.fileName)) continue;

    const config = tslint.Configuration.findConfiguration(configFile, sourceFile.fileName);
    linter.lint(sourceFile.fileName, sourceFile.getFullText(), config.results);

    const result = linter.getResult();

    for (const failure of result.failures) {
      if (failure.getFileName() !== sourceFile.fileName) {
        continue;
      }

      const severity = failure.getRuleSeverity();
      const message = failure.getFailure();
      const rule = failure.getRuleName();
      const fileName = failure.getFileName();
      const lineNumber = failure.getStartPosition().getLineAndCharacter().line + 1;
      const charNumber = failure.getStartPosition().getLineAndCharacter().character + 1;

      const resultMessage = `${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} (${rule})`;
      sendMessage(resultMessage);
    }
  }

  if (!watch) process.exit();
});

function sendMessage(message) {
  process.send(message, err => {
    if (err) throw err;
  });
}