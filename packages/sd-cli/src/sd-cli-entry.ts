#!/usr/bin/env node
/* eslint-disable no-console */

// side-effect: Map/Array prototype extensions (getOrCreate, etc.)
import "@simplysm/core-common";
import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";
import { runCheck, type CheckType } from "./commands/check";
import { runWatch } from "./commands/watch";
import { runDev } from "./commands/dev";
import { runBuild } from "./commands/build";
import { runPublish } from "./commands/publish";
import { runReplaceDeps } from "./commands/replace-deps";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { EventEmitter } from "node:events";
import { consola, LogLevels } from "consola";
import { SdCliReporter } from "./utils/SdCliReporter";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 100;

consola.options.reporters = [new SdCliReporter()];

const COMMAND_NAMES = ["check", "watch", "dev", "build", "publish", "replace-deps"];

async function collectYargsHelp(argv: string[]): Promise<string> {
  const lines: string[] = [];

  const orig = console.log;

  console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
  try {
    await createCliParser(argv).exitProcess(false).parse();
  } catch {
    // yargs may throw after help display
  } finally {
  
    console.log = orig;
  }
  return lines.join("\n");
}

/**
 * Create CLI parser
 * @internal exported for testing
 */
export function createCliParser(argv: string[]): Argv {
  // Top-level --help/-h (without a subcommand): show comprehensive help for all commands
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
        consola.level = LogLevels.debug;
        process.env["SD_DEBUG"] = "true";
      }
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
              describe: "Check types to run (comma-separated: typecheck,lint,test)",
              default: "typecheck,lint,test",
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
            const types = args.type.split(",").map((t) => t.trim());
            const invalidTypes = types.filter(
              (t) => !validTypes.includes(t as CheckType),
            );
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
            describe: "Packages to build (e.g., core-common, storage)",
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
