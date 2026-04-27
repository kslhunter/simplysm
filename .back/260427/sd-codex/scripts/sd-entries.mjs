import fs from "fs";
import path from "path";

/**
 * Iterates over sd-* entries in a directory (root level + one level of subdirectories).
 * @param {string} dir - Base directory to scan
 * @param {(relativePath: string) => void} callback - Called with each sd-* entry's relative path
 */
export function forEachCodexEntry(dir, callback) {
  if (!fs.existsSync(dir)) return;

  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith("sd-")) {
      callback(dirent.name);
    } else if (dirent.isDirectory()) {
      const subPath = path.join(dir, dirent.name);
      for (const name of fs.readdirSync(subPath)) {
        if (name.startsWith("sd-")) {
          callback(`${dirent.name}/${name}`);
        }
      }
    }
  }
}

/**
 * Collects all Codex sd-* entry relative paths from a directory.
 * @param {string} dir - Base directory to scan
 * @returns {string[]} Array of relative paths
 */
export function collectCodexEntries(dir) {
  const entries = [];
  forEachCodexEntry(dir, (rel) => entries.push(rel));
  return entries;
}

/**
 * Returns whether a file should be copied into the package snapshot.
 * @param {string} source - Source path or basename
 * @returns {boolean}
 */
export function shouldCopyCodexAsset(source) {
  const name = path.basename(source);
  return name !== "SKILL.eval.md" && !name.startsWith("eval_") && !name.includes(".eval.");
}
