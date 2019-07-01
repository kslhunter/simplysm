import {SdTypescriptBuilder} from "../SdTypescriptBuilder";
import * as path from "path";
import * as os from "os";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

const builder = new SdTypescriptBuilder(tsConfigPath);
builder.watch(
  changedInfos => {
    const messages: string[] = [];
    for (const changedInfo of changedInfos) {
      messages.pushRange(builder.generateMetadata(changedInfo.filePath));
    }

    if (messages.length > 0) {
      SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
    }

    SdWorkerUtils.sendMessage({type: "done"});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "run"});
  }
).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err.stack});
});
