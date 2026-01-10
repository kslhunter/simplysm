#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runLint } from "./commands/lint";

Error.stackTraceLimit = Infinity;

await yargs(hideBin(process.argv))
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "lint [patterns..]",
    "ESLint를 실행합니다.",
    (cmd) =>
      cmd
        .version(false)
        .hide("help")
        .positional("patterns", {
          type: "string",
          array: true,
          describe: "glob 패턴 (예: **/*.{ts,js,html})",
          demandOption: true,
        })
        .options({
          fix: {
            type: "boolean",
            describe: "자동 수정",
            default: false,
          },
          timing: {
            type: "boolean",
            describe: "규칙별 실행 시간 출력",
            default: false,
          },
        }),
    async (argv) => {
      await runLint({
        patterns: argv.patterns,
        fix: argv.fix,
        timing: argv.timing,
      });
    },
  )
  .demandCommand(1, "명령어를 지정해주세요.")
  .strict()
  .parse();
