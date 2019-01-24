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

    for (const changedFile of changedFiles) {
      const distFilePath = path.resolve(tsConfig.options.outDir, path.relative(path.resolve(packagePath, "src"), changedFile))
        .replace(/\.ts$/, ".js");

      fs.ensureDirSync(path.dirname(distFilePath));

      if (!fs.existsSync(changedFile)) {
        fs.removeSync(distFilePath);
        fs.removeSync(distFilePath + ".map");
      }
      else {
        const content = fs.readFileSync(changedFile, "utf8");

        const result = ts.transpileModule(content, {
          compilerOptions: tsConfig.options,
          reportDiagnostics: false,
          fileName: changedFile
        });

        fs.writeFileSync(distFilePath, result.outputText);
        fs.writeFileSync(distFilePath + ".map", result.sourceMapText);
      }
    }
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
