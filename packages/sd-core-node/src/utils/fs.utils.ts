import path from "path";
import * as glob from "glob";
import os from "os";
import fs from "fs";
import crypto from "crypto";
import { JsonConvert, SdError } from "@simplysm/sd-core-common";

export class FsUtils {
  public static getParentPaths(currentPath: string): string[] {
    const result: string[] = [];
    let curr = currentPath;
    while (curr !== path.resolve(curr, "..")) {
      curr = path.resolve(curr, "..");
      result.push(curr);
    }

    return result;
  }

  public static async getMd5Async(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("md5").setEncoding("hex");
      fs.createReadStream(filePath)
        .on("error", (err: Error) => {
          reject(new SdError(err, filePath));
        })
        .pipe(hash)
        .once("finish", () => {
          resolve(hash.read());
        });
    });
  }

  public static async globAsync(pattern: string): Promise<string[]>;
  public static async globAsync(pattern: string, options: glob.GlobOptions): Promise<string[]>;
  public static async globAsync(pattern: string, options?: glob.GlobOptions): Promise<string[]> {
    return (await glob.glob(pattern.replace(/\\/g, "/"), options ?? {})).map((item) => path.resolve(item));
    /*return await new Promise<string[]>((resolve, reject) => {
      glob(pattern.replace(/\\/g, "/"), options ?? {}, (err: (Error | null), matches) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(matches.map((item) => path.resolve(item)));
      });
    });*/
  }

  public static glob(pattern: string, options?: glob.GlobOptions): string[] {
    return glob.globSync(pattern.replace(/\\/g, "/"), options ?? {}).map((item) => path.resolve(item));
  }

  public static async readdirAsync(targetPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static readdir(targetPath: string): string[] {
    try {
      return fs.readdirSync(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static exists(targetPath: string): boolean {
    try {
      return fs.existsSync(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async removeAsync(targetPath: string): Promise<void> {
    try {
      await fs.promises.rm(targetPath, { recursive: true, force: true, retryDelay: 500, maxRetries: 6 });
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static remove(targetPath: string): void {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async copyAsync(
    sourcePath: string,
    targetPath: string,
    filter?: (subPath: string) => boolean,
  ): Promise<void> {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    let lstat: fs.Stats;
    try {
      lstat = await fs.promises.lstat(sourcePath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }

    if (lstat.isDirectory()) {
      await FsUtils.mkdirsAsync(targetPath);

      const children = await FsUtils.globAsync(path.resolve(sourcePath, "*"));

      await children.parallelAsync(async (childPath) => {
        if (filter && !filter(childPath)) {
          return;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        await FsUtils.copyAsync(childPath, childTargetPath, filter);
      });
    }
    else {
      await FsUtils.mkdirsAsync(path.resolve(targetPath, ".."));

      try {
        await fs.promises.copyFile(sourcePath, targetPath);
      }
      catch (err) {
        if (err instanceof Error) {
          throw new SdError(err, targetPath);
        }
        else {
          throw err;
        }
      }
    }
  }

  public static copy(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): void {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    let lstat: fs.Stats;
    try {
      lstat = fs.lstatSync(sourcePath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
    if (lstat.isDirectory()) {
      FsUtils.mkdirs(targetPath);

      const children = FsUtils.glob(path.resolve(sourcePath, "*"));

      for (const childPath of children) {
        if (filter && !filter(childPath)) {
          continue;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        FsUtils.copy(childPath, childTargetPath, filter);
      }
    }
    else {
      FsUtils.mkdirs(path.resolve(targetPath, ".."));

      try {
        fs.copyFileSync(sourcePath, targetPath);
      }
      catch (err) {
        if (err instanceof Error) {
          throw new SdError(err, targetPath);
        }
        else {
          throw err;
        }
      }
    }
  }

  public static async mkdirsAsync(targetPath: string): Promise<void> {
    if (FsUtils.exists(targetPath)) return;

    try {
      await fs.promises.mkdir(targetPath, { recursive: true });
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static mkdirs(targetPath: string): void {
    if (FsUtils.exists(targetPath)) return;

    try {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async writeJsonAsync(
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

  public static writeJson(
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

  public static async writeFileAsync(targetPath: string, data: any): Promise<void> {
    await FsUtils.mkdirsAsync(path.dirname(targetPath));

    try {
      await fs.promises.writeFile(targetPath, data);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(
          err,
          targetPath + (typeof data === "object" ? ((data.constructor?.name ?? "object") as string) : typeof data),
        );
      }
      else {
        throw err;
      }
    }
  }

  public static writeFile(targetPath: string, data: any): void {
    FsUtils.mkdirs(path.dirname(targetPath));

    try {
      fs.writeFileSync(targetPath, data, {
        flush: true,
      });
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static readFile(targetPath: string): string {
    try {
      return fs.readFileSync(targetPath, "utf-8");
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async readFileAsync(targetPath: string): Promise<string> {
    if (!FsUtils.exists(targetPath)) {
      throw new SdError(targetPath + "파일을 찾을 수 없습니다.");
    }

    try {
      return await fs.promises.readFile(targetPath, "utf-8");
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static readFileBuffer(targetPath: string): Buffer {
    try {
      return fs.readFileSync(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async readFileBufferAsync(targetPath: string): Promise<Buffer> {
    try {
      return await fs.promises.readFile(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static readJson(targetPath: string): any {
    const contents = FsUtils.readFile(targetPath);
    return JsonConvert.parse(contents);
  }

  public static async readJsonAsync(targetPath: string): Promise<any> {
    const contents = await FsUtils.readFileAsync(targetPath);
    try {
      return JsonConvert.parse(contents);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath + os.EOL + contents);
      }
      else {
        throw err;
      }
    }
  }

  public static lstat(targetPath: string): fs.Stats {
    try {
      return fs.lstatSync(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async lstatAsync(targetPath: string): Promise<fs.Stats> {
    try {
      return await fs.promises.lstat(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static stat(targetPath: string): fs.Stats {
    try {
      return fs.statSync(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async statAsync(targetPath: string): Promise<fs.Stats> {
    try {
      return await fs.promises.stat(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static appendFile(targetPath: string, data: any): void {
    try {
      fs.appendFileSync(targetPath, data, "utf8");
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static open(targetPath: string, flags: string | number): number {
    try {
      return fs.openSync(targetPath, flags);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static async openAsync(targetPath: string, flags: string | number): Promise<fs.promises.FileHandle> {
    try {
      return await fs.promises.open(targetPath, flags);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  public static createReadStream(sourcePath: string): fs.ReadStream {
    try {
      return fs.createReadStream(sourcePath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, sourcePath);
      }
      else {
        throw err;
      }
    }
  }

  public static createWriteStream(targetPath: string): fs.WriteStream {
    try {
      return fs.createWriteStream(targetPath);
    }
    catch (err) {
      if (err instanceof Error) {
        throw new SdError(err, targetPath);
      }
      else {
        throw err;
      }
    }
  }

  /*public static async isDirectoryAsync(targetPath: string): Promise<boolean> {
    return (await FsUtil.lstatAsync(targetPath)).isDirectory();
  }

  public static isDirectory(targetPath: string): boolean {
    return FsUtil.stat(targetPath).isDirectory();
  }*/

  public static async clearEmptyDirectoryAsync(dirPath: string): Promise<void> {
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

  public static findAllParentChildPaths(childGlob: string, fromPath: string, rootPath?: string): string[] {
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
}
