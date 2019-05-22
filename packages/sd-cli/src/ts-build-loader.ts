import "@simplysm/sd-core";
import * as webpack from "webpack";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import * as os from "os";

function diagnosticToMessage(diagnostic: ts.Diagnostic): string | undefined {
  if (diagnostic.file) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    return `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${tsMessage}`;
  }
  else {
    return `error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
  }
}

function loader(this: webpack.loader.LoaderContext, content: string): void {
  if (this.cacheable) {
    this.cacheable();
  }

  if (!fs.pathExistsSync(this.resourcePath)) {
    this.callback(undefined);
    return;
  }

  const resourcePath = this.resourcePath.replace(/\\/g, "/");

  const resourceDirPath = path.dirname(resourcePath);
  const configPath = ts.findConfigFile(resourceDirPath, ts.sys.fileExists, "tsconfig.build.json");
  if (!configPath) {
    this.callback(new Error("'tsconfig.build.json' 파일을 찾을 수 없습니다."));
    return;
  }

  const contextPath = path.dirname(configPath).replace(/\\/g, "/");
  const parsedTsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(configPath), ts.sys, path.dirname(configPath));
  parsedTsConfig.options.outDir = parsedTsConfig.options.outDir || path.resolve(path.dirname(configPath), "dist");

  const result = ts.transpileModule(content, {
    compilerOptions: parsedTsConfig.options,
    reportDiagnostics: false
  });

  if (!result.sourceMapText) {
    this.callback(new Error("소스맵 구성에 실패하였습니다."));
    return;
  }

  if (result.diagnostics) {
    const message = result.diagnostics
      .filter(item => [ts.DiagnosticCategory.Error, ts.DiagnosticCategory.Warning].includes(item.category))
      .map(diagnosticToMessage)
      .filterExists()
      .join(os.EOL)
      .trim();
    if (message) {
      this.callback(new Error(message));
      return;
    }
  }

  const sourceMap = JSON.parse(result.sourceMapText);
  const fileRelativePath = path.relative(contextPath, resourcePath);
  sourceMap.sources = [fileRelativePath];
  sourceMap.file = fileRelativePath;
  sourceMap.sourcesContent = [content];

  this.callback(undefined, result.outputText, sourceMap);
}

export = loader;