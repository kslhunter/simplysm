#!/usr/bin/env node --es-module-specifier-resolution=node --no-warnings --experimental-import-meta-resolve --openssl-legacy-provider

import yargs from "yargs";
import {hideBin} from "yargs/helpers";
import {SdCliProject} from "./entry/SdCliProject";
import {Logger, LoggerSeverity} from "@simplysm/sd-core-node";
import {EventEmitter} from "events";
import {SdCliElectron} from "./entry/SdCliElectron";
import {SdCliLocalUpdate} from "./entry/SdCliLocalUpdate";
import {SdCliCordova} from "./build-tools/SdCliCordova";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

const argv = (
  await yargs(hideBin(process.argv))
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
      (cmd) => cmd.version(false).hide("help").hide("debug")
        .options({
          config: {
            string: true,
            describe: "simplysm.cjs 파일 경로"
          },
          options: {
            string: true,
            array: true,
            describe: "옵션 설정"
          }
        })
    )
    .command(
      "watch",
      "프로젝트의 각 패키지에 대한 변경감지 빌드를 수행합니다.",
      (cmd) => cmd.version(false).hide("help").hide("debug")
        .options({
          config: {
            string: true,
            describe: "simplysm.cjs 파일 경로"
          },
          options: {
            string: true,
            array: true,
            describe: "옵션 설정"
          },
          packages: {
            string: true,
            array: true,
            describe: "수행할 패키지 설정"
          },
          inspects: {
            string: true,
            array: true,
            describe: "크롬 inspect를 수행할 패키지 설정"
          }
        })
    )
    .command(
      "build",
      "프로젝트의 각 패키지에 대한 빌드를 수행합니다.",
      (cmd) => cmd.version(false).hide("help").hide("debug")
        .options({
          config: {
            string: true,
            describe: "simplysm.cjs 파일 경로"
          },
          options: {
            string: true,
            array: true,
            describe: "옵션 설정"
          },
          packages: {
            string: true,
            array: true,
            describe: "수행할 패키지 설정"
          }
        })
    )
    .command(
      "publish",
      "프로젝트의 각 패키지를 배포합니다.",
      (cmd) => cmd.version(false).hide("help").hide("debug")
        .options({
          noBuild: {
            type: "boolean",
            describe: "빌드를 하지않고 배포합니다.",
            default: false
          },
          config: {
            type: "string",
            describe: "simplysm.cjs 파일 경로"
          },
          options: {
            type: "string",
            array: true,
            describe: "옵션 설정"
          },
          packages: {
            type: "string",
            array: true,
            describe: "수행할 패키지 설정"
          }
        })
    )
    .command(
      "run-electron <package>",
      "변경감지중인 플랫폼을 ELECTRON 앱 형태로 띄웁니다.",
      (cmd) => cmd
        .positional("package", {
          type: "string",
          describe: "패키지명",
          demandOption: true
        })
        .options({
          config: {
            type: "string",
            describe: "simplysm.json 파일 경로"
          },
          options: {
            type: "string",
            array: true,
            describe: "옵션 설정"
          }
        })
    )
    .command(
      "build-electron-for-dev <package>",
      "변경감지중인 플랫폼을 ELECTRON 앱 형태로 띄웁니다.",
      (cmd) => cmd
        .positional("package", {
          type: "string",
          describe: "패키지명",
          demandOption: true
        })
        .options({
          config: {
            type: "string",
            describe: "simplysm.json 파일 경로"
          },
          options: {
            type: "string",
            array: true,
            describe: "옵션 설정"
          }
        })
    )
    .command(
      "run-cordova <platform> <package> [url]",
      "변경감지중인 플랫폼을 코도바 디바이스에 앱 형태로 띄웁니다.",
      (cmd) => cmd
        .positional("platform", {
          type: "string",
          describe: "빌드 플랫폼(android,...)",
          demandOption: true
        })
        .positional("package", {
          type: "string",
          describe: "패키지명",
          demandOption: true
        })
        .positional("url", {
          type: "string",
          describe: "Webview로 오픈할 URL",
          demandOption: true
        })
    )
    .parseAsync()
) as any;

if (Boolean(argv.debug)) {
  process.env["SD_DEBUG"] = "true";
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

if (argv._[0] === "local-update") {
  await SdCliLocalUpdate.runAsync({
    confFileRelPath: argv.config ?? "simplysm.cjs",
    optNames: argv.options ?? [],
  });
}
else if (argv._[0] === "watch") {
  await SdCliProject
    .watchAsync({
      confFileRelPath: argv.config ?? "simplysm.cjs",
      optNames: argv.options ?? [],
      pkgNames: argv.packages ?? [],
      inspectNames: argv.inspects ?? []
    });
}
else if (argv._[0] === "build") {
  await SdCliProject
    .buildAsync({
      confFileRelPath: argv.config ?? "simplysm.cjs",
      optNames: argv.options ?? [],
      pkgNames: argv.packages ?? []
    });
}
else if (argv._[0] === "publish") {
  await SdCliProject
    .publishAsync({
      noBuild: argv.noBuild,
      confFileRelPath: argv.config ?? "simplysm.cjs",
      optNames: argv.options ?? [],
      pkgNames: argv.packages ?? []
    });
}
else if (argv._[0] === "run-electron") {
  await SdCliElectron
    .runAsync({
      confFileRelPath: argv.config ?? "simplysm.cjs",
      optNames: argv.options ?? [],
      pkgName: argv.package
    });
}
else if (argv._[0] === "build-electron-for-dev") {
  await SdCliElectron
    .buildForDevAsync({
      confFileRelPath: argv.config ?? "simplysm.cjs",
      optNames: argv.options ?? [],
      pkgName: argv.package
    });
}
else if (argv._[0] === "run-cordova") {
  await SdCliCordova.runWebviewOnDeviceAsync({
    platform: argv.platform,
    pkgName: argv.package,
    url: argv.url
  });
}
else {
  throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
}