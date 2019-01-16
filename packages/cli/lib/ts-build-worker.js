const ts = require("typescript");
const path = require("path");
const fs = require("fs-extra");

const packageKey = process.argv[2];
const watch = process.argv[3] === "watch";

const packagePath = path.resolve(process.cwd(), "packages", packageKey).replace(/\\/g, "/");
const tsConfigPath = path.resolve(packagePath, "tsconfig.build.json").replace(/\\/g, "/");
const tsConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(tsConfigPath), ts.sys, packagePath);
tsConfig.options.outDir = tsConfig.options.outDir || path.resolve(packagePath, "dist");

process.on("message", async (changedFiles) => {
  try {
    changedFiles = changedFiles.length > 0 ? changedFiles : tsConfig.fileNames;

    await Promise.all(changedFiles.map(changedFile => new Promise(async (resolve, reject) => {
      try {
        const distFilePath = path.resolve(tsConfig.options.outDir, path.relative(path.resolve(packagePath, "src"), changedFile))
          .replace(/\.ts$/, ".js");

        if (!fs.existsSync(changedFile)) {
          await Promise.all([
            fs.remove(distFilePath),
            fs.remove(distFilePath + ".map")
          ]);
          return;
        }

        const content = await fs.readFile(changedFile, "utf8");

        const result = ts.transpileModule(content, {
          compilerOptions: tsConfig.options,
          reportDiagnostics: false
        });

        await Promise.all([
          fs.writeFile(distFilePath, result.outputText),
          fs.writeFile(distFilePath + ".map", result.sourceMapText)
        ]);
        resolve();
      }
      catch (err) {
        reject(err);
      }
    })));
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


function sendMessage(message) {
  process.send(message, err => {
    if (err) throw err;
  });
}


function loader(content) {
  if (this.cacheable) {
    this.cacheable();
  }

  const resourcePath = this.resourcePath.replace(/\\/g, "/");

  const resourceDirPath = path.dirname(resourcePath);
  const configPath = ts.findConfigFile(resourceDirPath, ts.sys.fileExists, "tsconfig.json");
  const contextPath = path.dirname(configPath).replace(/\\/g, "/");

  const parsedConfig = ts.parseJsonConfigFileContent(fs.readJsonSync(configPath), ts.sys, path.dirname(configPath));
  parsedConfig.options.outDir = parsedConfig.options.outDir || path.resolve(path.dirname(configPath), "dist");

  const result = ts.transpileModule(content, {
    compilerOptions: parsedConfig.options,
    reportDiagnostics: false
  });

  const sourceMap = JSON.parse(result.sourceMapText);
  const fileRelativePath = path.relative(contextPath, resourcePath);
  sourceMap.sources = [fileRelativePath];
  sourceMap.file = fileRelativePath;
  sourceMap.sourcesContent = [content];

  this.callback(undefined, result.outputText, sourceMap);
}

module.exports = loader;
