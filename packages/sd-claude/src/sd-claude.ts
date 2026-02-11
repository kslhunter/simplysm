#!/usr/bin/env node

import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install";
import { runUninstall } from "./commands/uninstall";
import path from "path";
import { fileURLToPath } from "url";
import { consola, LogLevels } from "consola";

/**
 * CLI 파서를 생성한다.
 * @internal 테스트용으로 export
 */
export function createCliParser(argv: string[]): Argv {
  return yargs(argv)
    .help("help", "도움말")
    .alias("help", "h")
    .option("debug", {
      type: "boolean",
      describe: "debug 로그 출력",
      default: false,
      global: true,
    })
    .middleware((args) => {
      if (args.debug) consola.level = LogLevels.debug;
    })
    .command(
      "install",
      "Claude Code 스킬/에이전트를 현재 프로젝트에 설치한다.",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        await runInstall({});
      },
    )
    .command(
      "uninstall",
      "현재 프로젝트에서 Claude Code 스킬/에이전트를 제거한다.",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        await runUninstall({});
      },
    )
    .demandCommand(1, "명령어를 지정해주세요.")
    .strict();
}

const cliEntryPath = process.argv.at(1);
if (cliEntryPath != null && fileURLToPath(import.meta.url) === path.resolve(cliEntryPath)) {
  await createCliParser(hideBin(process.argv)).parse();
}
