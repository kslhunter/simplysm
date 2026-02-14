#!/usr/bin/env node

// side-effect: Map/Array 프로토타입 확장 (getOrCreate 등)
import "@simplysm/core-common";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { runLint } from "./commands/lint";
import { runTypecheck } from "./commands/typecheck";
import { runWatch } from "./commands/watch";
import { runDev } from "./commands/dev";
import { runBuild } from "./commands/build";
import { runPublish } from "./commands/publish";
import { runReplaceDeps } from "./commands/replace-deps";
import { runDevice } from "./commands/device";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { EventEmitter } from "node:events";
import { consola, LogLevels } from "consola";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 100;

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
      "lint [targets..]",
      "ESLint + Stylelint를 실행한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "린트할 경로 (예: packages/core-common, tests/orm)",
            default: [],
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
      async (args) => {
        await runLint({
          targets: args.targets,
          fix: args.fix,
          timing: args.timing,
        });
      },
    )
    .command(
      "typecheck [targets..]",
      "TypeScript 타입체크를 실행한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "타입체크할 경로 (예: packages/core-common, tests/orm)",
            default: [],
          })
          .options({
            configOpt: {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runTypecheck({
          targets: args.targets,
          options: args.configOpt,
        });
      },
    )
    .command(
      "watch [targets..]",
      "패키지를 watch 모드로 빌드한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "watch할 패키지 (예: solid, solid-demo)",
            default: [],
          })
          .options({
            configOpt: {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runWatch({
          targets: args.targets,
          options: args.configOpt,
        });
      },
    )
    .command(
      "dev [targets..]",
      "Client와 Server 패키지를 개발 모드로 실행한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "실행할 패키지 (예: solid-demo)",
            default: [],
          })
          .options({
            configOpt: {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runDev({
          targets: args.targets,
          options: args.configOpt,
        });
      },
    )
    .command(
      "build [targets..]",
      "프로덕션 빌드를 실행한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "빌드할 패키지 (예: solid, core-common)",
            default: [],
          })
          .options({
            configOpt: {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runBuild({
          targets: args.targets,
          options: args.configOpt,
        });
      },
    )
    .command(
      "device",
      "Android 디바이스에서 앱을 실행한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            package: {
              type: "string",
              alias: "p",
              describe: "패키지 이름",
              demandOption: true,
            },
            url: {
              type: "string",
              alias: "u",
              describe: "개발 서버 URL (미지정 시 sd.config.ts의 server 설정 사용)",
            },
            configOpt: {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runDevice({
          package: args.package,
          url: args.url,
          options: args.configOpt,
        });
      },
    )
    .command(
      "init",
      "새 프로젝트를 초기화한다.",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        const { runInit } = await import("./commands/init.js");
        await runInit({});
      },
    )
    .command("add", "프로젝트에 패키지를 추가한다.", (cmd) =>
      cmd
        .version(false)
        .hide("help")
        .command(
          "client",
          "클라이언트 패키지를 추가한다.",
          (subCmd) => subCmd.version(false).hide("help"),
          async () => {
            const { runAddClient } = await import("./commands/add-client.js");
            await runAddClient({});
          },
        )
        .command(
          "server",
          "서버 패키지를 추가한다.",
          (subCmd) => subCmd.version(false).hide("help"),
          async () => {
            const { runAddServer } = await import("./commands/add-server.js");
            await runAddServer({});
          },
        )
        .demandCommand(1, "패키지 타입을 지정해주세요. (client, server)"),
    )
    .command(
      "publish [targets..]",
      "패키지를 배포한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "배포할 패키지 (예: solid, core-common)",
            default: [],
          })
          .options({
            "build": {
              type: "boolean",
              describe: "빌드 실행 (--no-build로 스킵)",
              default: true,
            },
            "dry-run": {
              type: "boolean",
              describe: "실제 배포 없이 시뮬레이션",
              default: false,
            },
            "configOpt": {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runPublish({
          targets: args.targets,
          noBuild: !args.build,
          dryRun: args.dryRun,
          options: args.configOpt,
        });
      },
    )
    .command(
      "replace-deps",
      "sd.config.ts의 replaceDeps 설정에 따라 node_modules 패키지를 로컬 소스로 symlink 교체한다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            configOpt: {
              type: "string",
              array: true,
              alias: "o",
              description: "sd.config.ts에 전달할 옵션 (예: -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runReplaceDeps({
          options: args.configOpt,
        });
      },
    )
    .demandCommand(1, "명령어를 지정해주세요.")
    .strict();
}

// CLI로 직접 실행될 때만 파싱 수행
// ESM에서 메인 모듈 판별: import.meta.url과 process.argv[1]을 정규화하여 비교
const cliEntryPath = process.argv.at(1);
if (cliEntryPath != null && fileURLToPath(import.meta.url) === fs.realpathSync(path.resolve(cliEntryPath))) {
  await createCliParser(hideBin(process.argv)).parse();
}
