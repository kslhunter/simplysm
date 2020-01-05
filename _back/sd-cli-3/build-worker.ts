#!/usr/bin/env node

import * as yargs from "yargs";
import {Logger} from "@simplysm/sd-core-node";
import {SdTypescriptChecker} from "./SdTypescriptChecker";
import {NotImplementError} from "@simplysm/sd-core-common";
import {SdTypescriptCompiler} from "./SdTypescriptCompiler";

const argv = yargs
  .options({
    command: {type: "string", requiresArg: true},
    tsConfigPath: {type: "string", requiresArg: true},
    mode: {type: "string", default: "production"},
    watch: {type: "boolean", default: false}
  })
  .argv;

const logger = Logger.get(["simplysm", "sd-cli", "build-worker"]);

(async () => {
  if (argv.command === "check") {
    const checker = await SdTypescriptChecker.createAsync(argv.tsConfigPath!);
    if (argv.watch) {
      await checker.watchAsync();
    }
    else {
      throw new NotImplementError();
    }
  }
  else if (argv.command === "build") {
    const builder = await SdTypescriptCompiler.createAsync({
      tsConfigPath: argv.tsConfigPath!,
      mode: argv.mode as "development" | "production",
      watch: argv.watch
    });
    await builder.runAsync();
  }
  else {
    throw new Error(`명령어가 잘못되었습니다.\n\n\t${argv._[0]}\n`);
  }

  process.send!("done", (err?: Error) => {
    if (err) {
      logger.error(err);
      process.exit(1);
    }
  });
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
