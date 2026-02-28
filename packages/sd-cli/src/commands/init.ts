import path from "path";
import fs from "fs";
import crypto from "crypto";
import readline from "readline";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { execa } from "execa";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

export interface InitOptions {}

//#endregion

//#region Utilities

function isValidScopeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

//#endregion

//#region Main

/**
 * Initializes a new Simplysm project in the current directory.
 *
 * 1. Check if directory is empty
 * 2. Validate project name (folder name)
 * 3. Prompt for description, port
 * 4. Generate jwtSecret
 * 5. Render Handlebars template
 * 6. Run pnpm install
 */
export async function runInit(_options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:init");

  // 1. Check if directory is empty (exclude dotfiles/dotfolders)
  const entries = fs.readdirSync(cwd).filter((e) => !e.startsWith("."));
  if (entries.length > 0) {
    consola.error("Directory is not empty. Please run this from an empty directory.");
    process.exitCode = 1;
    return;
  }

  // 2. Validate project name
  const projectName = path.basename(cwd);
  if (!isValidScopeName(projectName)) {
    consola.error(
      `Project name "${projectName}" is not valid. Only lowercase letters, numbers, and hyphens are allowed.`,
    );
    process.exitCode = 1;
    return;
  }

  // 3. Prompt for description
  const description = await prompt("Project description: ");

  // 4. Prompt for port
  const portInput = await prompt("Server port (default: 40080): ");
  const port = portInput !== "" ? Number(portInput) : 40080;
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    consola.error("Invalid port number.");
    process.exitCode = 1;
    return;
  }

  // 5. Generate jwtSecret
  const jwtSecret = `${projectName}-${crypto.randomUUID().slice(0, 8)}`;

  // 6. Render template
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "init");

  const context = { projectName, description, port, jwtSecret };

  logger.info("Creating project files...");
  await renderTemplateDir(templateDir, cwd, context);
  logger.success("Project files created successfully");

  // 7. Run pnpm install
  logger.info("Running pnpm install...");
  await execa("pnpm", ["install"], { cwd });
  logger.success("pnpm install completed");

  // 8. Completion message
  consola.box(
    [
      "Project created!",
      "",
      "Next steps:",
      "  pnpm dev              Start dev server",
      "  pnpm build            Production build",
    ].join("\n"),
  );
}

//#endregion
