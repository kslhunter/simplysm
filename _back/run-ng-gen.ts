import * as path from "path";
import {SdWorkerUtils} from "@simplysm/sd-cli/dist/commons/SdWorkerUtils";
import {SdNgGenerator} from "@simplysm/sd-cli/dist/commons/SdNgGenerator";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

try {
  new SdNgGenerator(tsConfigPath).build();
}
catch (err) {
  SdWorkerUtils.sendMessage({type: "error", message: err.stack});
}

SdWorkerUtils.sendMessage({type: "done"});
