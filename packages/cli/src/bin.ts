#!/usr/bin/env node

import * as yargs from "yargs";
import {SdPackageBuilder} from "./SdPackageBuilder";
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
  )
  .argv;

(async () => {
  if (argv._[0] === "bootstrap") {
    await new SdPackageBuilder().bootstrapAsync();
  }
  else if (argv._[0] === "watch") {
    await new SdPackageBuilder().watchAsync();
  }
  else if (argv._[0] === "build") {
    await new SdPackageBuilder().buildAsync();
  }
  else if (argv._[0] === "publish") {
    await new SdPackageBuilder().publishAsync();
  }
  else {
    throw new Error("명령어가 잘못 되었습니다.");
  }
})().catch(err => {
  new Logger("@simplysm/cli").error(err);
  process.exit(1);
});
