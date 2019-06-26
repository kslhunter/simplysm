import "@simplysm/sd-core";
import * as path from "path";
import * as ts from "typescript";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as os from "os";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";
import * as fs from "fs-extra";
import {SdCliUtils} from "../commons/SdCliUtils";

const packageKey = process.argv[2];
const opts = process.argv[3] ? process.argv[3].split(",").map(item => item.trim()) : undefined;
const useScss = process.argv.slice(4).includes("scss");

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

SdWorkerUtils.sendMessage({type: "run"});

const options = parsedTsConfig.options;

const program = ts.createProgram(parsedTsConfig.fileNames, options);
const diagnostics: ts.Diagnostic[] = [];
for (const sourceFile of program.getSourceFiles()) {
  if (!SdTypescriptUtils.getIsMyFile(sourceFile.fileName, contextPath)) {
    continue;
  }

  const fileName = sourceFile.fileName;
  let content = sourceFile.getFullText();

  if (useScss) {
    content = SdTypescriptUtils.compileScss(fileName, content, false);
  }

  diagnostics.pushRange(
    SdTypescriptUtils.compile(fileName, content, options)
  );
}

const messages = diagnostics.map(item => SdTypescriptUtils.diagnosticToMessage(item)).filterExists().distinct();
if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL)});
}

const config = SdCliUtils.getConfigObj("production", opts).packages[packageKey];
fs.writeFileSync(path.resolve(parsedTsConfig.options.outDir!, ".configs.json"), JSON.stringify({env: "production", ...config.configs}, undefined, 2));

SdWorkerUtils.sendMessage({type: "done"});
