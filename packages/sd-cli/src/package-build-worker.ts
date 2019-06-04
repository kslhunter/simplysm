import {ISdWorkerMessage} from "./commons/interfaces";
import {SdPackageChecker} from "./builders/SdPackageChecker";
import {SdPackageLinter} from "./builders/SdPackageLinter";
import {SdPackageBuilder} from "./SdPackageBuilder";

require("source-map-support/register"); //tslint:disable-line

const type = process.argv[2] as "build" | "check" | "lint";
const packageKey = process.argv[3];
const isWatch = process.argv[4] === "watch";
const options = process.argv[5];

const sendMessage = (message: ISdWorkerMessage) => {
  process.send!(message, (err: Error) => {
    if (err) throw err;
  });
};

const packageBuilderClass =
  type === "build" ? SdPackageBuilder :
    type === "check" ? SdPackageChecker :
      SdPackageLinter;

const builder = new packageBuilderClass(
  packageKey,
  options ? options.split(",").map(item => item.trim()) : undefined
);
let cpuUsage: NodeJS.CpuUsage;
builder
  .on("run", () => {
    cpuUsage = process.cpuUsage();
    sendMessage({type: "run"});
  })
  .on("done", () => {
    const usage = process.cpuUsage(cpuUsage);
    sendMessage({type: "done", message: {cpuUsage: Math.floor((usage.user + usage.system) / 1000)}});
  })
  .on("log", () => (message: string) => {
    sendMessage({type: "log", message});
  })
  .on("info", (message: string) => {
    sendMessage({type: "info", message});
  })
  .on("warning", (message: string) => {
    sendMessage({type: "warning", message});
  })
  .on("error", (message: string) => {
    sendMessage({type: "error", message});
  });

if (isWatch) {
  builder.watchAsync().catch(err => {
    sendMessage({type: "error", message: err.stack});
  });
}
else {
  builder.runAsync().catch(err => {
    sendMessage({type: "error", message: err.stack});
  });
}
