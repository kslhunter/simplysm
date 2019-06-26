import "@simplysm/sd-core";
import * as path from "path";
import * as ts from "typescript";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as os from "os";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";

const packageKey = process.argv[2];
const useScss = process.argv.slice(3).includes("scss");

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

  const newSourceFile = ts.createSourceFile(fileName, content, parsedTsConfig.options.target || ts.ScriptTarget.ES5);

  diagnostics.pushRange(
    SdTypescriptUtils.generateMetadata(newSourceFile, contextPath)
  );
}

const messages = diagnostics.map(item => SdTypescriptUtils.diagnosticToMessage(item)).filterExists().distinct();
if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL)});
}

SdWorkerUtils.sendMessage({type: "done"});
