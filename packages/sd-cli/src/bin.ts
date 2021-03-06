#!/usr/bin/env node

import * as yargs from "yargs";
import * as os from "os";
import {Logger, ProcessManager} from "@simplysm/sd-core";
import {SdProjectBuilder} from "./SdProjectBuilder";
import * as path from "path";
import {EventEmitter} from "events";

require("source-map-support/register"); //tslint:disable-line

EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "local-update",
    "프로젝트의 의존성 패키지에, 외부 디렉토리에 있는 패키지 파일을 덮어씁니다.",
    cmd => cmd.version(false)
  )
  .command(
    "build",
    "프로젝트의 각 패키지를 빌드합니다.",
    cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경감지 모드로 실행할지 여부",
          default: false
        },
        options: {
          type: "string",
          describe: "빌드 옵션 설정 (설정파일에서 @로 시작하는 부분)"
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
        options: {
          type: "string",
          describe: "빌드 옵션 설정 (설정파일에서 @로 시작하는 부분)"
        }
      })
  )
  .command(
    "test",
    "테스트 프로젝트를 수행합니다.",
    cmd => cmd.version(false)
      .options({
        options: {
          type: "string",
          describe: "빌드 옵션 설정 (설정파일에서 @로 시작하는 부분)"
        }
      })
  )
  .command(
    "run-device",
    "현재 watch중인 프로젝트의 장치를 실행합니다.",
    cmd => cmd.version(false)
      .options({
        package: {
          type: "string",
          describe: "장치에 실행시킬 모바일 패키지",
          demandOption: true
        }
      })
  )
  .argv;

const logger = new Logger("@simplysm/sd-cli");

(async () => {
  switch (argv._[0]) {
    case "local-update":
      await new SdProjectBuilder().localUpdateAsync();
      break;
    case "build":
      await new SdProjectBuilder().buildAsync(argv as any);
      break;
    case "publish":
      await new SdProjectBuilder().publishAsync(argv as any);
      break;
    case "test":
      await new SdProjectBuilder().testAsync(argv as any);
      break;
    case "run-device":
      const cordovaProjectPath = path.resolve(process.cwd(), "packages", argv.package as string, ".cordova");
      const cordovaBinPath = path.resolve(process.cwd(), "node_modules", ".bin", "cordova.cmd");
      await ProcessManager.spawnAsync(`${cordovaBinPath} run android --device`, {cwd: cordovaProjectPath});
      break;
    default:
      throw new Error(`명령어가 잘못되었습니다.${os.EOL}${os.EOL}\t${argv._[0]}${os.EOL}`);
  }
})().catch(err => {
  logger.error(err);
  process.exit(1);
});
