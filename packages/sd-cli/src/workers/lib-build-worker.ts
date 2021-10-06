import { EventEmitter } from "events";
import { FsUtil, Logger, LoggerSeverity, SdProcessChildWorker } from "@simplysm/sd-core-node";
import * as path from "path";
import { SdCliTypescriptBuilder } from "../builders/SdCliTypescriptBuilder";
import { SdCliNgLibraryBuilder } from "../builders/SdCliNgLibraryBuilder";
import { SdCliJavascriptLinter } from "../builders/SdCliJavascriptLinter";
import { ISdAutoIndexConfig, ISdPackageBuildResult } from "../commons";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli", "lib-build-worker"]);

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
  SdProcessChildWorker.defineWorker(async (worker, args) => {
    const rootPath = args[0] as string;
    const target = args[1] as "node" | "browser" | "angular" | undefined;
    const watch = args[2] as boolean;
    const skipProcesses = args[3] as ("emit" | "check" | "lint" | "genIndex")[];

    if (target === undefined) {
      // 1. output를 내놓지 않는 Typescript 라이브러리(types)인 경우, typecheck와 lint만 수행
      if (FsUtil.exists(path.resolve(rootPath, `tsconfig.json`))) {
        const tsconfigFilePath = path.resolve(rootPath, `tsconfig.json`);

        const builder = new SdCliTypescriptBuilder(rootPath, tsconfigFilePath, skipProcesses.concat(["emit", "genIndex"]).distinct(), undefined);
        await builder
          .on("change", () => {
            worker.send("change");
          })
          .on("complete", (results: ISdPackageBuildResult[]) => {
            worker.send("complete", results);
          })
          .buildAsync(watch);
      }
      // 2. Javascript 라이브러리인경우, lint만 수행함
      else {
        const linter = new SdCliJavascriptLinter(rootPath);
        await linter
          .on("change", () => {
            worker.send("change");
          })
          .on("complete", (results: ISdPackageBuildResult[]) => {
            worker.send("complete", results);
          })
          .lintAsync(watch);
      }
    }
    else {
      const autoIndexConfig = args[4] as ISdAutoIndexConfig | undefined;
      const tsconfigFilePath = path.resolve(rootPath, `sd-tsconfig.${target}.json`);

      if (target !== "angular") {
        const builder = new SdCliTypescriptBuilder(rootPath, tsconfigFilePath, skipProcesses, autoIndexConfig);
        await builder
          .on("change", () => {
            worker.send("change");
          })
          .on("complete", (results: ISdPackageBuildResult[]) => {
            worker.send("complete", results);
          })
          .buildAsync(watch);
      }
      else {
        const builder = new SdCliNgLibraryBuilder(rootPath, tsconfigFilePath, skipProcesses, autoIndexConfig);
        await builder
          .on("change", () => {
            worker.send("change");
          })
          .on("complete", (results: ISdPackageBuildResult[]) => {
            worker.send("complete", results);
          })
          .buildAsync(watch);
      }
    }
  });
}
catch (err) {
  logger.error(err);
  process.exit(1);
}
