import * as crypto from "crypto";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { SdError, Wait } from "@simplysm/sd-core-common";
import * as os from "os";
import * as rimraf from "rimraf";

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
  public static async globAsync(pattern: string, options: glob.IOptions): Promise<string[]>;
  public static async globAsync(pattern: string, options?: glob.IOptions): Promise<string[]> {
    if (options) {
      return await new Promise<string[]>((resolve, reject) => {
        glob(pattern, options, (err, matches) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(matches.map(item => path.resolve(item)));
        });
      });
    }
    else {
      return await new Promise<string[]>((resolve, reject) => {
        glob(pattern, (err, matches) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(matches.map(item => path.resolve(item)));
        });
      });
    }
  }

  public static glob(pattern: string, options?: glob.IOptions): string[] {
    return glob.sync(pattern, options);
  }

  public static async readdirAsync(targetPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static readdir(targetPath: string): string[] {
    try {
      return fs.readdirSync(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static exists(targetPath: string): boolean {
    try {
      return fs.existsSync(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async removeAsync(targetPath: string): Promise<void> {
    try {
      await new Promise((resolve, reject) => {
        rimraf(targetPath, err => {
          if (err != null) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static remove(targetPath: string): void {
    try {
      rimraf.sync(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async copyAsync(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): Promise<void> {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    let lstat;
    try {
      lstat = await fs.promises.lstat(sourcePath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }

    if (lstat.isDirectory()) {
      await FsUtils.mkdirsAsync(targetPath);

      const children = await FsUtils.globAsync(path.resolve(sourcePath, "*"));

      await children.parallelAsync(async childPath => {
        if (filter && !filter(childPath)) {
          return;
        }


        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        await FsUtils.copyAsync(childPath, childTargetPath);
      });
    }
    else {
      await FsUtils.mkdirsAsync(path.resolve(targetPath, ".."));

      try {
        await fs.promises.copyFile(sourcePath, targetPath);
      }
      catch (err) {
        throw new SdError(err, targetPath);
      }
    }
  }

  public static copy(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): void {
    if (!FsUtils.exists(sourcePath)) {
      return;
    }

    let lstat;
    try {
      lstat = fs.lstatSync(sourcePath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
    if (lstat.isDirectory()) {
      FsUtils.mkdirs(targetPath);

      const children = FsUtils.glob(path.resolve(sourcePath, "*"));

      for (const childPath of children) {
        if (filter && !filter(childPath)) {
          return;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        FsUtils.copy(childPath, childTargetPath);
      }
    }
    else {
      FsUtils.mkdirs(path.resolve(targetPath, ".."));

      try {
        fs.copyFileSync(sourcePath, targetPath);
      }
      catch (err) {
        throw new SdError(err, targetPath);
      }
    }
  }

  public static async mkdirsAsync(targetPath: string): Promise<void> {
    if (FsUtils.exists(targetPath)) return;

    try {
      await new Promise<void>((resolve, reject) => {
        fs.mkdir(targetPath, { recursive: true }, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static mkdirs(targetPath: string): void {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async writeJsonAsync(targetPath: string, data: any, options?: { replacer?: (this: any, key: string, value: any) => any; space?: string | number }): Promise<void> {
    const json = JSON.stringify(data, options?.replacer, options?.space);
    await FsUtils.writeFileAsync(targetPath, json);
  }

  public static async writeFileAsync(targetPath: string, data: any): Promise<void> {
    await FsUtils.mkdirsAsync(path.dirname(targetPath));

    try {
      await new Promise<void>((resolve, reject) => {
        if (typeof data === "string") {
          fs.writeFile(targetPath, data.replace(new RegExp(os.EOL, "g"), "\n").replace(/\n/g, os.EOL), err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }
        else {
          fs.writeFile(targetPath, data, err => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }
      });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static writeFile(targetPath: string, data: any): void {
    FsUtils.mkdirs(path.resolve(targetPath, ".."));
    try {
      if (typeof data === "string") {
        fs.writeFileSync(targetPath, data.replace(new RegExp(os.EOL, "g"), "\n").replace(/\n/g, os.EOL));
      }
      else {
        fs.writeFileSync(targetPath, data);
      }
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static readFile(targetPath: string): string {
    try {
      return fs.readFileSync(targetPath, "utf-8");
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async readFileAsync(targetPath: string): Promise<string> {
    try {
      return await fs.promises.readFile(targetPath, "utf-8");
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static readFileBuffer(targetPath: string): Buffer {
    try {
      return fs.readFileSync(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async readFileBufferAsync(targetPath: string): Promise<Buffer> {
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        fs.readFile(targetPath, (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data);
        });
      });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static readJson(targetPath: string): any {
    const contents = FsUtils.readFile(targetPath);
    return JSON.parse(contents);
  }

  public static async readJsonAsync(targetPath: string): Promise<any> {
    await Wait.true(async () => Boolean(await FsUtils.readFileAsync(targetPath)), undefined, 3000);
    const contents = await FsUtils.readFileAsync(targetPath);
    try {
      return JSON.parse(contents);
    }
    catch (err) {
      throw new SdError(err, targetPath + os.EOL + contents);
    }
  }

  public static lstat(targetPath: string): fs.Stats {
    try {
      return fs.lstatSync(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async lstatAsync(targetPath: string): Promise<fs.Stats> {
    try {
      return await fs.promises.lstat(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static appendFile(targetPath: string, data: any): void {
    try {
      fs.appendFileSync(targetPath, data, "utf8");
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static open(targetPath: string, flags: string | number): number {
    try {
      return fs.openSync(targetPath, flags);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async openAsync(targetPath: string, flags: string | number): Promise<number> {
    try {
      return await new Promise<number>((resolve, reject) => {
        fs.open(targetPath, flags, (err, fd) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(fd);
        });
      });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async readAsync<TBuffer extends NodeJS.ArrayBufferView>(fd: number,
                                                                        buffer: TBuffer,
                                                                        offset: number,
                                                                        length: number,
                                                                        position: number | null): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        fs.read(fd, buffer, offset, length, position, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    catch (err) {
      throw new SdError(err);
    }
  }

  public static close(fd: number): void {
    try {
      fs.closeSync(fd);
    }
    catch (err) {
      throw new SdError(err);
    }
  }

  public static async closeAsync(fd: number): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        fs.close(fd, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    catch (err) {
      throw new SdError(err);
    }
  }

  public static write(fd: number, buffer: NodeJS.ArrayBufferView, offset?: number | null, length?: number | null, position?: number | null): void {
    try {
      fs.writeSync(fd, buffer, offset, length, position);
    }
    catch (err) {
      throw new SdError(err);
    }
  }

  public static async writeAsync(fd: number, buffer: NodeJS.ArrayBufferView, offset?: number | null, length?: number | null, position?: number | null): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        fs.write(fd, buffer, offset, length, position, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
    catch (err) {
      throw new SdError(err);
    }
  }

  public static createReadStream(sourcePath: string): fs.ReadStream {
    try {
      return fs.createReadStream(sourcePath);
    }
    catch (err) {
      throw new SdError(err, sourcePath);
    }
  }


  public static createWriteStream(targetPath: string): fs.WriteStream {
    try {
      return fs.createWriteStream(targetPath);
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async isDirectoryAsync(targetPath: string): Promise<boolean> {
    return (await FsUtils.lstatAsync(targetPath)).isDirectory();
  }
}
