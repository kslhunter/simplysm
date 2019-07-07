import * as path from "path";
import {SdWorkerUtils} from "@simplysm/sd-cli/dist/commons/SdWorkerUtils";
import {SdNgGenerator} from "@simplysm/sd-cli/dist/commons/SdNgGenerator";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

new SdNgGenerator(tsConfigPath).watch(
  () => {
    SdWorkerUtils.sendMessage({type: "run"});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "done"});
  }
).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err.stack});
});
