import path from "path";
import fs from "fs";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { execa } from "execa";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

/**
 * Init command options
 */
export interface InitOptions {}

//#endregion

//#region Utilities

/**
 * Validates npm scope name validity
 */
function isValidScopeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

//#endregion

//#region Main

/**
 * Initializes a new Simplysm project in the current directory.
 *
 * 1. Check if directory is empty
 * 2. Validate project name (folder name)
 * 3. Render Handlebars template
 * 4. Run pnpm install
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

  // 3. Render template
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "init");

  const context = { projectName };

  logger.info("Creating project files...");
  await renderTemplateDir(templateDir, cwd, context);
  logger.success("Project files created successfully");

  // 4. Run pnpm install
  logger.info("Running pnpm install...");
  await execa("pnpm", ["install"], { cwd });
  logger.success("pnpm install completed");

  // 5. Initialize git repository
  logger.info("Initializing git repository...");
  await execa("git", ["init"], { cwd });
  await execa("git", ["add", "."], { cwd });
  await execa("git", ["commit", "-m", "init"], { cwd });
  logger.success("git repository initialized");

  // 6. Completion message
  consola.box(
    [
      "Project created!",
      "",
      "Next steps:",
      "  sd-cli add client    Add a client package",
      "  sd-cli add server    Add a server package",
    ].join("\n"),
  );
}

//#endregion
