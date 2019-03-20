const fs = require("fs-extra");
const ts = require("typescript");
const path = require("path");

try {
  const packageName = process.argv[2];
  const watch = process.argv[3] === "watch";

  const contextPath = path.resolve(process.cwd(), "packages", packageName).replace(/\\/g, "/");
  const configPath = path.resolve(contextPath, "tsconfig.build.json").replace(/\\/g, "/");
  // const configPath = path.resolve(contextPath, "tsconfig.json").replace(/\\/g, "/");
  const parsedConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(configPath), ts.sys, contextPath);
  const outDir = parsedConfig.options.outDir || path.resolve(contextPath, "dist");

  if (watch) {
    process.on("message", async (changedFiles) => {
      await runAsync(changedFiles);

      sendMessage({
        type: "finish"
      });
    });
  }
  else {
    (async () => {
      await runAsync([]);
      process.exit();
    })();
  }

  async function runAsync(changedFiles) {
    try {
      const promiseList = [];

      const host = ts.createCompilerHost(parsedConfig.options);
      host.writeFile = async (filePath, content) => {
        promiseList.push(writeFileAsync(filePath, content));
      };

      const program = ts.createProgram(
        changedFiles.length > 0 ? changedFiles : parsedConfig.fileNames,
        {
          ...parsedConfig.options,
          outDir: outDir,
          sourceMap: false,
          noEmit: !parsedConfig.options.declaration,
          emitDeclarationOnly: parsedConfig.options.declaration
        },
        host
      );

      let diagnostics = parsedConfig.options.declaration
        ? ts.getPreEmitDiagnostics(program)
        : program.getSemanticDiagnostics();

      if (parsedConfig.options.declaration) {
        diagnostics = diagnostics.concat(program.emit(undefined, undefined, undefined, true).diagnostics);
      }
      else {
        diagnostics = diagnostics.concat(program.getSyntacticDiagnostics());
      }

      for (const diagnostic of diagnostics) {
        printDiagnostic(diagnostic);
      }

      await Promise.all(promiseList);
    }
    catch (err) {
      sendMessage({
        type: "error",
        message: err.stack
      });
    }
  }

  async function writeFileAsync(filePath, content) {
    if (!parsedConfig.options.declaration) return;

    let newFilePath = filePath.replace(/\\/g, "/");
    if (newFilePath.includes("src")) {
      const prevOutDir = path.resolve(outDir, packageName, "src").replace(/\\/g, "/");

      if (!newFilePath.startsWith(prevOutDir)) {
        return;
      }

      newFilePath = path.resolve(outDir, path.relative(prevOutDir, filePath));
    }

    await fs.mkdirs(path.dirname(newFilePath));
    await fs.writeFile(newFilePath, content);
  }

  function printDiagnostic(diagnostic) {
    if (diagnostic.file) {
      if (diagnostic.file.fileName.startsWith(contextPath.replace(/\\/g, "/"))) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        const message = `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${tsMessage}`;
        sendMessage({
          type: "error",
          message: message
        });
      }
    }
    else {
      const message = `error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
      sendMessage({
        type: "error",
        message: message
      });
    }
  }
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
