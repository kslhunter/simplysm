#!/usr/bin/env node --experimental-specifier-resolution=node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { SdCliWorkspace } from "../entry-points/SdCliWorkspace";
import { SdCliLocalUpdate } from "../entry-points/SdCliLocalUpdate";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();

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
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
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
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
        }
      })
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    (cmd) => cmd.version(false)
      .options({
        noBuild: {
          type: "boolean",
          describe: "빌드를 하지않고 배포합니다.",
          default: false
        },
        config: {
          type: "string",
          describe: "simplysm.json 파일 경로"
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)"
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
    await new SdCliLocalUpdate(process.cwd())
      .runAsync({
        confFileRelPath: argv.config ?? "simplysm.json"
      });
  }
  else if (argv._[0] === "watch") {
    await new SdCliWorkspace(process.cwd())
      .watchAsync({
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? []
      });
  }
  else if (argv._[0] === "build") {
    await new SdCliWorkspace(process.cwd())
      .buildAsync({
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? []
      });
  }
  else if (argv._[0] === "publish") {
    await new SdCliWorkspace(process.cwd())
      .publishAsync({
        noBuild: argv.noBuild,
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? []
      });
  }
  else {
    throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  logger.error(err);
});
