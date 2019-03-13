const tslint = require("tslint");
const path = require("path");

try {
  const packageKey = process.argv[2];
  const watch = process.argv[3] === "watch";

  let projectPath = "";
  let split = process.cwd().split(/[\\/]/);
  if (split[split.length - 1] === packageKey) {
    projectPath = path.resolve(process.cwd(), "../..");
  }
  else {
    projectPath = process.cwd()
  }

  process.on("message", async (changedFiles) => {
    try {
      const tsconfigFile = path.resolve(projectPath, "packages", packageKey, "tsconfig.build.json");
      const configFile = path.resolve(projectPath, "packages", packageKey, "tslint.json");

      const program = tslint.Linter.createProgram(tsconfigFile, path.dirname(tsconfigFile));
      const linter = new tslint.Linter({formatter: "json", fix: false}, program);

      const prepareSourceFiles = (
        changedFiles.length > 0 ? changedFiles : program.getSourceFiles().map(item => item.fileName)
      ).map(file => program.getSourceFile(file)).filter(item => !!item);

      const sourceFiles = [];
      for (const item of prepareSourceFiles) {
        if (sourceFiles.every(item1 => item1.fileName !== item.fileName)) {
          sourceFiles.push(item);
        }
      }

      await Promise.all(sourceFiles.map(async sourceFile => {
        if (/\.d\.ts$/.test(sourceFile.fileName)) {
          return;
        }

        if (!path.resolve(sourceFile.fileName).startsWith(path.resolve(path.dirname(tsconfigFile)))) {
          return;
        }

        const config = tslint.Configuration.findConfiguration(configFile, sourceFile.fileName);
        linter.lint(sourceFile.fileName, sourceFile.getFullText(), config.results);

        const result = linter.getResult();

        let resultMessages = [];
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

          resultMessages.push(`${fileName}(${lineNumber},${charNumber}): ${severity}: ${message} (${rule})`);
        }

        if (resultMessages.length > 0) {
          sendMessage({
            type: "warning",
            message: resultMessages.join("\r\n")
          });
        }
      }));
    }
    catch (err) {
      sendMessage({
        type: "error",
        message: err.stack
      });
    }

    sendMessage({
      type: "finish"
    });

    if (!watch) process.exit();
  });
}
catch (err) {
  sendMessage({
    type: "error",
    message: err.stack
  });
}

function sendMessage(message) {
  process.send(message, err => {
    if (err) throw err;
  });
}
