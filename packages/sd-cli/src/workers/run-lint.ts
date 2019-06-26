import "@simplysm/sd-core";
import * as path from "path";
import * as ts from "typescript";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as os from "os";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

SdWorkerUtils.sendMessage({type: "run"});

const options = {
  ...parsedTsConfig.options,
  strictNullChecks: true
};

const program = ts.createProgram(parsedTsConfig.fileNames, options);
const diagnostics = SdTypescriptUtils.lint(
  program,
  contextPath,
  program.getSourceFiles().filter(item => SdTypescriptUtils.getIsMyFile(item.fileName, contextPath))
);

const messages = diagnostics.map(item => SdTypescriptUtils.diagnosticToMessage(item)).filterExists().distinct();
if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "warning", message: messages.distinct().join(os.EOL)});
}

SdWorkerUtils.sendMessage({type: "done"});
