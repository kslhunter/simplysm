import * as path from "path";
import * as os from "os";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptProgram} from "../SdTypescriptProgram";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

const program = new SdTypescriptProgram(tsConfigPath, {});

const messages = program.emitDeclaration();
if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
}

SdWorkerUtils.sendMessage({type: "done"});

/*
const builder = new SdTypescriptBuilder(tsConfigPath);

SdWorkerUtils.sendMessage({type: "run"});

const messages: string[] = [];
for (const filePath of builder.getFilePaths()) {
  messages.pushRange(builder.emitDeclaration(filePath));
}

if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
}

SdWorkerUtils.sendMessage({type: "done"});
*/
