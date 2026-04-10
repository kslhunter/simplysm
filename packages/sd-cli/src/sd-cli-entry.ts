#!/usr/bin/env node
/* eslint-disable no-console */

// 사이드 이펙트: Map/Array prototype 확장 (getOrCreate 등)
import { env } from "@simplysm/core-common";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { type CheckType, runCheck } from "./commands/check";
import { runWatch } from "./commands/watch";
import { runDev } from "./commands/dev";
import { runBuild } from "./commands/build";
import { runPublish } from "./commands/publish";
import { runReplaceDeps } from "./commands/replace-deps";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { EventEmitter } from "node:events";
import { consola } from "consola";
import { setupConsola } from "@simplysm/core-node";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 100;

const COMMAND_NAMES = ["check", "watch", "dev", "device", "build", "publish", "replace-deps"];

async function collectYargsHelp(argv: string[]): Promise<string> {
  const lines: string[] = [];

  const orig = console.log;

  console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
  try {
    await createCliParser(argv).exitProcess(false).parse();
  } catch {
    // yargs가 help 출력 후 throw할 수 있음
  } finally {
    console.log = orig;
  }
  return lines.join("\n");
}

/**
 * CLI 파서 생성
 * @internal 테스트용으로 export
 */
export function createCliParser(argv: string[]): Argv {
  // 최상위 --help/-h (서브커맨드 없이): 모든 명령어의 종합 도움말 표시
  const hasHelp = argv.includes("--help") || argv.includes("-h");
  const hasCommand = COMMAND_NAMES.some((cmd) => argv.includes(cmd));
  if (hasHelp && !hasCommand) {
    return yargs([]).command(
      "$0",
      false,
      () => {},
      async () => {
        for (const cmdName of COMMAND_NAMES) {
          const helpText = await collectYargsHelp([cmdName, "--help"]);

          console.log(helpText);

          console.log();
        }
      },
    );
  }

  return yargs(argv)
    .help("help", "Show help")
    .alias("help", "h")
    .option("debug", {
      type: "boolean",
      describe: "Output debug logs",
      default: false,
      global: true,
    })
    .middleware((args) => {
      if (args.debug) {
        env("SD_DEBUG", "true");
      }
      setupConsola({ cli: true });
    })
    .command(
      "check [targets..]",
      "Run Typecheck, Lint, Test in parallel",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to check (e.g., core-common, storage)",
            default: [],
          })
          .options({
            type: {
              type: "string",
              array: true,
              describe: "Check types to run (e.g., --type typecheck --type lint)",
              default: ["typecheck", "lint", "test"] as string[],
            },
            fix: {
              type: "boolean",
              describe: "Auto-fix lint issues",
              default: false,
            },
          }),
      async (args) => {
        await runCheck({
          targets: args.targets,
          types: (() => {
            const validTypes = ["typecheck", "lint", "test"] as const;
            const types = args.type.flatMap((t) => t.split(",").map((s) => s.trim()));
            const invalidTypes = types.filter((t) => !validTypes.includes(t as CheckType));
            if (invalidTypes.length > 0) {
              throw new Error(
                `Invalid check type(s): ${invalidTypes.join(", ")}. Valid types: ${validTypes.join(", ")}`,
              );
            }
            return types as CheckType[];
          })(),
          fix: args.fix,
        });
      },
    )
    .command(
      "watch [targets..]",
      "Build packages in watch mode",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to watch (e.g., core-common, storage)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o a -o b)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runWatch({
          targets: args.targets,
          options: args.opt,
        });
      },
    )
    .command(
      "dev [targets..]",
      "Run Server packages in dev mode",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to run (e.g., service-server)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o a -o b)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runDev({
          targets: args.targets,
          options: args.opt,
        });
      },
    )
    .command(
      "device [target]",
      "Run native app on device/desktop",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("target", {
            type: "string",
            describe: "Client package to run (e.g., my-client-app)",
          })
          .options({
            url: {
              type: "string",
              description: "Dev server URL (auto-detected from sd.config.ts if omitted)",
            },
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o a -o b)",
              default: [] as string[],
            },
          }),
      async (args) => {
        const { runDevice } = await import("./commands/device");
        await runDevice({
          target: args.target,
          url: args.url,
          options: args.opt,
        });
      },
    )
    .command(
      "build [targets..]",
      "Run production build",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to build (e.g., core-common, storage)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o a -o b)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runBuild({
          targets: args.targets,
          options: args.opt,
        });
      },
    )
    .command(
      "publish [targets..]",
      "Publish packages",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to publish (e.g., core-common, storage)",
            default: [],
          })
          .options({
            "build": {
              type: "boolean",
              describe: "Run build (skip with --no-build)",
              default: true,
            },
            "dry-run": {
              type: "boolean",
              describe: "Simulate without actual deployment",
              default: false,
            },
            "opt": {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o a -o b)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runPublish({
          targets: args.targets,
          noBuild: !args.build,
          dryRun: args.dryRun,
          options: args.opt,
        });
      },
    )
    .command(
      "replace-deps",
      "Replace node_modules packages with local sources via symlink according to replaceDeps config in sd.config.ts",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o a -o b)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runReplaceDeps({
          options: args.opt,
        });
      },
    )
    .demandCommand(1, "Please specify a command.")
    .strict()
    .fail((msg, err) => {
      if (msg) {
        consola.error(msg);
        process.exit(1);
      }
      throw err;
    });
}

// CLI로 직접 실행될 때만 파싱
// ESM에서 메인 모듈 판별: import.meta.url과 process.argv[1]을 정규화하여 비교
const cliEntryPath = process.argv.at(1);
if (
  cliEntryPath != null &&
  fileURLToPath(import.meta.url) === fs.realpathSync(path.resolve(cliEntryPath))
) {
  await createCliParser(hideBin(process.argv)).parse();
}
