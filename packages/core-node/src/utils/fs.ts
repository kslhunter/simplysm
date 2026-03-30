import path from "path";
import fs from "fs";
import os from "os";
import { glob as globRaw, type GlobOptions, globSync as globRawSync } from "glob";
import { json, SdError } from "@simplysm/core-common";
import "@simplysm/core-common";

//#region 존재 여부 확인

/**
 * 파일 또는 디렉토리가 존재하는지 확인한다 (동기).
 * @param targetPath - 확인할 경로
 */
export function existsSync(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

/**
 * 파일 또는 디렉토리가 존재하는지 확인한다 (비동기).
 * @param targetPath - 확인할 경로
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

//#region 디렉토리 생성

/**
 * 디렉토리를 생성한다 (재귀적).
 * @param targetPath - 생성할 디렉토리 경로
 */
export function mkdirSync(targetPath: string): void {
  try {
    fs.mkdirSync(targetPath, { recursive: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 디렉토리를 생성한다 (재귀적, 비동기).
 * @param targetPath - 생성할 디렉토리 경로
 */
export async function mkdir(targetPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region 삭제

/**
 * 파일 또는 디렉토리를 삭제한다.
 * @param targetPath - 삭제할 경로
 * @remarks 동기 버전은 재시도 없이 즉시 실패한다. 파일 잠금 등 일시적 오류가 발생할 수 있는 경우 rm을 사용하라.
 */
export function rmSync(targetPath: string): void {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일 또는 디렉토리를 삭제한다 (비동기).
 * @param targetPath - 삭제할 경로
 * @remarks 비동기 버전은 파일 잠금 등 일시적 오류에 대해 최대 6회(500ms 간격) 재시도한다.
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

//#region 복사

interface CopyEntry {
  sourcePath: string;
  targetPath: string;
}

function collectCopyEntries(
  sourcePath: string,
  targetPath: string,
  children: string[],
  filter?: (absolutePath: string) => boolean,
): CopyEntry[] {
  const entries: CopyEntry[] = [];
  for (const childPath of children) {
    if (filter !== undefined && !filter(childPath)) {
      continue;
    }
    const relativeChildPath = path.relative(sourcePath, childPath);
    const childTargetPath = path.resolve(targetPath, relativeChildPath);
    entries.push({ sourcePath: childPath, targetPath: childTargetPath });
  }
  return entries;
}

/**
 * 파일 또는 디렉토리를 복사한다.
 *
 * sourcePath가 존재하지 않으면 아무 작업도 수행하지 않고 반환한다.
 *
 * @param sourcePath 복사할 원본 경로
 * @param targetPath 복사 대상 경로
 * @param filter 복사 여부를 결정하는 필터 함수.
 *               각 파일/디렉토리의 **절대 경로**가 전달된다.
 *               true를 반환하면 복사, false를 반환하면 제외한다.
 *               **주의**: 최상위 sourcePath는 필터링 대상이 아니며,
 *               필터 함수는 모든 하위 항목(직접 및 간접)에 재귀적으로 적용된다.
 *               디렉토리에 대해 false를 반환하면 해당 디렉토리와 모든 내용을 건너뛴다.
 */
export function copySync(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): void {
  if (!existsSync(sourcePath)) {
    return;
  }

  const stats = lstatSync(sourcePath);

  if (stats.isDirectory()) {
    mkdirSync(targetPath);
    const children = globSync(path.resolve(sourcePath, "*"), { dot: true });
    for (const entry of collectCopyEntries(sourcePath, targetPath, children, filter)) {
      copySync(entry.sourcePath, entry.targetPath, filter);
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
 * 파일 또는 디렉토리를 복사한다 (비동기).
 *
 * sourcePath가 존재하지 않으면 아무 작업도 수행하지 않고 반환한다.
 *
 * @param sourcePath 복사할 원본 경로
 * @param targetPath 복사 대상 경로
 * @param filter 복사 여부를 결정하는 필터 함수.
 *               각 파일/디렉토리의 **절대 경로**가 전달된다.
 *               true를 반환하면 복사, false를 반환하면 제외한다.
 *               **주의**: 최상위 sourcePath는 필터링 대상이 아니며,
 *               필터 함수는 모든 하위 항목(직접 및 간접)에 재귀적으로 적용된다.
 *               디렉토리에 대해 false를 반환하면 해당 디렉토리와 모든 내용을 건너뛴다.
 */
export async function copy(
  sourcePath: string,
  targetPath: string,
  filter?: (absolutePath: string) => boolean,
): Promise<void> {
  if (!(await exists(sourcePath))) {
    return;
  }

  const stats = await lstat(sourcePath);

  if (stats.isDirectory()) {
    await mkdir(targetPath);
    const children = await glob(path.resolve(sourcePath, "*"), { dot: true });
    await collectCopyEntries(sourcePath, targetPath, children, filter)
      .parallelAsync(async (entry) => {
        await copy(entry.sourcePath, entry.targetPath, filter);
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

//#region 파일 읽기

/**
 * 파일을 UTF-8 문자열로 읽는다.
 * @param targetPath - 읽을 파일 경로
 */
export function readSync(targetPath: string): string {
  try {
    return fs.readFileSync(targetPath, "utf-8");
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일을 UTF-8 문자열로 읽는다 (비동기).
 * @param targetPath - 읽을 파일 경로
 */
export async function read(targetPath: string): Promise<string> {
  try {
    return await fs.promises.readFile(targetPath, "utf-8");
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일을 Buffer로 읽는다.
 * @param targetPath - 읽을 파일 경로
 */
export function readBufferSync(targetPath: string): Buffer {
  try {
    return fs.readFileSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일을 Buffer로 읽는다 (비동기).
 * @param targetPath - 읽을 파일 경로
 */
export async function readBuffer(targetPath: string): Promise<Buffer> {
  try {
    return await fs.promises.readFile(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * JSON 파일을 읽는다 (JsonConvert 사용).
 * @param targetPath - 읽을 JSON 파일 경로
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
 * JSON 파일을 읽는다 (JsonConvert 사용, 비동기).
 * @param targetPath - 읽을 JSON 파일 경로
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

//#region 파일 쓰기

/**
 * 파일에 데이터를 쓴다 (상위 디렉토리 자동 생성).
 * @param targetPath - 쓸 파일 경로
 * @param data - 쓸 데이터 (문자열 또는 바이너리)
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
 * 파일에 데이터를 쓴다 (상위 디렉토리 자동 생성, 비동기).
 * @param targetPath - 쓸 파일 경로
 * @param data - 쓸 데이터 (문자열 또는 바이너리)
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
 * JSON 파일에 데이터를 쓴다 (JsonConvert 사용).
 * @param targetPath - 쓸 JSON 파일 경로
 * @param data - 쓸 데이터
 * @param options - JSON 직렬화 옵션
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
 * JSON 파일에 데이터를 쓴다 (JsonConvert 사용, 비동기).
 * @param targetPath - 쓸 JSON 파일 경로
 * @param data - 쓸 데이터
 * @param options - JSON 직렬화 옵션
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

//#region 디렉토리 읽기

/**
 * 디렉토리의 내용을 읽는다.
 * @param targetPath - 읽을 디렉토리 경로
 */
export function readdirSync(targetPath: string): string[] {
  try {
    return fs.readdirSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 디렉토리의 내용을 읽는다 (비동기).
 * @param targetPath - 읽을 디렉토리 경로
 */
export async function readdir(targetPath: string): Promise<string[]> {
  try {
    return await fs.promises.readdir(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

//#endregion

//#region 파일 정보

/**
 * 파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라감).
 * @param targetPath - 정보를 조회할 경로
 */
export function statSync(targetPath: string): fs.Stats {
  try {
    return fs.statSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라감, 비동기).
 * @param targetPath - 정보를 조회할 경로
 */
export async function stat(targetPath: string): Promise<fs.Stats> {
  try {
    return await fs.promises.stat(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라가지 않음).
 * @param targetPath - 정보를 조회할 경로
 */
export function lstatSync(targetPath: string): fs.Stats {
  try {
    return fs.lstatSync(targetPath);
  } catch (err) {
    throw new SdError(err, targetPath);
  }
}

/**
 * 파일/디렉토리 정보를 가져온다 (심볼릭 링크를 따라가지 않음, 비동기).
 * @param targetPath - 정보를 조회할 경로
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
 * Glob 패턴을 사용하여 파일을 검색한다.
 * @param pattern - Glob 패턴 (예: "**\/*.ts")
 * @param options - glob 옵션
 * @returns 매칭된 파일의 절대 경로 배열
 */
export function globSync(pattern: string, options?: GlobOptions): string[] {
  return globRawSync(pattern.replace(/\\/g, "/"), options ?? {}).map((item) =>
    path.resolve(item.toString()),
  );
}

/**
 * Glob 패턴을 사용하여 파일을 검색한다 (비동기).
 * @param pattern - Glob 패턴 (예: "**\/*.ts")
 * @param options - glob 옵션
 * @returns 매칭된 파일의 절대 경로 배열
 */
export async function glob(pattern: string, options?: GlobOptions): Promise<string[]> {
  return (await globRaw(pattern.replace(/\\/g, "/"), options ?? {})).map((item) =>
    path.resolve(item.toString()),
  );
}

//#endregion

//#region 유틸리티

/**
 * 지정된 디렉토리 하위의 빈 디렉토리를 재귀적으로 검색하여 삭제한다.
 * 모든 하위 디렉토리가 삭제되어 상위 디렉토리가 비게 되면, 해당 디렉토리도 삭제된다.
 */
export async function clearEmptyDirectory(dirPath: string): Promise<void> {
  if (!(await exists(dirPath))) return;

  const childNames = await readdir(dirPath);
  let hasFiles = false;

  for (const childName of childNames) {
    const childPath = path.resolve(dirPath, childName);
    const childStat = await lstat(childPath);
    if (childStat.isDirectory()) {
      await clearEmptyDirectory(childPath);
    } else {
      hasFiles = true;
    }
  }

  // 파일이 있으면 삭제 불가
  if (hasFiles) return;

  // 파일이 없는 경우에만 다시 확인 (하위 디렉토리가 삭제되었을 수 있음)
  if ((await readdir(dirPath)).length === 0) {
    await rm(dirPath);
  }
}

/**
 * 시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일을 검색한다.
 * 각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집한다.
 * @param childGlob - 각 디렉토리에서 검색할 glob 패턴
 * @param fromPath - 검색을 시작할 경로
 * @param rootPath - 검색을 중단할 경로 (지정하지 않으면 파일 시스템 루트까지 검색).
 *                   **주의**: fromPath는 rootPath의 하위 경로여야 한다.
 *                   그렇지 않으면 파일 시스템 루트까지 검색한다.
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
 * 시작 경로에서 루트 방향으로 부모 디렉토리를 순회하며 glob 패턴에 매칭되는 파일을 검색한다 (비동기).
 * 각 디렉토리에서 childGlob 패턴에 매칭되는 모든 파일 경로를 수집한다.
 * @param childGlob - 각 디렉토리에서 검색할 glob 패턴
 * @param fromPath - 검색을 시작할 경로
 * @param rootPath - 검색을 중단할 경로 (지정하지 않으면 파일 시스템 루트까지 검색).
 *                   **주의**: fromPath는 rootPath의 하위 경로여야 한다.
 *                   그렇지 않으면 파일 시스템 루트까지 검색한다.
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
