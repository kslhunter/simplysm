#!/usr/bin/env node

import * as yargs from "yargs";
import {Logger} from "@simplysm/sd-core-node";
import {SdProjectBuilder} from "./SdProjectBuilder";

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "build",
    "프로젝트의 각 패키지를 빌드합니다.",
    (cmd) =>
      cmd.version(false)
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
  .argv;

const logger = Logger.get(["simplysm", "sd-cli"]);

(async () => {
  switch (argv._[0]) {
    case "build":
      await new SdProjectBuilder(argv.options as any).buildAsync(argv.watch as any);
      break;
    default:
      throw new Error(`명령어가 잘못되었습니다.\n\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  logger.error(err);
  process.exit(1);
});
