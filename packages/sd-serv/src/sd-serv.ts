#!/usr/bin/env node

/* eslint-disable no-console */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { SdServerContainer } from "./SdServerContainer";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

(async () => {
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

    console.log("killed");
  } else if (argv._[0] === "list") {
    const list = await SdServerContainer.listAsync();

    console.log(
      list
        .map((item) =>
          [
            `[${item.pm_id}:${item.name}]`,
            `[STATUS:${item.pm2_env?.status}]`,
            `[RESTART:${item.pm2_env?.restart_time}]`,
            `[PID:${item.pid}]`,
            `[CPU:${item.monit?.cpu?.toLocaleString()}]`,
            `[MEM:${Math.round((item.monit?.memory ?? 0) / 1024 / 1024).toLocaleString()}MB]`,
          ].join(" "),
        )
        .join("\n"),
    );
  } else if (argv._[0] === "start") {
    const proc = await SdServerContainer.startAsync(argv.id);
    console.log(`${proc.pm_id}:${proc.name} started`);
  } else if (argv._[0] === "stop") {
    const proc = await SdServerContainer.stopAsync(argv.id);
    console.log(`${proc.pm_id}:${proc.name} stopped`);
  } else if (argv._[0] === "restart") {
    const proc = await SdServerContainer.restartAsync(argv.id);
    console.log(`${proc.pm_id}:${proc.name} restarted`);
  } else if (argv._[0] === "delete") {
    const proc = await SdServerContainer.deleteAsync(argv.id);
    console.log(`${proc.pm_id}:${proc.name} deleted`);
  } else {
    throw new Error(`명령어가 잘못 되었습니다.\n\t${argv._[0]}\n`);
  }
})().catch((err) => {
  console.error(err);
});
