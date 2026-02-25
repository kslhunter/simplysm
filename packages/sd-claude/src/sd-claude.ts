#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install.js";
import { runAuthAdd } from "./commands/auth-add.js";
import { runAuthUse } from "./commands/auth-use.js";
import { runAuthList } from "./commands/auth-list.js";
import { runAuthRemove } from "./commands/auth-remove.js";

await yargs(hideBin(process.argv))
  .help("help", "Help")
  .alias("help", "h")
  .command(
    "install",
    "Installs Claude Code assets to the project.",
    (cmd) => cmd.version(false).hide("help"),
    () => {
      runInstall();
    },
  )
  .command("auth", "Manages Claude account profiles.", (cmd) =>
    cmd
      .version(false)
      .hide("help")
      .command(
        "add <name>",
        "Saves the currently logged-in account",
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
        "Switches to a saved account",
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
        "Displays the list of saved accounts",
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
        "Removes a saved account",
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
      .demandCommand(1, "Please specify an auth subcommand."),
  )
  .demandCommand(1, "Please specify a command.")
  .strict()
  .parse();
