const ts = require("typescript");
const path = require("path");
const fs = require("fs-extra");
/*const loaderUtils = require("loader-utils");

const watchProgramMap = new Map();*/

function loader(content) {
  if (this.cacheable) {
    this.cacheable();
  }

  /*const options = loaderUtils.getOptions(this);*/

  const resourcePath = this.resourcePath.replace(/\\/g, "/");

  const resourceDirPath = path.dirname(resourcePath);
  const configPath = ts.findConfigFile(resourceDirPath, ts.sys.fileExists, "tsconfig.json");
  const contextPath = path.dirname(configPath).replace(/\\/g, "/");
  /*const packageName = contextPath.split("/")[contextPath.split("/").length - 1];*/

  const parsedConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(configPath), ts.sys, path.dirname(configPath));
  parsedConfig.options.outDir = parsedConfig.options.outDir || path.resolve(path.dirname(configPath), "dist");
  /*if (parsedConfig.options.paths) {
    for (const key of Object.keys(parsedConfig.options.paths)) {
      for (let i = 0; i < parsedConfig.options.paths[key].length; i++) {
        parsedConfig.options.paths[key][i] = parsedConfig.options.paths[key][i].replace(/[\\/]src[\\/]([^\\/.]*)\.ts$/, "");
      }
    }
  }*/

  /*let watchProgram = watchProgramMap.get(contextPath);

  if (!watchProgram) {
    const host = ts.createWatchCompilerHost(
      configPath,
      {
        outDir: parsedConfig.options.outDir,
        sourceMap: false,
        emitDeclarationOnly: true
      },
      {
        ...ts.sys,
        writeFile: (filePath, content) => {
          filePath = filePath.replace(/\\/g, "/");
          if (filePath.includes("src")) {
            const outPath = path.resolve(parsedConfig.options.outDir, packageName, "src").replace(/\\/g, "/");

            if (!filePath.startsWith(outPath)) {
              return;
            }

            filePath = path.resolve(parsedConfig.options.outDir, path.relative(outPath, filePath));
          }

          fs.mkdirsSync(path.dirname(filePath));
          fs.writeFileSync(filePath, content);
        },
        createDirectory: () => {
        }
      },
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      diagnostic => {
        if (diagnostic.file) {
          if (diagnostic.file.fileName.startsWith(contextPath.replace(/\\/g, "/"))) {
            const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
            const tsMessage = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            const message = `${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): error: ${tsMessage}`;
            options.logger.error(`${packageName}\r\n${message}`);
          }
        }
        else {
          const message = `error: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
          options.logger.error(`${packageName}\r\n${message}`);
        }
      },
      () => {
      }
    );

    watchProgram = ts.createWatchProgram(host);
    watchProgramMap.set(contextPath, watchProgram);
  }*/

  /*const program = watchProgram.getProgram();
  const sourceFile = program.getSourceFile(resourcePath);*/

  const result = ts.transpileModule(content, {
    compilerOptions: parsedConfig.options,
    reportDiagnostics: false
  });

  /*this.clearDependencies();
  const deps = program.getAllDependencies(sourceFile);
  for (const dep of deps) {
    this.addDependency(path.normalize(dep));
  }*/

  const sourceMap = JSON.parse(result.sourceMapText);
  const fileRelativePath = path.relative(contextPath, resourcePath);
  sourceMap.sources = [fileRelativePath];
  sourceMap.file = fileRelativePath;
  sourceMap.sourcesContent = [content];

  this.callback(undefined, result.outputText, sourceMap);
}

module.exports = loader;