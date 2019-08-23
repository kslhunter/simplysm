import "@simplysm/sd-core";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdWebpackServerCompiler} from "../SdWebpackServerCompiler";

const packageKey = process.argv[2];
const opts = process.argv[3] ? process.argv[3].split(",").map(item => item.trim()) : undefined;

SdWorkerUtils.sendMessage({type: "run"});

new SdWebpackServerCompiler(packageKey, opts)
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
