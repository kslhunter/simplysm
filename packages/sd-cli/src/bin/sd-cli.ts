#!/usr/bin/env node

import * as os from "os";
import * as yargs from "yargs";
import { EventEmitter } from "events";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { SdCliProject } from "../entry-points/SdCliProject";
import { SdCliLocalUpdater } from "../entry-points/SdCliLocalUpdater";
import { SdCliFileCrypto } from "../utils/SdCliFileCrypto";
import { SdCliCordova } from "../build-tools/SdCliCordova";
import { SdCliPrepare } from "../entry-points/SdCliPrepare";

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const logger = Logger.get(["simplysm", "sd-cli"]);

(async (): Promise<void> => {
  const argv = await yargs.version(false)
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
      "watch",
      "프로젝트의 각 패키지에 대한 변경감지 빌드를 수행합니다.",
      (cmd) => cmd
        .options({
          packages: {
            type: "string",
            describe: "수행할 패키지 설정",
            array: true
          },
          config: {
            type: "string",
            describe: "simplysm.json 파일 경로"
          },
          options: {
            type: "string",
            describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)",
            array: true
          }
        })
    )
    .command(
      "run-device <cordovaPath> <target> <url>",
      "변경감지중인 플랫폼을 디바이스에 앱 형태로 띄웁니다.",
      (cmd) => cmd
        .positional("cordovaPath", {
          type: "string",
          describe: "CORDOVA 프로젝트 경로",
          demandOption: true
        })
        .positional("target", {
          type: "string",
          describe: "빌드타겟(android,...)",
          demandOption: true
        })
        .positional("url", {
          type: "string",
          describe: "Webview로 오픈할 URL",
          demandOption: true
        })
    )
    .command(
      "build",
      "프로젝트의 각 패키지에 대한 빌드를 수행합니다.",
      (cmd) => cmd
        .options({
          packages: {
            type: "string",
            describe: "수행할 패키지 설정",
            array: true
          },
          config: {
            type: "string",
            describe: "simplysm.json 파일 경로"
          },
          noLint: {
            type: "boolean",
            describe: `lint 작업을 수행하지 않음`
          },
          options: {
            type: "string",
            describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)",
            array: true
          }
        })
    )
    .command(
      "publish",
      "프로젝트의 각 패키지를 배포합니다.",
      (cmd) => cmd.version(false)
        .options({
          build: {
            type: "boolean",
            describe: "새로 빌드한 후에 배포합니다",
            default: false
          },
          noLint: {
            type: "boolean",
            describe: `빌드시, lint 작업을 수행하지 않음`
          },
          packages: {
            type: "string",
            describe: "수행할 패키지 설정",
            array: true
          },
          config: {
            type: "string",
            describe: "simplysm.json 파일 경로"
          },
          options: {
            type: "string",
            describe: "옵션 설정 (설정파일에서 @로 시작하는 부분)",
            array: true
          }
        })
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
      "enc-file <file>",
      "파일을 암호화 합니다.",
      (cmd) => cmd.version(false)
        .positional("file", {
          type: "string",
          describe: "암호화할 파일명"
        })
    )
    .command(
      "dec-file <file>",
      "파일을 복호화 합니다.",
      (cmd) => cmd.version(false)
        .positional("file", {
          type: "string",
          describe: "암호화된 파일명"
        })
    )
    .command(
      "prepare",
      "sd-cli 준비"
    )
    .parse();

  if (argv.debug) {
    Error.stackTraceLimit = 100; //Infinity;

    process.env.SD_CLI_LOGGER_SEVERITY = "DEBUG";

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

  const args = argv._;

  if (args[0] === "build") {
    await new SdCliProject(process.cwd())
      .buildAsync({
        packages: argv.packages,
        config: argv.config,
        options: argv.options,
        skipProcesses: argv.noLint ? ["lint"] : undefined
      });
    process.exit(0);
  }
  else if (args[0] === "watch") {
    await new SdCliProject(process.cwd())
      .buildAsync({
        watch: true,
        packages: argv.packages,
        config: argv.config,
        options: argv.options,
        skipProcesses: argv.noLint ? ["lint"] : undefined
      });
  }
  else if (args[0] === "run-device") {
    await SdCliCordova.runWebviewOnDeviceAsync(argv.cordovaPath, argv.target, argv.url);
  }
  else if (args[0] === "local-update") {
    await new SdCliLocalUpdater(process.cwd()).localUpdateAsync(false, { config: argv.config });
  }
  else if (args[0] === "publish") {
    await new SdCliProject(process.cwd())
      .publishAsync({
        build: argv.build,
        packages: argv.packages,
        config: argv.config,
        options: argv.options
      });
    process.exit(0);
  }
  else if (args[0] === "enc-file") {
    await new SdCliFileCrypto().encryptAsync(argv.file!);
  }
  else if (args[0] === "dec-file") {
    await new SdCliFileCrypto().decryptAsync(argv.file!);
  }
  else if (args[0] === "prepare") {
    await new SdCliPrepare().prepareAsync();
  }
  else {
    throw new Error(`명령어가 잘못되었습니다.${os.EOL + os.EOL}\t${argv._[0]}${os.EOL}`);
  }
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
