import { Logger, LoggerSeverity, SdProcessWorker } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdPackageBuilder } from "./build-tools/SdPackageBuilder";
import { ISdPackageInfo } from "./commons";

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
    const watch = args[0] as boolean;
    const packageInfo = args[1] as ISdPackageInfo;
    const command = args[2];
    const target = args[3] as "browser" | "node" | undefined;
    const devMode = args[4] as boolean;

    await new SdPackageBuilder(packageInfo, command, target, devMode)
      .on("change", filePaths => {
        worker.send("change", { packageName: packageInfo.npmConfig.name, command, target, filePaths });
      })
      .on("complete", results => {
        worker.send("complete", { packageName: packageInfo.npmConfig.name, command, target, results });
      })
      .runAsync(watch);
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}