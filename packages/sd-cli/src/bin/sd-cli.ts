#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { SdCliWorkspace } from "../entry-points/SdCliWorkspace";
import { SdCliLocalUpdate } from "../entry-points/SdCliLocalUpdate";

Error.stackTraceLimit = Infinity;

const argv = yargs(hideBin(process.argv))
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .options({
    debug: {
      type: "boolean",
      describe: "디버그 로그를 표시할 것인지 여부",
      default: false
    }
  })
  .command(
    "local-update",
    "로컬 라이브러리 업데이트를 수행합니다.",
    (cmd) => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        }
      })
  )
  .command(
    "watch",
    "프로젝트의 각 패키지에 대한 변경감지 빌드를 수행합니다.",
    (cmd) => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        }
      })
  )
  .command(
    "build",
    "프로젝트의 각 패키지에 대한 빌드를 수행합니다.",
    (cmd) => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        }
      })
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    (cmd) => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        },
        "noBuild": {
          type: "boolean",
          describe: "빌드를 하지않고 배포합니다.",
          default: false
        }
      })
  )
  .parseSync();

if (argv.debug) {
  process.env["SD_CLI_LOGGER_SEVERITY"] = "DEBUG";

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

const logger = Logger.get(["simplysm", "sd-cli", "bin", "sd-cli"]);

(async () => {
  if (argv._[0] === "local-update") {
    await new SdCliLocalUpdate(process.cwd(), argv.config)
      .runAsync();
  }
  else if (argv._[0] === "watch") {
    await new SdCliWorkspace(process.cwd(), argv.config)
      .watchAsync();
  }
  else if (argv._[0] === "build") {
    await new SdCliWorkspace(process.cwd(), argv.config)
      .buildAsync();
  }
  else if (argv._[0] === "publish") {
    await new SdCliWorkspace(process.cwd(), argv.config)
      .publishAsync({
        noBuild: argv.noBuild
      });
  }
  else {
    throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  logger.error(err);
});
