/**
 * Installs Claude Code assets to the project's .claude/ directory.
 * postinstall hook — 실패해도 pnpm install을 차단하지 않는다.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectSdEntries, forEachSdEntry } from "./sd-entries.mjs";

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // scripts/ → package root
  const pkgRoot = path.resolve(__dirname, "..");
  const sourceDir = path.join(pkgRoot, "claude");

  const projectRoot = findProjectRoot(__dirname);
  if (projectRoot == null) {
    console.log("[@simplysm/sd-claude] Could not find project root, skipping installation.");
    process.exit(0);
  }

  // Skip execution if this is the simplysm monorepo with the same major version
  if (isSimplysmMonorepoSameMajor(projectRoot, pkgRoot)) {
    process.exit(0);
  }

  // Skip if the source directory doesn't exist (claude/ may not exist in monorepo dev environment)
  if (!fs.existsSync(sourceDir)) {
    process.exit(0);
  }

  const sourceEntries = collectSdEntries(sourceDir);
  if (sourceEntries.length === 0) {
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".claude");

  cleanSdEntries(targetDir);
  copySdEntries(sourceDir, targetDir, sourceEntries);
  setupSettings(targetDir);

  console.log(`[@simplysm/sd-claude] Installed ${sourceEntries.length} sd-* entries.`);
} catch (err) {
  // Ignore errors to prevent postinstall failure from blocking the entire pnpm install
  console.warn("[@simplysm/sd-claude] postinstall warning:", err.message);
}

/** Finds the project root from INIT_CWD, node_modules path, or cwd. */
function findProjectRoot(dirname) {
  if (process.env["INIT_CWD"] != null) {
    return process.env["INIT_CWD"];
  }

  const sep = path.sep;
  const marker = sep + "node_modules" + sep;
  const idx = dirname.indexOf(marker);
  if (idx !== -1) {
    return dirname.substring(0, idx);
  }

  // Fallback to cwd for manual CLI invocation (e.g., npx sd-claude postinstall)
  return process.cwd();
}

/** Checks if this is the simplysm monorepo with the same major version. */
function isSimplysmMonorepoSameMajor(projectRoot, pkgRoot) {
  const projectPkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(projectPkgPath)) return false;

  const projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, "utf-8"));
  if (projectPkg.name !== "simplysm") return false;

  const sdClaudePkgPath = path.join(pkgRoot, "package.json");
  if (!fs.existsSync(sdClaudePkgPath)) return false;

  const sdClaudePkg = JSON.parse(fs.readFileSync(sdClaudePkgPath, "utf-8"));

  const projectMajor = projectPkg.version?.split(".")[0];
  const sdClaudeMajor = sdClaudePkg.version?.split(".")[0];
  return projectMajor != null && projectMajor === sdClaudeMajor;
}

/** Removes existing sd-* entries. */
function cleanSdEntries(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  forEachSdEntry(targetDir, (rel) => {
    fs.rmSync(path.join(targetDir, rel), { recursive: true });
  });
}

/** Copies sd-* entries. */
function copySdEntries(sourceDir, targetDir, entries) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

/** Ensures statusLine and SessionStart hooks are configured in settings.json. */
function setupSettings(targetDir) {
  const settingsPath = path.join(targetDir, "settings.json");

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  }

  // statusLine: always overwrite
  settings["statusLine"] = { type: "command", command: "python .claude/sd-statusline.py" };

  // Migrate: move root-level SessionStart to hooks.SessionStart
  if (settings["SessionStart"] != null) {
    settings["hooks"] = settings["hooks"] ?? {};
    settings["hooks"]["SessionStart"] = [
      ...(settings["hooks"]["SessionStart"] ?? []),
      ...settings["SessionStart"],
    ];
    delete settings["SessionStart"];
  }

  // SessionStart: ensure sd-session-start hook exists with correct config
  settings["hooks"] = settings["hooks"] ?? {};
  const sdSessionEntry = {
    matcher: "startup|resume|clear|compact",
    hooks: [{ type: "command", command: "bash .claude/sd-session-start.sh" }],
  };

  const sessionStart = settings["hooks"]["SessionStart"];

  if (sessionStart == null) {
    settings["hooks"]["SessionStart"] = [sdSessionEntry];
  } else {
    const idx = sessionStart.findIndex((entry) =>
      entry.hooks?.some((hook) => hook.command.includes("sd-session-start")),
    );
    if (idx >= 0) {
      sessionStart[idx] = sdSessionEntry;
    } else {
      sessionStart.push(sdSessionEntry);
    }
  }

  // SubagentStart: ensure sd-session-start hook exists
  const sdSubagentEntry = {
    hooks: [{ type: "command", command: "bash .claude/sd-session-start.sh" }],
  };

  const subagentStart = settings["hooks"]["SubagentStart"];

  if (subagentStart == null) {
    settings["hooks"]["SubagentStart"] = [sdSubagentEntry];
  } else {
    const idx = subagentStart.findIndex((entry) =>
      entry.hooks?.some((hook) => hook.command.includes("sd-session-start")),
    );
    if (idx >= 0) {
      subagentStart[idx] = sdSubagentEntry;
    } else {
      subagentStart.push(sdSubagentEntry);
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
