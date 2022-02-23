#!/usr/bin/env node --experimental-specifier-resolution=node --experimental-import-meta-resolve

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { SdCliWorkspace } from "../entry-points/SdCliWorkspace";
import { SdCliLocalUpdate } from "../entry-points/SdCliLocalUpdate";
// import sourceMapSupport from "source-map-support";
import { SdCliNpm } from "../entry-points/SdCliNpm";
import { SdCliPrepare } from "../entry-points/SdCliPrepare";

// sourceMapSupport.install();

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
    "prepare",
    "sd-cli 준비",
    (cmd) => cmd.version(false)
  )
  .command(
    "update",
    "패키지 업데이트 (npm update)",
    (cmd) => cmd.version(false)
  )
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
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정"
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
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정"
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
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정"
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
  if (argv._[0] === "prepare") {
    await new SdCliPrepare()
      .prepareAsync();
  }
  else if (argv._[0] === "update") {
    await new SdCliNpm(process.cwd())
      .updateAsync();
  }
  else if (argv._[0] === "local-update") {
    await new SdCliLocalUpdate(process.cwd())
      .runAsync({
        confFileRelPath: argv.config ?? "simplysm.json"
      });
  }
  else if (argv._[0] === "watch") {
    await new SdCliWorkspace(process.cwd())
      .watchAsync({
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? [],
        pkgs: argv.packages ?? []
      });
  }
  else if (argv._[0] === "build") {
    await new SdCliWorkspace(process.cwd())
      .buildAsync({
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? [],
        pkgs: argv.packages ?? []
      });
    process.exit(0);
  }
  else if (argv._[0] === "publish") {
    await new SdCliWorkspace(process.cwd())
      .publishAsync({
        noBuild: argv.noBuild,
        confFileRelPath: argv.config ?? "simplysm.json",
        optNames: argv.options ?? [],
        pkgs: argv.packages ?? []
      });
    if (!argv.noBuild) {
      process.exit(0);
    }
  }
  else {
    throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
