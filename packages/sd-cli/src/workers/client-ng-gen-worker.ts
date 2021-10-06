import { EventEmitter } from "events";
import { Logger, LoggerSeverity, SdProcessChildWorker } from "@simplysm/sd-core-node";
import { SdCliNgLibraryBuilder } from "../builders/SdCliNgLibraryBuilder";
import * as path from "path";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli", "ng-gen-worker"]);

if (process.env.SD_CLI_LOGGER_SEVERITY === "DEBUG") {
  Error.stackTraceLimit = 100; //Infinity;

  Logger.setConfig(["simplysm", "sd-cli"], {
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig(["simplysm", "sd-cli"], {
    dot: true
  });
}


try {
  let ngGenerator: SdCliNgLibraryBuilder | undefined;
  SdProcessChildWorker.defineWorker(async (worker, args) => {
    const rootPath = args[0] as string;
    const watch = args[1] as boolean;
    const changedFilePaths = args[2] as string[] | undefined;

    const tsconfigFilePath = path.resolve(rootPath, `sd-tsconfig.json`);

    if (!ngGenerator || !changedFilePaths) {
      ngGenerator = new SdCliNgLibraryBuilder(rootPath, tsconfigFilePath, ["emit", "check", "lint", "genIndex"], undefined);
      const genDirtyFilePaths = await ngGenerator.reloadProgramAsync(watch);
      const genResult = await ngGenerator.generateAdditionalFilesAsync(genDirtyFilePaths, watch);
      worker.send("complete", {
        dirtyFilePaths: [...genDirtyFilePaths, ...genResult.dirtyFilePaths],
        result: genResult.result
      });
    }
    else {
      const genDirtyFilePaths = await ngGenerator.reloadChangedProgramAsync(changedFilePaths, watch);
      if (genDirtyFilePaths.length === 0) {
        worker.send("complete", { dirtyFilePaths: [], result: [] });
        return;
      }

      const genResult = await ngGenerator.generateAdditionalFilesAsync(genDirtyFilePaths.distinct(), watch);
      worker.send("complete", { dirtyFilePaths: genResult.dirtyFilePaths, result: genResult.result });
    }
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}
