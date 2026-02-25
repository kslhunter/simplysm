import path from "path";
import fs from "fs";
import { input, confirm } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { addPackageToSdConfig, addTailwindToEslintConfig } from "../utils/config-editor";
import { execa } from "execa";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

/**
 * Add-client command options
 */
export interface AddClientOptions {}

//#endregion

//#region Utilities
//#endregion

//#region Main

/**
 * Add client package to the project.
 *
 * 1. Verify project root (sd.config.ts exists)
 * 2. Interactive prompt (name suffix, router usage)
 * 3. Check for duplicate package directory
 * 4. Render Handlebars template
 * 5. Add package entry to sd.config.ts (ts-morph)
 * 6. Add tailwind configuration to eslint.config.ts (if first client)
 * 7. pnpm install
 */
export async function runAddClient(_options: AddClientOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:add-client");

  // 1. Verify project root
  if (!fs.existsSync(path.join(cwd, "sd.config.ts"))) {
    consola.error("Cannot find sd.config.ts. Please run from the project root.");
    process.exitCode = 1;
    return;
  }

  // Project name
  const projectName = path.basename(cwd);

  // 2. Interactive prompt
  const clientSuffix = await input({
    message: "Enter client name suffix (client-___):",
    validate: (value) => {
      if (!value.trim()) return "Please enter a name.";
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Only lowercase letters, numbers, and hyphens are allowed.";
      return true;
    },
  });

  const useRouter = await confirm({
    message: "Do you want to use router?",
    default: true,
  });

  const clientName = `client-${clientSuffix}`;

  // 3. Check for duplicate package directory
  const packageDir = path.join(cwd, "packages", clientName);
  if (fs.existsSync(packageDir)) {
    consola.error(`packages/${clientName} directory already exists.`);
    process.exitCode = 1;
    return;
  }

  // 4. Render template
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "add-client");

  const context = {
    projectName,
    clientSuffix,
    clientName,
    router: useRouter,
  };

  const dirReplacements = {
    __CLIENT__: clientName,
  };

  logger.info(`Creating ${clientName} package...`);
  await renderTemplateDir(templateDir, path.join(cwd, "packages"), context, dirReplacements);
  logger.success(`packages/${clientName} created successfully`);

  // 5. Update sd.config.ts
  const sdConfigPath = path.join(cwd, "sd.config.ts");
  const added = addPackageToSdConfig(sdConfigPath, clientName, { target: "client" });
  if (added) {
    logger.success("sd.config.ts updated successfully");
  } else {
    consola.warn(`"${clientName}" already exists in sd.config.ts.`);
  }

  // 6. Add tailwind configuration to eslint.config.ts (if first client)
  const eslintConfigPath = path.join(cwd, "eslint.config.ts");
  if (fs.existsSync(eslintConfigPath)) {
    const tailwindAdded = addTailwindToEslintConfig(eslintConfigPath, clientName);
    if (tailwindAdded) {
      logger.success("Added tailwind configuration to eslint.config.ts");
    }
  }

  // 7. pnpm install
  logger.info("Running pnpm install...");
  await execa("pnpm", ["install"], { cwd });
  logger.success("pnpm install completed");

  // Done
  consola.box(
    [
      `Client "${clientName}" has been added!`,
      "",
      `  pnpm dev ${clientName}    Run development server`,
    ].join("\n"),
  );
}

//#endregion
