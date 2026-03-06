import path from "path";
import fs from "fs";
import os from "os";
import { glob as globRaw, type GlobOptions, globSync as globRawSync } from "glob";
import { json, SdError } from "@simplysm/core-common";
import "@simplysm/core-common";

//#region Existence Check

/**
 * Checks if a file or directory exists (synchronous).
 * @param targetPath - Path to check
 */
export function existsSync(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

/**
 * Checks if a file or directory exists (asynchronous).
 * @param targetPath - Path to check
 */
export async function exists(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

//#endregion

//#region Create Directory

/**
 * Creates a directory (recursive).
 * @param targetPath - Directory path to create
 */
export function mkdirSync(targetPath: string): void {
  try {
    fs.mkdirSync(targetPath, { recursive: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Creates a directory (recursive, asynchronous).
 * @param targetPath - Directory path to create
 */
export async function mkdir(targetPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region Delete

/**
 * Deletes a file or directory.
 * @param targetPath - Path to delete
 * @remarks The synchronous version fails immediately without retries. Use rm for cases with potential transient errors like file locks.
 */
export function rmSync(targetPath: string): void {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Deletes a file or directory (asynchronous).
 * @param targetPath - Path to delete
 * @remarks The asynchronous version retries up to 6 times (500ms interval) for transient errors like file locks.
 */
export async function rm(targetPath: string): Promise<void> {
  try {
    await fs.promises.rm(targetPath, {
      recursive: true,
      force: true,
      retryDelay: 500,
      maxRetries: 6,
    });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region Copy

/**
 * Copies a file or directory.
 *
 * If sourcePath does not exist, no action is performed and the function returns.
 *
 * @param sourcePath Path of the source to copy
 * @param targetPath Destination path for the copy
 * @param filter A filter function that determines whether to copy.
 *               The **absolute path** of each file/directory is passed.
 *               Returns true to copy, false to exclude.
 *               **Note**: The top-level sourcePath is not subject to filtering;
 *               the filter function is applied recursively to all children (direct and indirect).
 *               Returning false for a directory skips that directory and all its contents.
 */
export function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void {
  if (!existsSync(sourcePath)) {
    return;
  }

  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(sourcePath);
  } catch (err) {
    throw new SdError(err, sourcePath);
  }

  if (stats.isDirectory()) {
    mkdirSync(targetPath);

    const children = globSync(path.resolve(sourcePath, "*"), { dot: true });

    for (const childPath of children) {
      if (filter !== undefined && !filter(childPath)) {
        continue;
      }

      const relativeChildPath = path.relative(sourcePath, childPath);
      const childTargetPath = path.resolve(targetPath, relativeChildPath);
      copySync(childPath, childTargetPath, filter);
    }
  } else {
    mkdirSync(path.dirname(targetPath));

    try {
      fs.copyFileSync(sourcePath, targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }
}

/**
 * Copies a file or directory (asynchronous).
 *
 * If sourcePath does not exist, no action is performed and the function returns.
 *
 * @param sourcePath Path of the source to copy
 * @param targetPath Destination path for the copy
 * @param filter A filter function that determines whether to copy.
 *               The **absolute path** of each file/directory is passed.
 *               Returns true to copy, false to exclude.
 *               **Note**: The top-level sourcePath is not subject to filtering;
 *               the filter function is applied recursively to all children (direct and indirect).
 *               Returning false for a directory skips that directory and all its contents.
 */
export async function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void> {
  if (!(await exists(sourcePath))) {
    return;
  }

  let stats: fs.Stats;
  try {
    stats = await fs.promises.lstat(sourcePath);
  } catch (err) {
    throw new SdError(err, sourcePath);
  }

  if (stats.isDirectory()) {
    await mkdir(targetPath);

    const children = await glob(path.resolve(sourcePath, "*"), { dot: true });

    await children.parallelAsync(async (childPath) => {
      if (filter !== undefined && !filter(childPath)) {
        return;
      }

      const relativeChildPath = path.relative(sourcePath, childPath);
      const childTargetPath = path.resolve(targetPath, relativeChildPath);
      await copy(childPath, childTargetPath, filter);
    });
  } else {
    await mkdir(path.dirname(targetPath));

    try {
      await fs.promises.copyFile(sourcePath, targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }
}

//#endregion

//#region Read File

/**
 * Reads a file as a UTF-8 string.
 * @param targetPath - Path of the file to read
 */
export function readSync(targetPath: string): string {
  try {
    return fs.readFileSync(targetPath, "utf-8");
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Reads a file as a UTF-8 string (asynchronous).
 * @param targetPath - Path of the file to read
 */
export async function read(targetPath: string): Promise<string> {
  try {
    return await fs.promises.readFile(targetPath, "utf-8");
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Reads a file as a Buffer.
 * @param targetPath - Path of the file to read
 */
export function readBufferSync(targetPath: string): Buffer {
  try {
    return fs.readFileSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Reads a file as a Buffer (asynchronous).
 * @param targetPath - Path of the file to read
 */
export async function readBuffer(targetPath: string): Promise<Buffer> {
  try {
    return await fs.promises.readFile(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Reads a JSON file (using JsonConvert).
 * @param targetPath - Path of the JSON file to read
 */
export function readJsonSync<TData = unknown>(targetPath: string): TData {
  const contents = readSync(targetPath);
  try {
    return json.parse(contents);
  } catch (err) {
    const preview = contents.length > 500 ? contents.slice(0, 500) + "...(truncated)" : contents;
    throw new SdError(err, targetPath + os.EOL + preview);
  }
}

/**
 * Reads a JSON file (using JsonConvert, asynchronous).
 * @param targetPath - Path of the JSON file to read
 */
export async function readJson<TData = unknown>(targetPath: string): Promise<TData> {
  const contents = await read(targetPath);
  try {
    return json.parse<TData>(contents);
  } catch (err) {
    const preview = contents.length > 500 ? contents.slice(0, 500) + "...(truncated)" : contents;
    throw new SdError(err, targetPath + os.EOL + preview);
  }
}

//#endregion

//#region Write File

/**
 * Writes data to a file (auto-creates parent directories).
 * @param targetPath - Path of the file to write
 * @param data - Data to write (string or binary)
 */
export function writeSync(targetPath: string, data: string | Uint8Array): void {
  mkdirSync(path.dirname(targetPath));

  try {
    fs.writeFileSync(targetPath, data, { flush: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Writes data to a file (auto-creates parent directories, asynchronous).
 * @param targetPath - Path of the file to write
 * @param data - Data to write (string or binary)
 */
export async function write(targetPath: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(targetPath));

  try {
    await fs.promises.writeFile(targetPath, data, { flush: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Writes data to a JSON file (using JsonConvert).
 * @param targetPath - Path of the JSON file to write
 * @param data - Data to write
 * @param options - JSON serialization options
 */
export function writeJsonSync(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): void {
  const jsonStr = json.stringify(data, options);
  writeSync(targetPath, jsonStr);
}

/**
 * Writes data to a JSON file (using JsonConvert, asynchronous).
 * @param targetPath - Path of the JSON file to write
 * @param data - Data to write
 * @param options - JSON serialization options
 */
export async function writeJson(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): Promise<void> {
  const jsonStr = json.stringify(data, options);
  await write(targetPath, jsonStr);
}

//#endregion

//#region Read Directory

/**
 * Reads the contents of a directory.
 * @param targetPath - Path of the directory to read
 */
export function readdirSync(targetPath: string): string[] {
  try {
    return fs.readdirSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Reads the contents of a directory (asynchronous).
 * @param targetPath - Path of the directory to read
 */
export async function readdir(targetPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region File Information

/**
 * Gets file/directory information (follows symbolic links).
 * @param targetPath - Path to query information for
 */
export function statSync(targetPath: string): fs.Stats {
  try {
    return fs.statSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Gets file/directory information (follows symbolic links, asynchronous).
 * @param targetPath - Path to query information for
 */
export async function stat(targetPath: string): Promise<fs.Stats> {
  try {
    return await fs.promises.stat(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Gets file/directory information (does not follow symbolic links).
 * @param targetPath - Path to query information for
 */
export function lstatSync(targetPath: string): fs.Stats {
  try {
    return fs.lstatSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * Gets file/directory information (does not follow symbolic links, asynchronous).
 * @param targetPath - Path to query information for
 */
export async function lstat(targetPath: string): Promise<fs.Stats> {
  try {
    return await fs.promises.lstat(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region Glob

/**
 * Searches for files using a glob pattern.
 * @param pattern - Glob pattern (e.g., "**\/*.ts")
 * @param options - glob options
 * @returns Array of absolute paths for matched files
 */
export function globSync(pattern: string, options?: GlobOptions): string[] {
  return globRawSync(pattern.replace(/\\/g, "/"), options ?? {}).map((item) =>
    path.resolve(item.toString()),
  );
}

/**
 * Searches for files using a glob pattern (asynchronous).
 * @param pattern - Glob pattern (e.g., "**\/*.ts")
 * @param options - glob options
 * @returns Array of absolute paths for matched files
 */
export async function glob(pattern: string, options?: GlobOptions): Promise<string[]> {
  return (await globRaw(pattern.replace(/\\/g, "/"), options ?? {})).map((item) =>
    path.resolve(item.toString()),
  );
}

//#endregion

//#region Utilities

/**
 * Recursively searches and deletes empty directories under a specified directory.
 * If all child directories are deleted and a parent becomes empty, it will also be deleted.
 */
export async function clearEmptyDirectory(dirPath: string): Promise<void> {
  if (!(await exists(dirPath))) return;

  const childNames = await readdir(dirPath);
  let hasFiles = false;

  for (const childName of childNames) {
    const childPath = path.resolve(dirPath, childName);
    if ((await lstat(childPath)).isDirectory()) {
      await clearEmptyDirectory(childPath);
    } else {
      hasFiles = true;
    }
  }

  // If there are files, cannot delete
  if (hasFiles) return;

  // Only re-check if there were no files (child directories may have been deleted)
  if ((await readdir(dirPath)).length === 0) {
    await rm(dirPath);
  }
}

/**
 * Searches for files matching a glob pattern by traversing parent directories from a start path towards the root.
 * Collects all file paths matching the childGlob pattern in each directory.
 * @param childGlob - Glob pattern to search for in each directory
 * @param fromPath - Path to start searching from
 * @param rootPath - Path to stop searching at (if not specified, searches to filesystem root).
 *                   **Note**: fromPath must be a child path of rootPath.
 *                   Otherwise, searches to the filesystem root.
 */
export function findAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[] {
  const resultPaths: string[] = [];

  let current = fromPath;
  while (current) {
    const potential = path.resolve(current, childGlob);
    const globResults = globSync(potential);
    resultPaths.push(...globResults);

    if (current === rootPath) break;

    const next = path.dirname(current);
    if (next === current) break;
    current = next;
  }

  return resultPaths;
}

/**
 * Searches for files matching a glob pattern by traversing parent directories from a start path towards the root (asynchronous).
 * Collects all file paths matching the childGlob pattern in each directory.
 * @param childGlob - Glob pattern to search for in each directory
 * @param fromPath - Path to start searching from
 * @param rootPath - Path to stop searching at (if not specified, searches to filesystem root).
 *                   **Note**: fromPath must be a child path of rootPath.
 *                   Otherwise, searches to the filesystem root.
 */
export async function findAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]> {
  const resultPaths: string[] = [];

  let current = fromPath;
  while (current) {
    const potential = path.resolve(current, childGlob);
    const globResults = await glob(potential);
    resultPaths.push(...globResults);

    if (current === rootPath) break;

    const next = path.dirname(current);
    if (next === current) break;
    current = next;
  }

  return resultPaths;
}

//#endregion
