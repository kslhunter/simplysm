#!/usr/bin/env node

import * as yargs from "yargs";
import {SdProjectBuilder} from "./SdProjectBuilder";
import * as sourceMapSupport from "source-map-support";
import {Logger} from "@simplysm/common";

sourceMapSupport.install();

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "bootstrap",
    "프로젝트의 각 패키지 세팅을 다시 합니다.",
    cmd => cmd.version(false)
  )
  .command(
    "local-update",
    "프로젝트의 의존성 패키지에, 외부 디렉토리에 있는 패키지 파일을 덮어씁니다.",
    cmd => cmd.version(false)
  )
  .command(
    "watch",
    "프로젝트의 각 패키지를 변경감지 모드로 시작합니다.",
    cmd => cmd.version(false)
  )
  .command(
    "build",
    "프로젝트의 각 패키지를 빌드합니다.",
    cmd => cmd.version(false)
  )
  .command(
    "publish",
    "프로젝트의 각 패키지를 배포합니다.",
    cmd => cmd.version(false)
      .options({
        build: {
          type: "boolean",
          describe: "빌드후에 배포합니다.",
          default: false
        }
      })
  )
  .argv;

(async () => {
  if (argv._[0] === "bootstrap") {
    await new SdProjectBuilder().bootstrapAsync();
  }
  else if (argv._[0] === "local-update") {
    await new SdProjectBuilder().localUpdateAsync();
  }
  else if (argv._[0] === "watch") {
    await new SdProjectBuilder().watchAsync();
  }
  else if (argv._[0] === "build") {
    await new SdProjectBuilder().buildAsync();
  }
  else if (argv._[0] === "publish") {
    await new SdProjectBuilder().publishAsync(argv as any);
  }
  else {
    throw new Error("명령어가 잘못 되었습니다.");
  }
})().catch(err => {
  new Logger("@simplysm/cli").error(err);
  process.exit(1);
});
