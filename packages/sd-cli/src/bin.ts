#!/usr/bin/env node

import * as yargs from "yargs";
import {Logger, LoggerSeverity} from "@simplysm/sd-core-node";
import * as os from "os";
import {EventEmitter} from "events";
import {SdCliProject} from "./bin/SdCliProject";
import {SdCliLocalUpdate} from "./bin/SdCliLocalUpdate";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

// TODO: apk 빌드 및 배포 기능 구현 안됨 (android watch만 구현됨)
const argv = yargs
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
    "프로젝트의 의존성 패키지에, 외부 디렉토리에 있는 패키지 파일을 덮어씁니다.",
    cmd => cmd.version(false)
      .options({
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
  )
  .command(
    "build",
    "빌드를 수행합니다.",
    cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경감지 모드로 실행할지 여부",
          default: false
        },
        packages: {
          type: "array",
          describe: "수행할 패키지 설정",
          default: []
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
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    cmd => cmd.version(false)
      .options({
        build: {
          type: "boolean",
          describe: "새로 빌드한 후 배포합니다",
          default: false
        },
        packages: {
          type: "array",
          describe: "수행할 패키지 설정",
          default: []
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
  )
  .argv;

const logger = Logger.get(["simplysm", "sd-cli"]);

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
  if (argv._[0] === "local-update") {
    await SdCliLocalUpdate.runAsync({
      config: argv.config,
      options: argv.options
    });
  }
  else if (argv._[0] === "build") {
    const project = await SdCliProject.createAsync({
      devMode: argv.watch,
      packages: argv.packages,
      config: argv.config,
      options: argv.options
    });
    await project.buildAsync(argv.watch);
  }
  else if (argv._[0] === "publish") {
    const project = await SdCliProject.createAsync({
      devMode: false,
      packages: argv.packages,
      config: argv.config,
      options: argv.options
    });
    await project.publishAsync(argv.build);
  }
  else {
    throw new Error(`명령어가 잘못되었습니다.${os.EOL + os.EOL}\t${argv._[0]}${os.EOL}`);
  }
})().catch(err => {
  logger.error(err);
  process.exit(1);
});