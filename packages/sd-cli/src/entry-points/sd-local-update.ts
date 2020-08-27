#!/usr/bin/env node

import "source-map-support/register";

import * as yargs from "yargs";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdCliLocalUpdate } from "../builders/SdCliLocalUpdate";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .options({
    debug: {
      type: "boolean",
      describe: "디버그 로그를 표시할 것인지 여부",
      default: false
    },
    config: {
      type: "string",
      describe: "simplysm.json 파일 경로"
    },
    options: {
      type: "array",
      describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)",
      default: []
    }
  })
  .argv;

const logger = Logger.get(["simplysm", "sd-local-update"]);

if (argv.debug) {
  Error.stackTraceLimit = 100; //Infinity;

  process.env.SD_CLI_LOGGER_SEVERITY = "DEBUG";

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

(async (): Promise<void> => {
  await SdCliLocalUpdate.runAsync({
    options: argv.options,
    config: argv.config
  });
})().catch(err => {
  logger.error(err);
  process.exit(1);
});