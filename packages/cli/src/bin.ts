#!/usr/bin/env node

import * as yargs from "yargs";
import {SdPackageBuilder} from "./SdPackageBuilder";
import * as sourceMapSupport from "source-map-support";

sourceMapSupport.install();

const argv = yargs
  .version(false)
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "start",
    "프로젝트의 개발버전을 시작합니다.",
    cmd => cmd.version(false)
  )
  .command(
    "build",
    "프로젝트를 빌드합니다.",
    cmd => cmd.version(false)
  )
  .argv;

(async () => {
  if (argv._[0] === "build") {
    await new SdPackageBuilder().buildAsync();
  }
  else if (argv._[0] === "start") {
    await new SdPackageBuilder().startAsync();
  }
  else {
    throw new Error("명령어가 잘못 되었습니다.");
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
