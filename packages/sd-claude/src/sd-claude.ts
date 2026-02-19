#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install.js";
import { runNpx } from "./commands/npx.js";

const argv = hideBin(process.argv);

// npx 커맨드는 모든 인자를 그대로 전달해야 하므로 yargs 파싱을 우회
if (argv[0] === "npx") {
  runNpx(argv.slice(1));
} else {
  await yargs(argv)
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
    .command("npx", "크로스플랫폼 npx 래퍼", (cmd) => cmd.version(false).hide("help"))
    .demandCommand(1, "명령어를 지정해주세요.")
    .strict()
    .parse();
}
