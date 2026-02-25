import path from "path";
import fs from "fs";
import os from "os";
import { glob as globRaw, type GlobOptions, globSync as globRawSync } from "glob";
import { jsonParse, jsonStringify, SdError } from "@simplysm/core-common";
import "@simplysm/core-common";

//#region Existence Check

/**
 * Checks if a file or directory exists (synchronous).
 * @param targetPath - Path to check
 */
export function fsExistsSync(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

/**
 * Checks if a file or directory exists (asynchronous).
 * @param targetPath - Path to check
 */
export async function fsExists(targetPath: string): Promise<boolean> {
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
export function fsMkdirSync(targetPath: string): void {
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
export async function fsMkdir(targetPath: string): Promise<void> {
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
 * @remarks The synchronous version fails immediately without retries. Use fsRm for cases with potential transient errors like file locks.
 */
export function fsRmSync(targetPath: string): void {
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
export async function fsRm(targetPath: string): Promise<void> {
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
export function fsCopySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void {
  if (!fsExistsSync(sourcePath)) {
    return;
  }

  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(sourcePath);
  } catch (err) {
    throw new SdError(err, sourcePath);
  }

  if (stats.isDirectory()) {
    fsMkdirSync(targetPath);

    const children = fsGlobSync(path.resolve(sourcePath, "*"), { dot: true });

    for (const childPath of children) {
      if (filter !== undefined && !filter(childPath)) {
        continue;
      }

      const relativeChildPath = path.relative(sourcePath, childPath);
      const childTargetPath = path.resolve(targetPath, relativeChildPath);
      fsCopySync(childPath, childTargetPath, filter);
    }
  } else {
    fsMkdirSync(path.dirname(targetPath));

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
export async function fsCopy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void> {
  if (!(await fsExists(sourcePath))) {
    return;
  }

  let stats: fs.Stats;
  try {
    stats = await fs.promises.lstat(sourcePath);
  } catch (err) {
    throw new SdError(err, sourcePath);
  }

  if (stats.isDirectory()) {
    await fsMkdir(targetPath);

    const children = await fsGlob(path.resolve(sourcePath, "*"), { dot: true });

    await children.parallelAsync(async (childPath) => {
      if (filter !== undefined && !filter(childPath)) {
        return;
      }

      const relativeChildPath = path.relative(sourcePath, childPath);
      const childTargetPath = path.resolve(targetPath, relativeChildPath);
      await fsCopy(childPath, childTargetPath, filter);
    });
  } else {
    await fsMkdir(path.dirname(targetPath));

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
export function fsReadSync(targetPath: string): string {
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
export async function fsRead(targetPath: string): Promise<string> {
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
export function fsReadBufferSync(targetPath: string): Buffer {
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
export async function fsReadBuffer(targetPath: string): Promise<Buffer> {
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
export function fsReadJsonSync<TData = unknown>(targetPath: string): TData {
  const contents = fsReadSync(targetPath);
  try {
    return jsonParse(contents);
  } catch (err) {
    const preview = contents.length > 500 ? contents.slice(0, 500) + "...(truncated)" : contents;
    throw new SdError(err, targetPath + os.EOL + preview);
  }
}

/**
 * Reads a JSON file (using JsonConvert, asynchronous).
 * @param targetPath - Path of the JSON file to read
 */
export async function fsReadJson<TData = unknown>(targetPath: string): Promise<TData> {
  const contents = await fsRead(targetPath);
  try {
    return jsonParse<TData>(contents);
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
export function fsWriteSync(targetPath: string, data: string | Uint8Array): void {
  fsMkdirSync(path.dirname(targetPath));

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
export async function fsWrite(targetPath: string, data: string | Uint8Array): Promise<void> {
  await fsMkdir(path.dirname(targetPath));

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
export function fsWriteJsonSync(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): void {
  const json = jsonStringify(data, options);
  fsWriteSync(targetPath, json);
}

/**
 * Writes data to a JSON file (using JsonConvert, asynchronous).
 * @param targetPath - Path of the JSON file to write
 * @param data - Data to write
 * @param options - JSON serialization options
 */
export async function fsWriteJson(
  targetPath: string,
  data: unknown,
  options?: {
    replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
    space?: string | number;
  },
): Promise<void> {
  const json = jsonStringify(data, options);
  await fsWrite(targetPath, json);
}

//#endregion

//#region Read Directory

/**
 * Reads the contents of a directory.
 * @param targetPath - Path of the directory to read
 */
export function fsReaddirSync(targetPath: string): string[] {
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
export async function fsReaddir(targetPath: string): Promise<string[]> {
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
export function fsStatSync(targetPath: string): fs.Stats {
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
export async function fsStat(targetPath: string): Promise<fs.Stats> {
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
export function fsLstatSync(targetPath: string): fs.Stats {
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
export async function fsLstat(targetPath: string): Promise<fs.Stats> {
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
export function fsGlobSync(pattern: string, options?: GlobOptions): string[] {
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
export async function fsGlob(pattern: string, options?: GlobOptions): Promise<string[]> {
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
export async function fsClearEmptyDirectory(dirPath: string): Promise<void> {
  if (!(await fsExists(dirPath))) return;

  const childNames = await fsReaddir(dirPath);
  let hasFiles = false;

  for (const childName of childNames) {
    const childPath = path.resolve(dirPath, childName);
    if ((await fsLstat(childPath)).isDirectory()) {
      await fsClearEmptyDirectory(childPath);
    } else {
      hasFiles = true;
    }
  }

  // If there are files, cannot delete
  if (hasFiles) return;

  // Only re-check if there were no files (child directories may have been deleted)
  if ((await fsReaddir(dirPath)).length === 0) {
    await fsRm(dirPath);
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
export function fsFindAllParentChildPathsSync(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): string[] {
  const resultPaths: string[] = [];

  let current = fromPath;
  while (current) {
    const potential = path.resolve(current, childGlob);
    const globResults = fsGlobSync(potential);
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
export async function fsFindAllParentChildPaths(
  childGlob: string,
  fromPath: string,
  rootPath?: string,
): Promise<string[]> {
  const resultPaths: string[] = [];

  let current = fromPath;
  while (current) {
    const potential = path.resolve(current, childGlob);
    const globResults = await fsGlob(potential);
    resultPaths.push(...globResults);

    if (current === rootPath) break;

    const next = path.dirname(current);
    if (next === current) break;
    current = next;
  }

  return resultPaths;
}

//#endregion
