/**
 * Path utility functions
 * Replacement for Node.js path module (supports browser environments)
 *
 * @note This utility supports POSIX style paths (slash `/`) only.
 *       Windows backslash (`\`) paths are not supported.
 *       Designed for browser environments and Capacitor plugins.
 */

/**
 * Combine paths (path.join replacement)
 * @note Supports POSIX style paths only (slash `/`)
 */
export function pathJoin(...segments: string[]): string {
  return segments
    .map((s, i) => (i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, "")))
    .filter(Boolean)
    .join("/");
}

/**
 * Extract filename (path.basename replacement)
 */
export function pathBasename(filePath: string, ext?: string): string {
  const name = filePath.split("/").pop() ?? "";
  if (ext != null && ext !== "" && name.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

/**
 * Extract file extension (path.extname replacement)
 * @note Hidden files (e.g., `.gitignore`) return empty string (same as Node.js path.extname)
 */
export function pathExtname(filePath: string): string {
  const name = filePath.split("/").pop() ?? "";
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex) : "";
}
