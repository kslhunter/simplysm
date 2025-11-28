import path from "path";
import * as glob from "glob";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import { JsonConvert, SdError } from "@simplysm/sd-core-common";
import { HashUtils } from "./HashUtils";
import { TNormPath } from "./PathUtils";

export class FsUtils {
  static getParentPaths(currentPath: string): string[] {
    const result: string[] = [];
    let curr = currentPath;
    while (curr !== path.resolve(curr, "..")) {
      curr = path.resolve(curr, "..");
      result.push(curr);
    }
    return result;
  }

  static async getMd5Async(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("md5").setEncoding("hex");
      fs.createReadStream(filePath)
        .on("error", reject)
        .pipe(hash)
        .once("finish", () => {
          resolve(hash.read());
        });
    });
  }

  static async globAsync(pattern: string, options?: glob.GlobOptions): Promise<string[]> {
    return (await glob.glob(pattern.replace(/\\/g, "/"), options ?? {})).map((item) =>
      path.resolve(item),
    );
  }

  static glob(pattern: string, options?: glob.GlobOptions): string[] {
    return glob
      .globSync(pattern.replace(/\\/g, "/"), options ?? {})
      .map((item) => path.resolve(item));
  }

  static async readdirAsync(targetPath: string): Promise<string[]> {
    return await fs.promises.readdir(targetPath);
  }

  static readdir(targetPath: string): string[] {
    return fs.readdirSync(targetPath);
  }

  static exists(targetPath: string): boolean {
    return fs.existsSync(targetPath);
  }

  static async removeAsync(targetPath: string): Promise<void> {
    await fs.promises.rm(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 500,
    });
  }

  static remove(targetPath: string): void {
    fs.rmSync(targetPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  }

  static async copyAsync(
    sourcePath: string,
    targetPath: string,
    filter?: ((source: string, destination: string) => boolean | Promise<boolean>) | undefined,
  ): Promise<void> {
    if (!FsUtils.exists(sourcePath)) return;

    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

    await fs.promises.cp(sourcePath, targetPath, {
      recursive: true,
      filter: filter ? (src, dest) => filter(src, dest) : undefined,
    });
  }
  static copy(
    sourcePath: string,
    targetPath: string,
    filter?: ((source: string, destination: string) => boolean) | undefined,
  ): void {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    fs.cpSync(sourcePath, targetPath, {
      recursive: true,
      filter: filter ? (src, dest) => filter(src, dest) : undefined,
    });
  }

  static async mkdirsAsync(targetPath: string): Promise<void> {
    await fs.promises.mkdir(targetPath, { recursive: true });
  }

  static mkdirs(targetPath: string): void {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  static async writeJsonAsync(
    targetPath: string,
    data: any,
    options?: {
      replacer?: (this: any, key: string | undefined, value: any) => any;
      space?: string | number;
    },
  ): Promise<void> {
    const json = JsonConvert.stringify(data, options);
    await FsUtils.writeFileAsync(targetPath, json);
  }

  static writeJson(
    targetPath: string,
    data: any,
    options?: {
      replacer?: (this: any, key: string | undefined, value: any) => any;
      space?: string | number;
    },
  ): void {
    const json = JsonConvert.stringify(data, options);
    FsUtils.writeFile(targetPath, json);
  }

  /**
   * 여러 파일 쓰기.
   * 성능을 위해, 폴더별 병렬. 폴더내 파일은 순차.
   * 폴더내 파일의 경우 폴더의 메타데이터갱신에 의해 LOCK이 걸릴 수 있기 때문.
   */
  static async writeFilesAsync(
    files: { path: TNormPath; data: string | Buffer; prevHash?: string; hash?: string }[],
  ): Promise<{ path: TNormPath; hash: string }[]> {
    const result: { path: TNormPath; hash: string }[] = [];

    // [중요 수정] basename(파일명)이 아닌 dirname(폴더명)으로 그룹핑해야 "폴더별 병렬/폴더내 순차" 의도가 맞습니다.
    // 기존 코드는 파일명이 같으면(예: index.ts) 다른 폴더라도 순차 처리하고,
    // 같은 폴더라도 파일명이 다르면 병렬 처리하여 LOCK 위험이 있었습니다.
    const group = files.groupBy((item) => path.dirname(item.path));

    await group.parallelAsync(async (groupItem) => {
      for (const file of groupItem.values) {
        const currHash = file.hash ?? HashUtils.get(file.data);
        if (file.prevHash !== file.hash) {
          await FsUtils.writeFileAsync(file.path, file.data);
          result.push({ path: file.path, hash: currHash });
        }
      }
    });

    return result;
  }

  static async writeFileAsync(targetPath: string, data: any): Promise<void> {
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, data);
  }

  static writeFile(targetPath: string, data: any): void {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    fs.writeFileSync(targetPath, data, {
      flush: true,
    });
  }

  static readFile(targetPath: string): string {
    return fs.readFileSync(targetPath, "utf-8");
  }

  static async readFileAsync(targetPath: string): Promise<string> {
    if (!FsUtils.exists(targetPath)) {
      throw new SdError(targetPath + "파일을 찾을 수 없습니다.");
    }

    return await fs.promises.readFile(targetPath, "utf-8");
  }

  static readFileBuffer(targetPath: string): Buffer {
    return fs.readFileSync(targetPath);
  }

  static async readFileBufferAsync(targetPath: string): Promise<Buffer> {
    return await fs.promises.readFile(targetPath);
  }

  static readJson(targetPath: string): any {
    const contents = FsUtils.readFile(targetPath);
    return JsonConvert.parse(contents);
  }

  static async readJsonAsync(targetPath: string): Promise<any> {
    const contents = await FsUtils.readFileAsync(targetPath);
    try {
      return JsonConvert.parse(contents);
    } catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath + os.EOL + contents);
      } else {
        throw err;
      }
    }
  }

  static lstat(targetPath: string): fs.Stats {
    return fs.lstatSync(targetPath);
  }

  static async lstatAsync(targetPath: string): Promise<fs.Stats> {
    return await fs.promises.lstat(targetPath);
  }

  static stat(targetPath: string): fs.Stats {
    return fs.statSync(targetPath);
  }

  static async statAsync(targetPath: string): Promise<fs.Stats> {
    return await fs.promises.stat(targetPath);
  }

  static appendFile(targetPath: string, data: any): void {
    fs.appendFileSync(targetPath, data, "utf8");
  }

  static open(targetPath: string, flags: string | number): number {
    return fs.openSync(targetPath, flags);
  }

  static async openAsync(
    targetPath: string,
    flags: string | number,
  ): Promise<fs.promises.FileHandle> {
    return await fs.promises.open(targetPath, flags);
  }

  static createReadStream(sourcePath: string): fs.ReadStream {
    return fs.createReadStream(sourcePath);
  }

  static createWriteStream(targetPath: string): fs.WriteStream {
    return fs.createWriteStream(targetPath);
  }

  static async clearEmptyDirectoryAsync(dirPath: string): Promise<void> {
    if (!FsUtils.exists(dirPath)) return;

    const childNames = await FsUtils.readdirAsync(dirPath);
    for (const childName of childNames) {
      const childPath = path.resolve(dirPath, childName);
      if ((await FsUtils.lstatAsync(childPath)).isDirectory()) {
        await this.clearEmptyDirectoryAsync(childPath);
      }
    }

    if ((await FsUtils.readdirAsync(dirPath)).length === 0) {
      await FsUtils.removeAsync(dirPath);
    }
  }

  static findAllParentChildPaths(childGlob: string, fromPath: string, rootPath?: string): string[] {
    const resultPaths: string[] = [];

    let current = fromPath;
    while (current) {
      const potential = path.resolve(current, childGlob);
      const globResults = FsUtils.glob(potential);
      for (const globResult of globResults) {
        if (FsUtils.exists(globResult)) {
          resultPaths.push(globResult);
        }
      }

      if (current === rootPath) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return resultPaths;
  }

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
      for (const globResult of globResults) {
        if (FsUtils.exists(globResult)) {
          resultPaths.push(globResult);
        }
      }

      if (current === rootPath) break;

      const next = path.dirname(current);
      if (next === current) break;
      current = next;
    }

    return resultPaths;
  }
}
