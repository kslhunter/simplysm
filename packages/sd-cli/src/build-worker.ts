#!/usr/bin/env node

import {Logger, ProcessWorkManager} from "@simplysm/sd-core-node";
import {SdTypescriptCompiler} from "./builders/SdTypescriptCompiler";
import {SdTypescriptChecker} from "./builders/SdTypescriptChecker";

const logger = Logger.get(["simplysm", "sd-cli", "build-worker"]);

ProcessWorkManager
  .defineWorkAsync(async (message) => {
    if (message[0] === "compile") {
      const watch = message[1];
      const tsConfigPath = message[2];
      const mode = message[3];
      const framework = message[4];

      const builder = await SdTypescriptCompiler.createAsync({tsConfigPath, mode, framework});
      await builder.runAsync(watch);
    }
    else if (message[0] === "check") {
      const watch = message[1];
      const tsConfigPath = message[2];
      const framework = message[3];
      const polyfills = message[4];
      const indexFilePath = message[5];

      const checker = new SdTypescriptChecker(
        tsConfigPath,
        framework?.startsWith("angular"),
        polyfills,
        indexFilePath
      );
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
