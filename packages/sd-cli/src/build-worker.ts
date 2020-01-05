#!/usr/bin/env node

import {Logger, ProcessWorkManager} from "@simplysm/sd-core-node";
import {SdTypescriptChecker} from "./SdTypescriptChecker";
import {SdTypescriptCompiler} from "./SdTypescriptCompiler";

const logger = Logger.get(["simplysm", "sd-cli", "build-worker"]);

ProcessWorkManager
  .runWorkAsync(async (message) => {
    if (message[0] === "compile") {
      const watch = message[1];
      const tsConfigPath = message[2];
      const mode = message[3];

      const builder = await SdTypescriptCompiler.createAsync({tsConfigPath, mode});
      await builder.runAsync(watch);
    }
    else if (message[0] === "check") {
      const watch = message[1];
      const tsConfigPath = message[2];

      const checker = await SdTypescriptChecker.createAsync(tsConfigPath);
      if (watch) {
        await checker.watchAsync();
      }
      else {
        await checker.runAsync();
      }
    }
    else {
      throw new Error(`명령어가 잘못되었습니다 (${message[0]})`);
    }
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
