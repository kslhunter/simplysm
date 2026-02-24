#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install.js";

await yargs(hideBin(process.argv))
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "install",
    "Claude Code 에셋을 프로젝트에 설치한다.",
    (cmd) => cmd.version(false).hide("help"),
    () => {
      runInstall();
    },
  )
  .demandCommand(1, "명령어를 지정해주세요.")
  .strict()
  .parse();
