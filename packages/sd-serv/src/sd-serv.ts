#!/usr/bin/env node --import=specifier-resolution-node/register

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdServerContainer } from "./SdServerContainer";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

const argv = (await yargs(hideBin(process.argv))
  .help("help", "도움말")
  .alias("help", "h")
  .options({
    debug: {
      type: "boolean",
      describe: "디버그 로그를 표시할 것인지 여부",
      default: false,
    },
  })
  .command("kill", "종료", (cmd) => cmd.version(false).hide("help").hide("debug"))
  .command("list", "서버 목록보기", (cmd) => cmd.version(false).hide("help").hide("debug"))
  .command("start", "서버 시작", (cmd) => cmd.version(false).hide("help").hide("debug"))
  .command("stop <id>", "서버 종료", (cmd) =>
    cmd.version(false).hide("help").hide("debug").positional("id", {
      type: "number",
      describe: "아이디",
    }),
  )
  .command("restart <id>", "서버 재시작", (cmd) =>
    cmd.version(false).hide("help").hide("debug").positional("id", {
      type: "number",
      describe: "아이디",
    }),
  )
  .command("delete <id>", "서버 삭제", (cmd) =>
    cmd.version(false).hide("help").hide("debug").positional("id", {
      type: "number",
      describe: "아이디",
    }),
  )
  .parseAsync()) as any;

if (Boolean(argv.debug)) {
  process.env["SD_DEBUG"] = "true";
  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug,
    },
  });
} else {
  Logger.setConfig({
    dot: true,
  });
}

if (argv._[0] === "kill") {
  await SdServerContainer.killAsync();
} else if (argv._[0] === "list") {
  await SdServerContainer.listAsync();
} else if (argv._[0] === "start") {
  await SdServerContainer.startAsync(argv.id);
} else if (argv._[0] === "stop") {
  await SdServerContainer.stopAsync(argv.id);
} else if (argv._[0] === "restart") {
  await SdServerContainer.restartAsync(argv.id);
} else if (argv._[0] === "delete") {
  await SdServerContainer.deleteAsync(argv.id);
} else {
  throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
}
