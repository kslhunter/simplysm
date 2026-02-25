/**
 * Installs Claude Code assets to the project's .claude/ directory.
 * Executed via postinstall script or `sd-claude install`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function runInstall(): void {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    // dist/commands/ → package root
    const pkgRoot = path.resolve(__dirname, "../..");
    const sourceDir = path.join(pkgRoot, "claude");

    const projectRoot = findProjectRoot(__dirname);
    if (projectRoot == null) {
      // eslint-disable-next-line no-console
      console.log("[@simplysm/sd-claude] Could not find project root, skipping installation.");
      return;
    }

    // Skip execution if this is the simplysm monorepo with the same major version
    if (isSimplysmMonorepoSameMajor(projectRoot, pkgRoot)) {
      return;
    }

    // Skip if the source directory doesn't exist (claude/ may not exist in monorepo dev environment)
    if (!fs.existsSync(sourceDir)) {
      return;
    }

    const sourceEntries = collectSdEntries(sourceDir);
    if (sourceEntries.length === 0) {
      return;
    }

    const targetDir = path.join(projectRoot, ".claude");

    cleanSdEntries(targetDir);
    copySdEntries(sourceDir, targetDir, sourceEntries);
    setupStatusLine(targetDir);

    // eslint-disable-next-line no-console
    console.log(`[@simplysm/sd-claude] Installed ${sourceEntries.length} sd-* entries.`);
  } catch (err) {
    // Ignore errors to prevent postinstall failure from blocking the entire pnpm install
    // eslint-disable-next-line no-console
    console.warn("[@simplysm/sd-claude] postinstall warning:", (err as Error).message);
  }
}

/** Finds the project root from INIT_CWD or node_modules path. */
function findProjectRoot(dirname: string): string | undefined {
  if (process.env["INIT_CWD"] != null) {
    return process.env["INIT_CWD"];
  }

  const sep = path.sep;
  const marker = sep + "node_modules" + sep;
  const idx = dirname.indexOf(marker);
  return idx !== -1 ? dirname.substring(0, idx) : undefined;
}

/** Checks if this is the simplysm monorepo with the same major version. */
function isSimplysmMonorepoSameMajor(projectRoot: string, pkgRoot: string): boolean {
  const projectPkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(projectPkgPath)) return false;

  const projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, "utf-8")) as {
    name?: string;
    version?: string;
  };
  if (projectPkg.name !== "simplysm") return false;

  const sdClaudePkgPath = path.join(pkgRoot, "package.json");
  if (!fs.existsSync(sdClaudePkgPath)) return false;

  const sdClaudePkg = JSON.parse(fs.readFileSync(sdClaudePkgPath, "utf-8")) as {
    version?: string;
  };

  const projectMajor = projectPkg.version?.split(".")[0];
  const sdClaudeMajor = sdClaudePkg.version?.split(".")[0];
  return projectMajor != null && projectMajor === sdClaudeMajor;
}

/** Recursively collects sd-* entries. */
function collectSdEntries(sourceDir: string): string[] {
  const entries: string[] = [];

  // Root level: sd-*
  for (const name of fs.readdirSync(sourceDir)) {
    if (name.startsWith("sd-")) {
      entries.push(name);
    }
  }

  // Subdirectories: */sd-*
  for (const dirent of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
    const subPath = path.join(sourceDir, dirent.name);
    for (const name of fs.readdirSync(subPath)) {
      if (name.startsWith("sd-")) {
        entries.push(path.join(dirent.name, name));
      }
    }
  }

  return entries;
}

/** Removes existing sd-* entries. */
function cleanSdEntries(targetDir: string): void {
  if (!fs.existsSync(targetDir)) return;

  // Root level sd-*
  for (const name of fs.readdirSync(targetDir)) {
    if (name.startsWith("sd-")) {
      fs.rmSync(path.join(targetDir, name), { recursive: true });
    }
  }

  // Subdirectories */sd-*
  for (const dirent of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (!dirent.isDirectory() || dirent.name.startsWith("sd-")) continue;
    const subPath = path.join(targetDir, dirent.name);
    for (const name of fs.readdirSync(subPath)) {
      if (name.startsWith("sd-")) {
        fs.rmSync(path.join(subPath, name), { recursive: true });
      }
    }
  }
}

/** Copies sd-* entries. */
function copySdEntries(sourceDir: string, targetDir: string, entries: string[]): void {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

/** Adds statusLine configuration to settings.json. */
function setupStatusLine(targetDir: string): void {
  const settingsPath = path.join(targetDir, "settings.json");
  const sdStatusLineCommand = "node .claude/sd-statusline.js";

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
  }

  if (settings["statusLine"] == null) {
    settings["statusLine"] = { type: "command", command: sdStatusLineCommand };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  }
}
