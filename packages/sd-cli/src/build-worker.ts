import {Logger, LoggerSeverity, SdProcessWorker} from "@simplysm/sd-core-node";
import {EventEmitter} from "events";
import {SdPackageBuilder} from "./build-tools/SdPackageBuilder";
import {ISdPackageInfo} from "./commons";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli", "build-worker"]);
if (process.env.SD_CLI_LOGGER_SEVERITY === "DEBUG") {
  Error.stackTraceLimit = 100; //Infinity;

  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    dot: true
  });
}

try {
  SdProcessWorker.defineWorker(async (worker, args) => {
    const packageInfo = args[0] as ISdPackageInfo;
    const command = args[1];
    const target = args[2] as "browser" | "node" | undefined;
    const devMode = args[3] as boolean;

    await new SdPackageBuilder(packageInfo, command, target, devMode)
      .on("change", filePaths => {
        worker.send("change", {packageName: packageInfo.npmConfig.name, command, target, filePaths});
      })
      .on("complete", results => {
        worker.send("complete", {packageName: packageInfo.npmConfig.name, command, target, results});
      })
      .runAsync();
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}