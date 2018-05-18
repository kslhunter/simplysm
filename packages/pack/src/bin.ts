#!/usr/bin/env node

import * as yargs from "yargs";
import {buildAsync} from "./commands/buildAsync";
import {publishAsync} from "./commands/publishAsync";

// tslint:disable-next-line:no-unused-expression
yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "build",
    "프로젝트를 빌드합니다.",
    cmd => cmd.version(false)
      .options({
        watch: {
          type: "boolean",
          describe: "변경을 감지하여 자동으로 다시 빌드합니다.",
          default: false
        },
        package: {
          type: "string",
          describe: "빌드할 패키지를 설정합니다."
        },
        config: {
          type: "string",
          describe: "설정파일",
          default: "sd-pack.config.ts"
        }
      }),
    argv => buildAsync(argv as any)
  )
  .command(
    "publish",
    "배포합니다.",
    cmd => cmd.version(false)
      .options({
        config: {
          type: "string",
          describe: "설정파일",
          default: "sd-pack.config.ts"
        }
      }),
    argv => publishAsync(argv as any)
  )
  .argv;