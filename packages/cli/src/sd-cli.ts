#!/usr/bin/env node

// side-effect: Map/Array 프로토타입 확장 (getOrCreate 등)
import "@simplysm/core-common";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { runLint } from "./commands/lint";
import { runTypecheck } from "./commands/typecheck";

Error.stackTraceLimit = Infinity;

/**
 * CLI 파서를 생성합니다.
 * @internal 테스트용으로 export
 */
export function createCliParser(argv: string[]): Argv {
  return yargs(argv)
    .help("help", "도움말")
    .alias("help", "h")
    .command(
      "lint [targets..]",
      "ESLint를 실행합니다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "린트할 경로 (예: packages/core-common, tests/orm)",
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
            debug: {
              type: "boolean",
              describe: "debug 로그 출력",
              default: false,
            },
          }),
      async (argv) => {
        await runLint({
          targets: argv.targets ?? [],
          fix: argv.fix,
          timing: argv.timing,
          debug: argv.debug,
        });
      },
    )
    .command(
      "typecheck [targets..]",
      "TypeScript 타입체크를 실행합니다.",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "타입체크할 경로 (예: packages/core-common, tests/orm)",
          })
          .options({
            debug: {
              type: "boolean",
              describe: "debug 로그 출력",
              default: false,
            },
          }),
      async (argv) => {
        await runTypecheck({
          targets: argv.targets ?? [],
          debug: argv.debug,
        });
      },
    )
    .demandCommand(1, "명령어를 지정해주세요.")
    .strict();
}

// CLI로 직접 실행될 때만 파싱 수행
const isMainModule =
  process.argv[1] != null && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMainModule) {
  await createCliParser(hideBin(process.argv)).parse();
}
