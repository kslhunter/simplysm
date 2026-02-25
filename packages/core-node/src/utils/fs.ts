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

//#region 파일 쓰기

/**
 * 파일 쓰기 (부모 디렉토리 자동 생성).
 * @param targetPath - 쓸 파일 경로
 * @param data - 쓸 데이터 (문자열 또는 바이너리)
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
 * 파일 쓰기 (부모 디렉토리 자동 생성, 비동기).
 * @param targetPath - 쓸 파일 경로
 * @param data - 쓸 데이터 (문자열 또는 바이너리)
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
 * JSON 파일 쓰기 (JsonConvert 사용).
 * @param targetPath - 쓸 JSON 파일 경로
 * @param data - 쓸 데이터
 * @param options - JSON 직렬화 옵션
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
 * JSON 파일 쓰기 (JsonConvert 사용, 비동기).
 * @param targetPath - 쓸 JSON 파일 경로
 * @param data - 쓸 데이터
 * @param options - JSON 직렬화 옵션
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

//#region 디렉토리 읽기

/**
 * 디렉토리 내용 읽기.
 * @param targetPath - 읽을 디렉토리 경로
 */
export function fsReaddirSync(targetPath: string): string[] {
  try {
    return fs.readdirSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 디렉토리 내용 읽기 (비동기).
 * @param targetPath - 읽을 디렉토리 경로
 */
export async function fsReaddir(targetPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region 파일 정보

/**
 * 파일/디렉토리 정보 (심볼릭 링크 따라감).
 * @param targetPath - 정보를 조회할 경로
 */
export function fsStatSync(targetPath: string): fs.Stats {
  try {
    return fs.statSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일/디렉토리 정보 (심볼릭 링크 따라감, 비동기).
 * @param targetPath - 정보를 조회할 경로
 */
export async function fsStat(targetPath: string): Promise<fs.Stats> {
  try {
    return await fs.promises.stat(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일/디렉토리 정보 (심볼릭 링크 따라가지 않음).
 * @param targetPath - 정보를 조회할 경로
 */
export function fsLstatSync(targetPath: string): fs.Stats {
  try {
    return fs.lstatSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일/디렉토리 정보 (심볼릭 링크 따라가지 않음, 비동기).
 * @param targetPath - 정보를 조회할 경로
 */
export async function fsLstat(targetPath: string): Promise<fs.Stats> {
  try {
    return await fs.promises.lstat(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region 글로브

/**
 * 글로브 패턴으로 파일 검색.
 * @param pattern - 글로브 패턴 (예: "**\/*.ts")
 * @param options - glob 옵션
 * @returns 매칭된 파일들의 절대 경로 배열
 */
export function fsGlobSync(pattern: string, options?: GlobOptions): string[] {
  return globRawSync(pattern.replace(/\\/g, "/"), options ?? {}).map((item) =>
    path.resolve(item.toString()),
  );
}

/**
 * 글로브 패턴으로 파일 검색 (비동기).
 * @param pattern - 글로브 패턴 (예: "**\/*.ts")
 * @param options - glob 옵션
 * @returns 매칭된 파일들의 절대 경로 배열
 */
export async function fsGlob(pattern: string, options?: GlobOptions): Promise<string[]> {
  return (await globRaw(pattern.replace(/\\/g, "/"), options ?? {})).map((item) =>
    path.resolve(item.toString()),
  );
}

//#endregion

//#region 유틸리티

/**
 * 지정 디렉토리 하위의 빈 디렉토리를 재귀적으로 탐색하여 삭제.
 * 하위 디렉토리가 모두 삭제되어 빈 디렉토리가 된 경우, 해당 디렉토리도 삭제 대상이 됨.
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

  // 파일이 있었다면 삭제 불가
  if (hasFiles) return;

  // 파일이 없었던 경우에만 재확인 (하위 디렉토리가 삭제되었을 수 있음)
  if ((await fsReaddir(dirPath)).length === 0) {
    await fsRm(dirPath);
  }
}

/**
 * 시작 경로부터 루트 방향으로 상위 디렉토리를 순회하며 glob 패턴 검색.
 * 각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집.
 * @param childGlob - 각 디렉토리에서 검색할 glob 패턴
 * @param fromPath - 검색 시작 경로
 * @param rootPath - 검색 종료 경로 (미지정 시 파일시스템 루트까지).
 *                   **주의**: fromPath가 rootPath의 자식 경로여야 함.
 *                   그렇지 않으면 파일시스템 루트까지 검색함.
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
 * 시작 경로부터 루트 방향으로 상위 디렉토리를 순회하며 glob 패턴 검색 (비동기).
 * 각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집.
 * @param childGlob - 각 디렉토리에서 검색할 glob 패턴
 * @param fromPath - 검색 시작 경로
 * @param rootPath - 검색 종료 경로 (미지정 시 파일시스템 루트까지).
 *                   **주의**: fromPath가 rootPath의 자식 경로여야 함.
 *                   그렇지 않으면 파일시스템 루트까지 검색함.
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
