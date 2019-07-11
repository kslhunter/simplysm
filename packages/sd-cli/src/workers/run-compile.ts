import "@simplysm/sd-core";
import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as os from "os";
import {SdCliUtils} from "../commons/SdCliUtils";
import * as fs from "fs-extra";
import {SdTypescriptProgram} from "../SdTypescriptProgram";

const packageKey = process.argv[2];
const opts = process.argv[3] ? process.argv[3].split(",").map(item => item.trim()) : undefined;

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

const program = new SdTypescriptProgram(tsConfigPath, {
  replaceScssToCss: true
});

const messages = program.transpile();
if (messages.length > 0) {
  SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
}

const config = SdCliUtils.getConfigObj("production", opts).packages[packageKey];

fs.writeFileSync(
  path.resolve(program.outDirPath, ".configs.json"),
  JSON.stringify({env: "production", ...config.configs}, undefined, 2)
);

SdWorkerUtils.sendMessage({type: "done"});
