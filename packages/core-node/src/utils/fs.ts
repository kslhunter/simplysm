import path from "path";
import fs from "fs";
import os from "os";
import * as glob from "glob";
import { JsonConvert, SdError } from "@simplysm/core-common";

//#region FsUtils

/**
 * 파일 시스템 유틸리티 클래스.
 * node:fs/promises를 기반으로 에러 핸들링과 편의 기능 제공.
 */
export class FsUtils {
  //#region 존재 확인

  /**
   * 파일 또는 디렉토리 존재 확인 (동기).
   */
  static exists(targetPath: string): boolean {
    return fs.existsSync(targetPath);
  }

  //#endregion

  //#region 디렉토리 생성

  /**
   * 디렉토리 생성 (recursive).
   */
  static mkdir(targetPath: string): void {
    if (FsUtils.exists(targetPath)) return;

    try {
      fs.mkdirSync(targetPath, { recursive: true });
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 디렉토리 생성 (recursive, 비동기).
   */
  static async mkdirAsync(targetPath: string): Promise<void> {
    if (FsUtils.exists(targetPath)) return;

    try {
      await fs.promises.mkdir(targetPath, { recursive: true });
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  //#endregion

  //#region 삭제

  /**
   * 파일 또는 디렉토리 삭제.
   */
  static rm(targetPath: string): void {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일 또는 디렉토리 삭제 (비동기).
   */
  static async rmAsync(targetPath: string): Promise<void> {
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

  /**
   * 파일 또는 디렉토리 복사.
   */
  static copy(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): void {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(sourcePath);
    } catch (err) {
      throw new SdError(err, sourcePath);
    }

    if (stat.isDirectory()) {
      FsUtils.mkdir(targetPath);

      const children = FsUtils.glob(path.resolve(sourcePath, "*"));

      for (const childPath of children) {
        if (filter !== undefined && !filter(childPath)) {
          continue;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        FsUtils.copy(childPath, childTargetPath, filter);
      }
    } else {
      FsUtils.mkdir(path.dirname(targetPath));

      try {
        fs.copyFileSync(sourcePath, targetPath);
      } catch (err) {
        throw new SdError(err, targetPath);
      }
    }
  }

  /**
   * 파일 또는 디렉토리 복사 (비동기).
   */
  static async copyAsync(
    sourcePath: string,
    targetPath: string,
    filter?: (subPath: string) => boolean,
  ): Promise<void> {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    let stat: fs.Stats;
    try {
      stat = await fs.promises.lstat(sourcePath);
    } catch (err) {
      throw new SdError(err, sourcePath);
    }

    if (stat.isDirectory()) {
      await FsUtils.mkdirAsync(targetPath);

      const children = await FsUtils.globAsync(path.resolve(sourcePath, "*"));

      await children.parallelAsync(async (childPath) => {
        if (filter !== undefined && !filter(childPath)) {
          return;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        await FsUtils.copyAsync(childPath, childTargetPath, filter);
      });
    } else {
      await FsUtils.mkdirAsync(path.dirname(targetPath));

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
   * 파일 읽기 (UTF-8 문자열).
   */
  static read(targetPath: string): string {
    try {
      return fs.readFileSync(targetPath, "utf-8");
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일 읽기 (UTF-8 문자열, 비동기).
   */
  static async readAsync(targetPath: string): Promise<string> {
    try {
      return await fs.promises.readFile(targetPath, "utf-8");
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일 읽기 (Buffer).
   */
  static readBuffer(targetPath: string): Buffer {
    try {
      return fs.readFileSync(targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일 읽기 (Buffer, 비동기).
   */
  static async readBufferAsync(targetPath: string): Promise<Buffer> {
    try {
      return await fs.promises.readFile(targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * JSON 파일 읽기 (JsonConvert 사용).
   */
  static readJson<T = unknown>(targetPath: string): T {
    const contents = FsUtils.read(targetPath);
    try {
      return JsonConvert.parse(contents);
    } catch (err) {
      throw new SdError(err, targetPath + os.EOL + contents);
    }
  }

  /**
   * JSON 파일 읽기 (JsonConvert 사용, 비동기).
   */
  static async readJsonAsync<T = unknown>(targetPath: string): Promise<T> {
    const contents = await FsUtils.readAsync(targetPath);
    try {
      const result: T = JsonConvert.parse(contents);
      return result;
    } catch (err) {
      throw new SdError(err, targetPath + os.EOL + contents);
    }
  }

  //#endregion

  //#region 파일 쓰기

  /**
   * 파일 쓰기 (부모 디렉토리 자동 생성).
   */
  static write(targetPath: string, data: string | Buffer): void {
    FsUtils.mkdir(path.dirname(targetPath));

    try {
      fs.writeFileSync(targetPath, data, { flush: true });
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일 쓰기 (부모 디렉토리 자동 생성, 비동기).
   */
  static async writeAsync(targetPath: string, data: string | Buffer): Promise<void> {
    await FsUtils.mkdirAsync(path.dirname(targetPath));

    try {
      await fs.promises.writeFile(targetPath, data, { flush: true });
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * JSON 파일 쓰기 (JsonConvert 사용).
   */
  static writeJson(
    targetPath: string,
    data: unknown,
    options?: {
      replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
      space?: string | number;
    },
  ): void {
    const json = JsonConvert.stringify(data, options);
    FsUtils.write(targetPath, json);
  }

  /**
   * JSON 파일 쓰기 (JsonConvert 사용, 비동기).
   */
  static async writeJsonAsync(
    targetPath: string,
    data: unknown,
    options?: {
      replacer?: (this: unknown, key: string | undefined, value: unknown) => unknown;
      space?: string | number;
    },
  ): Promise<void> {
    const json = JsonConvert.stringify(data, options);
    await FsUtils.writeAsync(targetPath, json);
  }

  //#endregion

  //#region 디렉토리 읽기

  /**
   * 디렉토리 내용 읽기.
   */
  static readdir(targetPath: string): string[] {
    try {
      return fs.readdirSync(targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 디렉토리 내용 읽기 (비동기).
   */
  static async readdirAsync(targetPath: string): Promise<string[]> {
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
   */
  static stat(targetPath: string): fs.Stats {
    try {
      return fs.statSync(targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일/디렉토리 정보 (심볼릭 링크 따라감, 비동기).
   */
  static async statAsync(targetPath: string): Promise<fs.Stats> {
    try {
      return await fs.promises.stat(targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일/디렉토리 정보 (심볼릭 링크 따라가지 않음).
   */
  static lstat(targetPath: string): fs.Stats {
    try {
      return fs.lstatSync(targetPath);
    } catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  /**
   * 파일/디렉토리 정보 (심볼릭 링크 따라가지 않음, 비동기).
   */
  static async lstatAsync(targetPath: string): Promise<fs.Stats> {
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
   */
  static glob(pattern: string, options?: glob.GlobOptions): string[] {
    return glob
      .globSync(pattern.replace(/\\/g, "/"), options ?? {})
      .map((item) => path.resolve(item.toString()));
  }

  /**
   * 글로브 패턴으로 파일 검색 (비동기).
   */
  static async globAsync(pattern: string, options?: glob.GlobOptions): Promise<string[]> {
    return (await glob.glob(pattern.replace(/\\/g, "/"), options ?? {})).map((item) =>
      path.resolve(item.toString()),
    );
  }

  //#endregion

  //#region 유틸리티

  /**
   * 빈 디렉토리 재귀적으로 삭제.
   */
  static async clearEmptyDirectoryAsync(dirPath: string): Promise<void> {
    if (!FsUtils.exists(dirPath)) return;

    const childNames = await FsUtils.readdirAsync(dirPath);
    for (const childName of childNames) {
      const childPath = path.resolve(dirPath, childName);
      if ((await FsUtils.lstatAsync(childPath)).isDirectory()) {
        await FsUtils.clearEmptyDirectoryAsync(childPath);
      }
    }

    if ((await FsUtils.readdirAsync(dirPath)).length === 0) {
      await FsUtils.rmAsync(dirPath);
    }
  }

  /**
   * 부모 디렉토리들에서 특정 패턴의 파일 찾기.
   */
  static findAllParentChildPaths(childGlob: string, fromPath: string, rootPath?: string): string[] {
    const resultPaths: string[] = [];

    let current = fromPath;
    while (current) {
      const potential = path.resolve(current, childGlob);
      const globResults = FsUtils.glob(potential);
      resultPaths.push(...globResults);

      if (current === rootPath) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return resultPaths;
  }

  /**
   * 부모 디렉토리들에서 특정 패턴의 파일 찾기 (비동기).
   */
  static async findAllParentChildPathsAsync(
    childGlob: string,
    fromPath: string,
    rootPath?: string,
  ): Promise<string[]> {
    const resultPaths: string[] = [];

    let current = fromPath;
    while (current) {
      const potential = path.resolve(current, childGlob);
      const globResults = await FsUtils.globAsync(potential);
      resultPaths.push(...globResults);

      if (current === rootPath) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return resultPaths;
  }

  //#endregion
}

//#endregion
