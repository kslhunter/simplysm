import fs from "fs";
import path from "path";

/**
 * Iterates over sd-* entries in a directory (root level + one level of subdirectories).
 * @param {string} dir - Base directory to scan
 * @param {(relativePath: string) => void} callback - Called with each sd-* entry's relative path
 */
export function forEachSdEntry(dir, callback) {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith("sd-")) {
      callback(dirent.name);
    } else if (dirent.isDirectory()) {
      const subPath = path.join(dir, dirent.name);
      for (const name of fs.readdirSync(subPath)) {
        if (name.startsWith("sd-")) {
          callback(path.join(dirent.name, name));
        }
      }
    }
  }
}

/**
 * Collects all sd-* entry relative paths from a directory.
 * @param {string} dir - Base directory to scan
 * @returns {string[]} Array of relative paths
 */
export function collectSdEntries(dir) {
  const entries = [];
  forEachSdEntry(dir, (rel) => entries.push(rel));
  return entries;
}
