import * as path from "path";
import * as ts from "typescript";
import * as yargs from "yargs";
import {helpers} from "../commons/helpers";

const argv = yargs
  .options({
    package: {
      type: "string",
      required: true
    },
    noEmit: {
      type: "boolean",
      required: true
    }
  })
  .argv;

const packageName: string = argv.package;
const getContextPath = (...args: string[]): string => path.resolve(process.cwd(), `packages/${packageName}`, ...args);
const noEmit: boolean = argv.noEmit;

const tsconfig = helpers.getTsconfig(getContextPath());

/*let tsHost: ts.CompilerHost | undefined;
if (!noEmit) {
  tsHost = ts.createCompilerHost(tsconfig.options);
  tsHost.writeFile = (fileName: string, content: string) => {
    const outDir = tsconfig.options.outDir || getContextPath();
    let targetPath = fileName;

    if (/[\\/]src[\\/]/.test(targetPath)) {
      const relativePath = path.relative(outDir, targetPath);
      if (new RegExp(`^${packageName}[\\\\/]src[\\\\/]`).test(relativePath)) {
        targetPath = path.resolve(
          outDir,
          relativePath.replace(new RegExp(`^${packageName}[\\\\/]src[\\\\/]`), "")
        );
      }
      else {
        return;
      }
    }
    ts.sys.writeFile(targetPath, content);
  };
}*/

process.on("message", (filePaths: string[]) => {
  const tsProgram = ts.createProgram(
    tsconfig.fileNames,
    tsconfig.options/*,
    tsHost*/
  );

  let diagnostics!: ts.Diagnostic[];
  if (!noEmit) {
    if (filePaths.length > 0) {
      for (const filePath of filePaths) {
        const sourceFile = tsProgram.getSourceFile(filePath);
        diagnostics = [
          ...ts.getPreEmitDiagnostics(tsProgram, sourceFile),
          ...tsProgram.emit(sourceFile).diagnostics
        ];
      }
    }
    else {
      diagnostics = [
        ...ts.getPreEmitDiagnostics(tsProgram),
        ...tsProgram.emit().diagnostics
      ];
    }
  }
  else {
    if (filePaths.length > 0) {
      for (const filePath of filePaths) {
        const sourceFile = tsProgram.getSourceFile(filePath);
        diagnostics = [
          ...tsProgram.getSemanticDiagnostics(sourceFile),
          ...tsProgram.getSyntacticDiagnostics(sourceFile)
        ];
      }
    }
    else {
      diagnostics = [
        ...tsProgram.getSemanticDiagnostics(),
        ...tsProgram.getSyntacticDiagnostics()
      ];
    }
  }

  const messages: string[] = [];
  for (const diagnostic of diagnostics) {
    if (diagnostic.file) {
      const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      messages.push(`${diagnostic.file.fileName}\n${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${message}`);
    }
    else {
      messages.push(`error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`);
    }
  }

  process.send!(messages, (err: Error) => {
    if (err) throw err;
  });
});
