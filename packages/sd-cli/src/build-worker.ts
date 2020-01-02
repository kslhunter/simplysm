#!/usr/bin/env node

import * as yargs from "yargs";
import {Logger} from "@simplysm/sd-core-node";
import {SdPackageBuilder} from "./SdPackageBuilder";

const argv = yargs
  .options({
    package: {type: "string", requiresArg: true},
    options: {type: "string", default: ""},
    mode: {type: "string", default: "production"},
    watch: {type: "boolean", default: false}
  })
  .argv;

const logger = Logger.get(["simplysm", "sd-cli", "build-worker"]);

(async () => {
  const builder = new SdPackageBuilder({
    package: argv.package!,
    options: argv.options!,
    mode: argv.mode! as "development" | "production"
  });

  if (argv.watch) {
    await builder.watchAsync();
    process.send!("done", (err?: Error) => {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
    });
  }
  else {
    await builder.buildAsync();
  }
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
