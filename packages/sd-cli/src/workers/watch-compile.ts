import {SdTypescriptBuilder} from "../SdTypescriptBuilder";
import * as path from "path";
import * as os from "os";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdCliUtils} from "../commons/SdCliUtils";
import * as fs from "fs-extra";

const packageKey = process.argv[2];
const opts = process.argv[3] ? process.argv[3].split(",").map(item => item.trim()) : undefined;

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

const builder = new SdTypescriptBuilder(tsConfigPath);
builder.watch(
  changedInfos => {
    const messages: string[] = [];
    for (const changedInfo of changedInfos.filter(item => item.type !== "dependency")) {
      messages.pushRange(builder.compile(changedInfo.filePath));
    }

    if (messages.length > 0) {
      SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
    }

    SdWorkerUtils.sendMessage({type: "done"});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "run"});
  }
).then(() => {
  const config = SdCliUtils.getConfigObj("development", opts).packages[packageKey];
  fs.writeFileSync(path.resolve(builder.outDir, ".configs.json"), JSON.stringify({env: "development", ...config.configs}, undefined, 2));
}).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err.stack});
});
