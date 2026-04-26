/* eslint-disable no-restricted-properties -- 독립 스크립트 */
/**
 * Installs Codex assets to the project's .codex/ directory.
 * postinstall hook — 실패해도 pnpm install을 차단하지 않는다.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectCodexEntries, forEachCodexEntry } from "./sd-entries.mjs";

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkgRoot = path.resolve(__dirname, "..");
  const sourceDir = path.join(pkgRoot, "codex");

  const projectRoot = findProjectRoot(__dirname);
  if (projectRoot == null) {
    console.log("[@simplysm/sd-codex] Could not find project root, skipping installation.");
    process.exit(0);
  }

  if (isSimplysmMonorepoSameMajor(projectRoot, pkgRoot)) {
    process.exit(0);
  }

  if (!fs.existsSync(sourceDir)) {
    process.exit(0);
  }

  const sourceEntries = collectCodexEntries(sourceDir);
  if (sourceEntries.length === 0) {
    process.exit(0);
  }

  const targetDir = path.join(projectRoot, ".codex");

  cleanCodexEntries(targetDir);
  copyCodexEntries(sourceDir, targetDir, sourceEntries);

  console.log(`[@simplysm/sd-codex] Installed ${sourceEntries.length} entries.`);
} catch (err) {
  console.warn("[@simplysm/sd-codex] postinstall warning:", err.message);
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

  return process.cwd();
}

/** Checks if this is the simplysm monorepo with the same major version. */
function isSimplysmMonorepoSameMajor(projectRoot, pkgRoot) {
  const projectPkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(projectPkgPath)) return false;

  const projectPkg = JSON.parse(fs.readFileSync(projectPkgPath, "utf-8"));
  if (projectPkg.name !== "simplysm") return false;

  const sdCodexPkgPath = path.join(pkgRoot, "package.json");
  if (!fs.existsSync(sdCodexPkgPath)) return false;

  const sdCodexPkg = JSON.parse(fs.readFileSync(sdCodexPkgPath, "utf-8"));

  const projectMajor = projectPkg.version?.split(".")[0];
  const sdCodexMajor = sdCodexPkg.version?.split(".")[0];
  return projectMajor != null && projectMajor === sdCodexMajor;
}

/** Removes existing managed Codex sd-* entries. */
function cleanCodexEntries(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  forEachCodexEntry(targetDir, (rel) => {
    fs.rmSync(path.join(targetDir, rel), { recursive: true });
  });
}

/** Copies Codex sd-* entries. */
function copyCodexEntries(sourceDir, targetDir, entries) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of entries) {
    const src = path.join(sourceDir, entry);
    const dest = path.join(targetDir, entry);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}
