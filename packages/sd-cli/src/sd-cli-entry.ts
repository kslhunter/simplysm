#!/usr/bin/env node

/* eslint-disable no-console */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { SdCliProject } from "./entry/sd-cli-project";
import { SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdCliElectron } from "./entry/sd-cli-electron";
import { SdCliLocalUpdate } from "./entry/sd-cli-local-update";
import { SdCliCordova } from "./entry/sd-cli-cordova";
import { SdCliAiCommand } from "./entry/sd-cli-ai-command";
import { SdCliPostinstall } from "./entry/sd-cli-postinstall";
import convertPrivate from "./fix/convert-private";
import convertPrivateUnderscore from "./fix/convert-private-underscore";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

await yargs(hideBin(process.argv))
  .help("help", "도움말")
  .alias("help", "h")
  .options({
    debug: {
      type: "boolean",
      describe: "디버그 로그를 표시할 것인지 여부",
      default: false,
    },
  })
  .middleware((argv) => {
    if (argv.debug) {
      process.env["SD_DEBUG"] = "true";
      SdLogger.setConfig({
        console: { level: SdLoggerSeverity.debug },
      });
    }
    else {
      SdLogger.setConfig({ dot: true });
    }
  })
  .command(
    "local-update",
    "로컬 라이브러리 업데이트를 수행합니다.",
    cmd => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .options({
        config: {
          string: true,
          describe: "설정 파일 경로",
          default: "simplysm.js",
        },
        options: {
          string: true,
          array: true,
          describe: "옵션 설정",
        },
      }),
    async (argv) => await SdCliLocalUpdate.runAsync(argv),
  )
  .command(
    "watch",
    "프로젝트의 각 패키지에 대한 변경감지 빌드를 수행합니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .options({
        config: {
          string: true,
          describe: "설정 파일 경로",
          default: "simplysm.js",
        },
        options: {
          string: true,
          array: true,
          describe: "옵션 설정",
        },
        packages: {
          string: true,
          array: true,
          describe: "수행할 패키지 설정",
        },
        inspects: {
          string: true,
          array: true,
          describe: "크롬 inspect를 수행할 패키지 설정",
        },
      }),
    async (argv) => await SdCliProject.watchAsync(argv),
  )
  .command(
    "build",
    "프로젝트의 각 패키지에 대한 빌드를 수행합니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .options({
        config: {
          string: true,
          describe: "설정 파일 경로",
          default: "simplysm.js",
        },
        options: {
          string: true,
          array: true,
          describe: "옵션 설정",
        },
        packages: {
          string: true,
          array: true,
          describe: "수행할 패키지 설정",
        },
      }),
    async (argv) => await SdCliProject.buildAsync(argv),
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .options({
        noBuild: {
          type: "boolean",
          describe: "빌드를 하지않고 배포합니다.",
          default: false,
        },
        config: {
          type: "string",
          describe: "설정 파일 경로",
          default: "simplysm.js",
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정",
        },
        packages: {
          type: "string",
          array: true,
          describe: "수행할 패키지 설정",
        },
      }),
    async (argv) => await SdCliProject.publishAsync(argv),
  )
  .command(
    "run-electron <package>",
    "변경감지중인 플랫폼을 ELECTRON 앱 형태로 띄웁니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .positional("package", {
        type: "string",
        describe: "패키지명",
        demandOption: true,
      })
      .options({
        config: {
          type: "string",
          describe: "설정 파일 경로",
          default: "simplysm.js",
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정",
        },
      }),
    async (argv) => await SdCliElectron.runAsync(argv),
  )
  .command(
    "build-electron-for-dev <package>",
    "변경감지중인 플랫폼을 ELECTRON 앱 형태로 띄웁니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .positional("package", {
        type: "string",
        describe: "패키지명",
        demandOption: true,
      })
      .options({
        config: {
          type: "string",
          describe: "설정 파일 경로",
          default: "simplysm.js",
        },
        options: {
          type: "string",
          array: true,
          describe: "옵션 설정",
        },
      }),
    async (argv) => await SdCliElectron.buildForDevAsync(argv),
  )
  .command(
    "run-cordova <platform> <package> [url]",
    "변경감지중인 플랫폼을 코도바 디바이스에 앱 형태로 띄웁니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug")
      .positional("platform", {
        type: "string",
        describe: "빌드 플랫폼(android,...)",
        demandOption: true,
      })
      .positional("package", {
        type: "string",
        describe: "패키지명",
        demandOption: true,
      })
      .positional("url", {
        type: "string",
        describe: "Webview로 오픈할 URL",
        demandOption: true,
      }),
    async (argv) => await SdCliCordova.runWebviewOnDeviceAsync(argv),
  )
  .command(
    "commit",
    "AI를 통해 변경사항에 대한 커밋 메시지를 작성하여, 커밋 및 푸쉬를 수행합니다.",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug"),
    async () => await SdCliAiCommand.commitAsync(),
  )
  .command(
    "postinstall",
    "설치후 자동실행할 작업",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug"),
    () => SdCliPostinstall.run(),
  )
  .command(
    "fix",
    "가능한 내용 자동 수정",
    (cmd) => cmd
      .version(false)
      .hide("help")
      .hide("debug"),
    () => {
      convertPrivate();
      convertPrivateUnderscore();
    },
  )
  .strict()
  .recommendCommands()
  .fail((msg, err, cmd) => {
    console.error("🚫 지원되지 않는 명령입니다.");
    console.error(msg);
    console.log("\n명령어 목록:");
    cmd.showHelp();
    process.exit(1);
  })
  .parseAsync();
