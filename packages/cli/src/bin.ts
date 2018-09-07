#!/usr/bin/env node

import * as yargs from "yargs";
import {buildAsync} from "./commands/buildAsync";
import {publishAsync} from "./commands/publishAsync";
import {localUpdateAsync} from "./commands/localUpdateAsync";
import {EventEmitter} from "events";
import {testAsync} from "./commands/testAsync";
import {keygenAsync} from "./commands/keygenAsync";
import {runDeviceAsync} from "./commands/runDeviceAsync";

// tslint:disable-next-line:no-var-requires no-require-imports
require("source-map-support").install();
EventEmitter.defaultMaxListeners = 20;

// tslint:disable-next-line:no-unused-expression
yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "test",
    "프로젝트를 테스트합니다.",
    cmd => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "설정파일",
          default: "simplism.json"
        },
        package: {
          type: "string",
          describe: "테스트할 패키지를 설정합니다."
        }
      }),
    async argv => {
      await testAsync(argv as any)
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    }
  )
  .command(
    "build",
    "프로젝트를 빌드합니다.",
    cmd => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "설정파일",
          default: "simplism.json"
        },
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 다시 빌드합니다.",
          default: false
        },
        package: {
          type: "string",
          describe: "빌드할 패키지를 설정합니다."
        }
      }),
    async argv => {
      await buildAsync(argv as any)
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    }
  )
  .command(
    "publish",
    "배포합니다.",
    cmd => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "설정파일",
          default: "simplism.json"
        },
        package: {
          type: "string",
          describe: "배포할 패키지를 설정합니다."
        }
      }),
    async argv => {
      await publishAsync(argv as any)
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    }
  )
  .command(
    "local-update",
    "로컬에 있는 simplism 패키지로 의존성 모듈을 덮어씁니다. (고급)",
    cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 업데이트합니다.",
          default: false
        },
        config: {
          type: "string",
          describe: "설정파일",
          default: "simplism.json"
        }
      }),
    async argv => {
      await localUpdateAsync(argv as any)
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    }
  )
  .command(
    "keygen",
    "안드로이드 사인키를 생성합니다.",
    cmd => cmd
      .version(false as any)
      .options({
        alias: {
          type: "string" as yargs.PositionalOptionsType,
          describe: "구분명칭",
          required: true
        },
        password: {
          type: "string" as yargs.PositionalOptionsType,
          describe: "비밀번호",
          required: true
        }
      }),
    async argv => {
      await keygenAsync(argv as any)
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    }
  )
  .command(
    "run-device",
    "장치에서 실행합니다.",
    cmd => cmd
      .version(false as any)
      .options({
        config: {
          type: "string",
          describe: "설정파일",
          default: "simplism.json"
        },
        package: {
          type: "string",
          describe: "실행할 패키지를 설정합니다.",
          required: true
        },
        release: {
          type: "boolean" as yargs.PositionalOptionsType,
          describe: "릴리즈버전을 실행합니다. (감지중이 아니고, 빌드되어 있어야 합니다.)",
          default: false
        },
        debug: {
          type: "boolean" as yargs.PositionalOptionsType,
          describe: "디버그버전을 실행합니다. (감지중이 아니고, 빌드되어 있어야 합니다.)",
          default: false
        }
      }),
    async argv => {
      await runDeviceAsync(argv as any)
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    }
  )
  .argv;