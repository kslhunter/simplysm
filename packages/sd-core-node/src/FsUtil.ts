import * as crypto from "crypto";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";

export class FsUtil {
  public static async getMd5Async(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash("md5").setEncoding("hex");
      fs.createReadStream(filePath)
        .on("error", (err) => {
          reject(err);
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
          resolve(matches);
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
          resolve(matches);
        });
      });
    }
  }

  public static glob(pattern: string, options?: glob.IOptions): string[] {
    return glob.sync(pattern, options);
  }

  public static async readdirAsync(targetPath: string): Promise<string[]> {
    return await fs.promises.readdir(targetPath);
  }

  public static readdir(targetPath: string): string[] {
    return fs.readdirSync(targetPath);
  }

  public static exists(targetPath: string): boolean {
    return fs.existsSync(targetPath);
  }

  public static async removeAsync(targetPath: string): Promise<void> {
    if (!FsUtil.exists(targetPath)) {
      return;
    }

    const lstat = await fs.promises.lstat(targetPath);
    if (lstat.isDirectory()) {
      try {
        await fs.promises.rmdir(targetPath, {recursive: true});
      }
      catch (err) {
        throw new Error(err.message + ": " + targetPath);
      }
    }
    else {
      try {
        await fs.promises.unlink(targetPath);
      }
      catch (err) {
        throw new Error(err.message + ": " + targetPath);
      }
    }
  }

  public static remove(targetPath: string): void {
    if (!FsUtil.exists(targetPath)) {
      return;
    }

    const lstat = fs.lstatSync(targetPath);
    if (lstat.isDirectory()) {
      try {
        fs.rmdirSync(targetPath, {recursive: true});
      }
      catch (err) {
        throw new Error(err.message + ": " + targetPath);
      }
    }
    else {
      try {
        fs.unlinkSync(targetPath);
      }
      catch (err) {
        throw new Error(err.message + ": " + targetPath);
      }
    }
  }

  public static async copyAsync(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): Promise<void> {
    if (!FsUtil.exists(sourcePath)) {
      return;
    }

    const lstat = await fs.promises.lstat(sourcePath);
    if (lstat.isDirectory()) {
      await FsUtil.mkdirsAsync(targetPath);

      const children = await FsUtil.globAsync(path.resolve(sourcePath, "*"));

      await Promise.all(children.map(async (childPath) => {
        if (filter && !filter(childPath)) {
          return;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        await FsUtil.copyAsync(childPath, childTargetPath);
      }));
    }
    else {
      await FsUtil.mkdirsAsync(path.resolve(targetPath, ".."));

      await fs.promises.copyFile(sourcePath, targetPath);
    }
  }

  public static copy(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): void {
    if (!FsUtil.exists(sourcePath)) {
      return;
    }

    const lstat = fs.lstatSync(sourcePath);
    if (lstat.isDirectory()) {
      FsUtil.mkdirs(targetPath);

      const children = FsUtil.glob(path.resolve(sourcePath, "*"));

      for (const childPath of children) {
        if (filter && !filter(childPath)) {
          return;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        FsUtil.copy(childPath, childTargetPath);
      }
    }
    else {
      FsUtil.mkdirs(path.resolve(targetPath, ".."));

      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  public static async mkdirsAsync(targetPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(targetPath, {recursive: true});
    }
    catch (err) {
      throw new Error(err.message + ": " + targetPath);
    }
  }

  public static mkdirs(targetPath: string): void {
    fs.mkdirSync(targetPath, {recursive: true});
  }

  public static async writeJsonAsync(targetPath: string, data: any, options?: { replacer?: (this: any, key: string, value: any) => any; space?: string | number }): Promise<void> {
    const json = JSON.stringify(data, options?.replacer, options?.space);
    await FsUtil.writeFileAsync(targetPath, json);
  }

  public static async writeFileAsync(targetPath: string, data: any): Promise<void> {
    await FsUtil.mkdirsAsync(path.resolve(targetPath, ".."));

    try {
      await fs.promises.writeFile(targetPath, data);
    }
    catch (err) {
      throw new Error(err.message + ": " + targetPath);
    }
  }

  public static writeFile(targetPath: string, data: any): void {
    FsUtil.mkdirs(path.resolve(targetPath, ".."));
    fs.writeFileSync(targetPath, data);
  }

  public static async readFileAsync(targetPath: string): Promise<string> {
    return await fs.promises.readFile(targetPath, "utf-8");
  }

  public static async readJsonAsync(targetPath: string): Promise<any> {
    const contents = await FsUtil.readFileAsync(targetPath);
    return JSON.parse(contents);
  }

  public static lstat(targetPath: string): fs.Stats {
    return fs.lstatSync(targetPath);
  }

  public static async lstatAsync(targetPath: string): Promise<fs.Stats> {
    return await fs.promises.lstat(targetPath);
  }

  public static appendFile(targetPath: string, data: any): void {
    fs.appendFileSync(targetPath, data, "utf8");
  }

  public static open(targetPath: string, flags: string | number): number {
    return fs.openSync(targetPath, flags);
  }

  public static close(fd: number): void {
    fs.closeSync(fd);
  }

  public static write(fd: number, buffer: NodeJS.ArrayBufferView, offset?: number | null, length?: number | null, position?: number | null): void {
    fs.writeSync(fd, buffer, offset, length, position);
  }

  public static createReadStream(targetPath: string): fs.ReadStream {
    return fs.createReadStream(targetPath);
  }
}
