#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install.js";
import { runAuthAdd } from "./commands/auth-add.js";
import { runAuthUse } from "./commands/auth-use.js";
import { runAuthList } from "./commands/auth-list.js";
import { runAuthRemove } from "./commands/auth-remove.js";

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
  .command("auth", "Claude 계정 프로필을 관리한다.", (cmd) =>
    cmd
      .version(false)
      .hide("help")
      .command(
        "add <name>",
        "현재 로그인된 계정을 저장",
        (sub) =>
          sub.positional("name", {
            type: "string",
            demandOption: true,
          }),
        (argv) => {
          try {
            runAuthAdd(argv.name);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error((err as Error).message);
            process.exit(1);
          }
        },
      )
      .command(
        "use <name>",
        "저장된 계정으로 전환",
        (sub) =>
          sub.positional("name", {
            type: "string",
            demandOption: true,
          }),
        (argv) => {
          try {
            runAuthUse(argv.name);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error((err as Error).message);
            process.exit(1);
          }
        },
      )
      .command(
        "list",
        "저장된 계정 목록 표시",
        (sub) => sub,
        () => {
          try {
            runAuthList();
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error((err as Error).message);
            process.exit(1);
          }
        },
      )
      .command(
        "remove <name>",
        "저장된 계정 삭제",
        (sub) =>
          sub.positional("name", {
            type: "string",
            demandOption: true,
          }),
        (argv) => {
          try {
            runAuthRemove(argv.name);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error((err as Error).message);
            process.exit(1);
          }
        },
      )
      .demandCommand(1, "auth 하위 명령어를 지정해주세요."),
  )
  .demandCommand(1, "명령어를 지정해주세요.")
  .strict()
  .parse();
