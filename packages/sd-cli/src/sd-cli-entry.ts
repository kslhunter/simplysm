#!/usr/bin/env node

// side-effect: Map/Array prototype extensions (getOrCreate, etc.)
import "@simplysm/core-common";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { runLint } from "./commands/lint";
import { runTypecheck } from "./commands/typecheck";
import { runCheck, type CheckType } from "./commands/check";
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
 * Create CLI parser
 * @internal exported for testing
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
      if (args.debug) consola.level = LogLevels.debug;
    })
    .command(
      "lint [targets..]",
      "Run ESLint + Stylelint",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Paths to lint (e.g., packages/core-common, tests/orm)",
            default: [],
          })
          .options({
            fix: {
              type: "boolean",
              describe: "Auto-fix issues",
              default: false,
            },
            timing: {
              type: "boolean",
              describe: "Print execution time per rule",
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
      "Run TypeScript type checking",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Paths to typecheck (e.g., packages/core-common, tests/orm)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runTypecheck({
          targets: args.targets,
          options: args.opt,
        });
      },
    )
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
            describe: "Paths to check (e.g., packages/core-common, tests/orm)",
            default: [],
          })
          .options({
            type: {
              type: "string",
              describe: "Check types to run (comma-separated: typecheck,lint,test)",
              default: "typecheck,lint,test",
            },
          }),
      async (args) => {
        await runCheck({
          targets: args.targets,
          types: args.type.split(",").map((t) => t.trim()) as CheckType[],
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
            describe: "Packages to watch (e.g., solid, solid-demo)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
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
      "Run Client and Server packages in dev mode",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to run (e.g., solid-demo)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
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
      "build [targets..]",
      "Run production build",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .positional("targets", {
            type: "string",
            array: true,
            describe: "Packages to build (e.g., solid, core-common)",
            default: [],
          })
          .options({
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
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
      "device",
      "Run app on Android device",
      (cmd) =>
        cmd
          .version(false)
          .hide("help")
          .options({
            package: {
              type: "string",
              alias: "p",
              describe: "Package name",
              demandOption: true,
            },
            url: {
              type: "string",
              alias: "u",
              describe: "Development server URL (if not specified, use server config from sd.config.ts)",
            },
            opt: {
              type: "string",
              array: true,
              alias: "o",
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
              default: [] as string[],
            },
          }),
      async (args) => {
        await runDevice({
          package: args.package,
          url: args.url,
          options: args.opt,
        });
      },
    )
    .command(
      "init",
      "Initialize new project",
      (cmd) => cmd.version(false).hide("help"),
      async () => {
        const { runInit } = await import("./commands/init.js");
        await runInit({});
      },
    )
    .command("add", "Add package to project", (cmd) =>
      cmd
        .version(false)
        .hide("help")
        .command(
          "client",
          "Add client package",
          (subCmd) => subCmd.version(false).hide("help"),
          async () => {
            const { runAddClient } = await import("./commands/add-client.js");
            await runAddClient({});
          },
        )
        .command(
          "server",
          "Add server package",
          (subCmd) => subCmd.version(false).hide("help"),
          async () => {
            const { runAddServer } = await import("./commands/add-server.js");
            await runAddServer({});
          },
        )
        .demandCommand(1, "Please specify package type. (client, server)"),
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
            describe: "Packages to publish (e.g., solid, core-common)",
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
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
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
              description: "Options to pass to sd.config.ts (e.g., -o key=value)",
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
    .strict();
}

// Parse only when executed directly as CLI
// Determine main module in ESM: normalize import.meta.url and process.argv[1] and compare
const cliEntryPath = process.argv.at(1);
if (
  cliEntryPath != null &&
  fileURLToPath(import.meta.url) === fs.realpathSync(path.resolve(cliEntryPath))
) {
  await createCliParser(hideBin(process.argv)).parse();
}
