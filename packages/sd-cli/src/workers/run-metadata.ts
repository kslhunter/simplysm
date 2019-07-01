import "@simplysm/sd-core";
import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as os from "os";
import {SdTypescriptBuilder} from "../SdTypescriptBuilder";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

const builder = new SdTypescriptBuilder(tsConfigPath);

const messages: string[] = [];
for (const filePath of builder.getFilePaths()) {
  messages.pushRange(builder.generateMetadata(filePath));
}

if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
}

SdWorkerUtils.sendMessage({type: "done"});
