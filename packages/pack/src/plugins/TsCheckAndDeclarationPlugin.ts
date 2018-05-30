import * as webpack from "webpack";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as path from "path";
import {Logger} from "@simplism/core";

export class TsDeclarationPlugin implements webpack.Plugin {
  public constructor(private readonly _options: { packageName: string; logger: Logger }) {
  }

  public apply(compiler: webpack.Compiler): void {
    const contextPath = path.resolve(process.cwd(), "packages", this._options.packageName).replace(/\\/g, "/");
    const tsconfigPath = path.resolve(contextPath, "tsconfig.json").replace(/\\/g, "/");

    const parsedConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(tsconfigPath), ts.sys, contextPath);
    const outDir = parsedConfig.options.outDir || path.resolve(contextPath, "dist");

    const host = ts.createWatchCompilerHost(
      tsconfigPath,
      {
        outDir,
        sourceMap: false,
        emitDeclarationOnly: true
      },
      {
        ...ts.sys,
        writeFile: (filePath, content) => {
          let newFilePath = filePath.replace(/\\/g, "/");
          if (newFilePath.includes("src")) {
            const prevOutDir = path.resolve(outDir, this._options.packageName, "src").replace(/\\/g, "/");

            if (!newFilePath.startsWith(prevOutDir)) {
              return;
            }

            newFilePath = path.resolve(outDir, path.relative(prevOutDir, filePath));
          }

          fs.mkdirsSync(path.dirname(newFilePath));
          fs.writeFileSync(newFilePath, content);
        },
        createDirectory: () => {
        }
      },
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      diagnostic => {
        if (diagnostic.file) {
          if (diagnostic.file.fileName.startsWith(contextPath.replace(/\\/g, "/"))) {
            const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            const message = `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${tsMessage}`;
            this._options.logger.error(`${this._options.packageName} declaration:\r\n${message}`);
          }
        }
        else {
          const message = `error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
          this._options.logger.error(`${this._options.packageName} declaration:\r\n${message}`);
        }
      },
      () => {
      }
    );

    ts.createWatchProgram(host);
  }
}