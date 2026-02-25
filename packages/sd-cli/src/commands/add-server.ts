import path from "path";
import fs from "fs";
import { input, checkbox } from "@inquirer/prompts";
import { consola } from "consola";
import { renderTemplateDir } from "../utils/template";
import { addPackageToSdConfig, setClientServerInSdConfig } from "../utils/config-editor";
import { execa } from "execa";
import { findPackageRoot } from "../utils/package-utils";

//#region Types

/**
 * Add-server command options
 */
export interface AddServerOptions {}

//#endregion

//#region Utilities

/**
 * Reads sd.config.ts and returns a list of package names with target "client".
 */
function findClientPackages(sdConfigPath: string): string[] {
  const content = fs.readFileSync(sdConfigPath, "utf-8");
  const clients: string[] = [];

  // Find client packages using simple pattern matching
  const regex = /"([^"]+)":\s*\{[^}]*target:\s*"client"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) != null) {
    clients.push(match[1]);
  }
  return clients;
}

//#endregion

//#region Main

/**
 * Adds a server package to the project.
 *
 * 1. Verify project root
 * 2. Interactive prompts (name suffix, client selection)
 * 3. Check for duplicate package directory
 * 4. Render Handlebars template
 * 5. Add server package entry to sd.config.ts
 * 6. Update server field in selected clients
 * 7. Run pnpm install
 */
export async function runAddServer(_options: AddServerOptions): Promise<void> {
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:add-server");

  // 1. Verify project root
  const sdConfigPath = path.join(cwd, "sd.config.ts");
  if (!fs.existsSync(sdConfigPath)) {
    consola.error("Cannot find sd.config.ts. Please run this from the project root.");
    process.exitCode = 1;
    return;
  }

  const projectName = path.basename(cwd);

  // 2. Interactive prompts
  const serverSuffix = await input({
    message: 'Server name suffix (leave empty for "server"):',
    validate: (value) => {
      if (value.trim() === "") return true; // Allow empty value
      if (!/^[a-z][a-z0-9-]*$/.test(value)) return "Only lowercase letters, numbers, and hyphens are allowed.";
      return true;
    },
  });

  const serverName = serverSuffix.trim() === "" ? "server" : `server-${serverSuffix}`;

  // Client selection (if existing clients are present)
  const clientPackages = findClientPackages(sdConfigPath);
  let selectedClients: string[] = [];

  if (clientPackages.length > 0) {
    selectedClients = await checkbox({
      message: "Select the clients this server will serve:",
      choices: clientPackages.map((name) => ({ name, value: name })),
    });
  }

  // 3. Check for duplicate package directory
  const packageDir = path.join(cwd, "packages", serverName);
  if (fs.existsSync(packageDir)) {
    consola.error(`packages/${serverName} directory already exists.`);
    process.exitCode = 1;
    return;
  }

  // 4. Render template
  const pkgRoot = findPackageRoot(import.meta.dirname);
  const templateDir = path.join(pkgRoot, "templates", "add-server");

  const context = {
    projectName,
    serverName,
    port: 3000,
  };

  const dirReplacements = {
    __SERVER__: serverName,
  };

  logger.info(`Creating ${serverName} package...`);
  await renderTemplateDir(templateDir, path.join(cwd, "packages"), context, dirReplacements);
  logger.success(`packages/${serverName} created successfully`);

  // 5. Add server package to sd.config.ts
  const added = addPackageToSdConfig(sdConfigPath, serverName, { target: "server" });
  if (added) {
    logger.success("Server package added to sd.config.ts");
  } else {
    consola.warn(`"${serverName}" already exists in sd.config.ts.`);
  }

  // 6. Update server field in selected clients
  for (const clientName of selectedClients) {
    setClientServerInSdConfig(sdConfigPath, clientName, serverName);
    logger.info(`Set ${clientName} server to "${serverName}"`);
  }

  // 7. Run pnpm install
  logger.info("Running pnpm install...");
  await execa("pnpm", ["install"], { cwd });
  logger.success("pnpm install completed");

  // Done
  consola.box(`Server "${serverName}" has been added!`);
}

//#endregion
