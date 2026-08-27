#!/usr/bin/env node

// 사이드 이펙트: Map/Array prototype 확장 (getOrCreate 등)
import { env } from "@simplysm/core-common";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { type CheckType, runCheck } from "./commands/check";
import { runWatch } from "./commands/watch";
import { runDev } from "./commands/dev";
import { runBuild } from "./commands/build";
import { runInit } from "./commands/init/init";
import { runInitClient } from "./commands/init/init-client";
import { runPublish } from "./commands/publish/publish-command";
import { runReplaceDeps } from "./commands/replace-deps";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { EventEmitter } from "node:events";
import { setupConsola } from "@simplysm/core-node";
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("sd:cli:entry");

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 100;

/**
 * CLI 파서 생성
 * @internal 테스트용으로 export
 */
export function createCliParser(argv: string[]): Argv {
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
      "check",
      "Run Typecheck, Lint, Test in parallel",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            target: {
              type: "string",
              array: true,
              alias: "t",
              describe: "Packages to check (e.g., --target core-common --target storage)",
              default: [] as string[],
            },
            type: {
              type: "string",
              array: true,
              describe: "Check types to run (e.g., --type typecheck --type lint)",
              default: ["typecheck", "lint"] as string[],
            },
            fix: {
              type: "boolean",
              describe: "Auto-fix lint issues",
              default: false,
            },
          }),
      async (args) => {
        await runCheck({
          targets: args.target,
          types: (() => {
            const validTypes = ["typecheck", "lint"] as const;
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
      "watch",
      "Build packages in watch mode",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            target: {
              type: "string",
              array: true,
              alias: "t",
              describe: "Packages to watch (e.g., --target core-common --target storage)",
              default: [] as string[],
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
        await runWatch({
          targets: args.target,
          options: args.opt,
        });
      },
    )
    .command(
      "dev",
      "Run Server packages in dev mode",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            target: {
              type: "string",
              array: true,

              alias: "t",
              describe: "Packages to run (e.g., --target service-server)",
              default: [] as string[],
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
        await runDev({
          targets: args.target,
          options: args.opt,
        });
      },
    )
    .command(
      "device",
      "Run native app on device/desktop",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            target: {
              type: "string",
              alias: "t",
              describe: "Client package to run (e.g., --target my-client-app)",
            },
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
      "build",
      "Run production build",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            target: {
              type: "string",
              array: true,

              alias: "t",
              describe: "Packages to build (e.g., --target core-common --target storage)",
              default: [] as string[],
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
        await runBuild({
          targets: args.target,
          options: args.opt,
        });
      },
    )
    .command(
      "publish",
      "Publish packages",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            "target": {
              type: "string",
              array: true,

              alias: "t",
              describe: "Packages to publish (e.g., --target core-common --target storage)",
              default: [] as string[],
            },
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
            "otp": {
              type: "string",
              describe: "npm 2FA one-time password (omit to let npm handle auth interactively)",
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
          targets: args.target,
          noBuild: !args.build,
          dryRun: args.dryRun,
          otp: args.otp,
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
    .command(
      "init [kind]",
      "Bootstrap a new SI workspace via interactive prompts (kind=client: add a client package to an existing workspace)",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("kind", {
            describe: "init 대상 (생략: 새 워크스페이스 부트스트랩)",
            type: "string",
            choices: ["client"] as const,
          }),
      async (args) => {
        if (args.kind === "client") {
          await runInitClient({ cwd: process.cwd() });
        } else {
          await runInit({ cwd: process.cwd() });
        }
      },
    )
    .demandCommand(1, "Please specify a command.")
    .strict()
    .fail((msg, err) => {
      if (msg) {
        logger.error(msg);
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
