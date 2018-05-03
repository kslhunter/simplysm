import * as fs from "fs-extra";
import * as path from "path";
import * as ts from "typescript";

const context = process.argv[2];
const outputPath = process.argv[3];

const tsconfig = fs.readJsonSync(path.resolve(context, `tsconfig.json`));
const parsed = ts.parseJsonConfigFileContent(tsconfig, ts.sys, context);

let tsHost: ts.CompilerHost | undefined;
if (parsed.options.declaration) {
  tsHost = ts.createCompilerHost(parsed.options);
  tsHost.writeFile = (fileName: string, content: string) => {
    const distPath = outputPath;
    const packageName = path.basename(context);

    if (fileName.includes("src") && !fileName.startsWith(path.resolve(distPath, packageName, "src").replace(/\\/g, "/"))) {
      return;
    }

    if (fileName.includes("src") && fileName.startsWith(path.resolve(distPath, packageName, "src").replace(/\\/g, "/"))) {
      fileName = fileName.replace(`${packageName}/src/`, "");
    }

    content = content.replace(/from ".*(sd-[^/]*)[^;]*/g, (match, ...args) => {
      return `from "@simplism/${args[0]}"`;
    });

    ts.sys.writeFile(fileName, content);
  };
}

process.on("message", (changedTsFiles: string[]) => {
  /*const startTime = new Date().getTime();*/

  const tsProgram = ts.createProgram(
    parsed.fileNames,
    {
      ...parsed.options,
      ...parsed.options.declaration
        ? { emitDeclarationOnly: true }
        : {}
    },
    tsHost
  ) as ts.Program;

  let diagnostics = parsed.options.declaration
    ? ts.getPreEmitDiagnostics(tsProgram)
    : tsProgram.getSemanticDiagnostics();

  if (parsed.options.declaration) {
    if (changedTsFiles.length > 0) {
      for (const filePath of changedTsFiles) {
        const sourceFile = tsProgram.getSourceFile(filePath);
        diagnostics = diagnostics.concat(
          tsProgram.emit(sourceFile, undefined, undefined, true).diagnostics
        );
      }
    }
    else {
      diagnostics = diagnostics.concat(
        tsProgram.emit(undefined, undefined, undefined, true).diagnostics
      );
    }
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.file) {
      if (diagnostic.file.fileName.startsWith(context.replace(/\\/g, "/"))) {
        const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        process.send!({
          type: "error",
          message: `${diagnostic.file.fileName}\nERROR: ${diagnostic.file.fileName}[${position.line + 1}, ${position.character + 1}]: ${message}`
        }, (err: Error) => {
          if (err) {
            console.error(err);
          }
        });
      }
    }
    else {
      process.send!({
        type: "error",
        message: `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
      }, (err: Error) => {
        if (err) {
          console.error(err);
        }
      });
    }
  }

  /*const finishTime = new Date().getTime();
  process.send!({
      type: "log",
      message: `build: ${finishTime - startTime}`
  }, (err: Error) => {
      if (err) {
          console.error(err);
      }
  });*/
  process.send!("finish", (err: Error) => {
    if (err) {
      console.error(err);
    }
  });
});