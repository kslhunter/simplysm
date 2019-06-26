import "@simplysm/sd-core";
import * as path from "path";
import * as os from "os";
import * as ts from "typescript";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

SdWorkerUtils.sendMessage({type: "run"});

const options = {
  ...parsedTsConfig.options,
  skipLibCheck: true,
  noEmit: !parsedTsConfig.options.declaration,
  emitDeclarationOnly: parsedTsConfig.options.declaration,
  emitOnlyDtsFiles: parsedTsConfig.options.declaration
};

const program = ts.createProgram(parsedTsConfig.fileNames, options);
const diagnostics: ts.Diagnostic[] = [];
for (const sourceFile of program.getSourceFiles()) {
  if (!SdTypescriptUtils.getIsMyFile(sourceFile.fileName, contextPath)) {
    continue;
  }

  diagnostics.pushRange(
    ts.getPreEmitDiagnostics(program, sourceFile).concat(program.emit(sourceFile).diagnostics)
  );
}

const messages = diagnostics.map(item => SdTypescriptUtils.diagnosticToMessage(item)).filterExists().distinct();
if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.join(os.EOL).trim()});
}

SdWorkerUtils.sendMessage({type: "done"});
