import "@simplysm/sd-core";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdAngularCompiler} from "../SdAngularCompiler";

const packageKey = process.argv[2];
const options = process.argv[3];

SdWorkerUtils.sendMessage({type: "run"});

new SdAngularCompiler(packageKey, options ? options.split(",").map(item => item.trim()) : undefined)
  .on("done", () => {
    SdWorkerUtils.sendMessage({type: "done"});
  })
  .on("log", () => (message: string) => {
    SdWorkerUtils.sendMessage({type: "log", message});
  })
  .on("info", (message: string) => {
    SdWorkerUtils.sendMessage({type: "info", message});
  })
  .on("warning", (message: string) => {
    SdWorkerUtils.sendMessage({type: "warning", message});
  })
  .on("error", (message: string) => {
    SdWorkerUtils.sendMessage({type: "error", message});
  })
  .runAsync()
  .catch((err: Error) => {
    SdWorkerUtils.sendMessage({type: "error", message: err.stack});
  });
