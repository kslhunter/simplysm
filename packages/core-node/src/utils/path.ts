import path from "path";
import { ArgumentError } from "@simplysm/core-common";

//#region Types

const NORM = Symbol("NormPath");

/**
 * Brand type representing a normalized path.
 * Can only be created through norm().
 */
export type NormPath = string & {
  [NORM]: never;
};

//#endregion

//#region Functions

/**
 * Converts to POSIX-style path (backslash → forward slash).
 *
 * @example
 * posix("C:\\Users\\test"); // "C:/Users/test"
 * posix("src", "index.ts"); // "src/index.ts"
 */
export function posix(...args: string[]): string {
  const resolvedPath = path.join(...args);
  return resolvedPath.replace(/\\/g, "/");
}

/**
 * Changes the directory of a file path.
 *
 * @example
 * changeFileDirectory("/a/b/c.txt", "/a", "/x");
 * // → "/x/b/c.txt"
 *
 * @throws Error if the file is not inside fromDirectory
 */
export function changeFileDirectory(
  filePath: string,
  fromDirectory: string,
  toDirectory: string,
): string {
  if (filePath === fromDirectory) {
    return toDirectory;
  }

  if (!isChildPath(filePath, fromDirectory)) {
    throw new ArgumentError(`'${filePath}' is not inside ${fromDirectory}.`, {
      filePath,
      fromDirectory,
    });
  }

  return path.resolve(toDirectory, path.relative(fromDirectory, filePath));
}

/**
 * Returns the filename (basename) without extension.
 *
 * @example
 * basenameWithoutExt("file.txt"); // "file"
 * basenameWithoutExt("/path/to/file.spec.ts"); // "file.spec"
 */
export function basenameWithoutExt(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Checks if childPath is a child path of parentPath.
 * Returns false if the paths are the same.
 *
 * Paths are internally normalized using `norm()` and compared using
 * platform-specific path separators (Windows: `\`, Unix: `/`).
 *
 * @example
 * isChildPath("/a/b/c", "/a/b"); // true
 * isChildPath("/a/b", "/a/b/c"); // false
 * isChildPath("/a/b", "/a/b"); // false (same path)
 */
export function isChildPath(childPath: string, parentPath: string): boolean {
  const normalizedChild = norm(childPath);
  const normalizedParent = norm(parentPath);

  // Same path returns false
  if (normalizedChild === normalizedParent) {
    return false;
  }

  // Check if it starts with parent path + separator
  const parentWithSep = normalizedParent.endsWith(path.sep)
    ? normalizedParent
    : normalizedParent + path.sep;

  return normalizedChild.startsWith(parentWithSep);
}

/**
 * Normalizes the path and returns it as NormPath.
 * Converts to absolute path and normalizes using platform-specific separators.
 *
 * @example
 * norm("/some/path"); // NormPath
 * norm("relative", "path"); // NormPath (converted to absolute path)
 */
export function norm(...paths: string[]): NormPath {
  return path.resolve(...paths) as NormPath;
}

/**
 * Filters files based on a list of target paths.
 * Includes files that match or are children of a target path.
 *
 * @param files - File paths to filter.
 *                **Note**: Must be absolute paths under cwd.
 *                Paths outside cwd are converted to relative paths (../) for processing.
 * @param targets - Target paths (relative to cwd, POSIX style recommended)
 * @param cwd - Current working directory (absolute path)
 * @returns If targets is empty, returns files as-is; otherwise returns only files under target paths
 *
 * @example
 * const files = ["/proj/src/a.ts", "/proj/src/b.ts", "/proj/tests/c.ts"];
 * filterByTargets(files, ["src"], "/proj");
 * // → ["/proj/src/a.ts", "/proj/src/b.ts"]
 */
export function filterByTargets(files: string[], targets: string[], cwd: string): string[] {
  if (targets.length === 0) return files;
  const normalizedTargets = targets.map((t) => posix(t));
  return files.filter((file) => {
    const relativePath = posix(path.relative(cwd, file));
    return normalizedTargets.some(
      (target) => relativePath === target || relativePath.startsWith(target + "/"),
    );
  });
}

//#endregion
