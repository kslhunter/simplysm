import * as path from "path";
import * as glob from "glob";
import * as os from "os";
import * as fs from "fs";
import { JsonConvert, NeverEntryError, ObjectUtil, SdError, Uuid, Wait } from "@simplysm/sd-core-common";
import * as crypto from "crypto";
import * as chokidar from "chokidar";
import { PathUtil } from "./PathUtil";

export class FsUtil {
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
    return await new Promise<string[]>((resolve, reject) => {
      glob(pattern, options ?? {}, (err, matches) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(matches.map((item) => path.resolve(item)));
      });
    });
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
      await fs.promises.rmdir(targetPath, { recursive: true });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static remove(targetPath: string): void {
    try {
      fs.rmdirSync(targetPath, { recursive: true });
    }
    catch (err) {
      throw new SdError(err, targetPath);
    }
  }

  public static async copyAsync(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): Promise<void> {
    if (!FsUtil.exists(sourcePath)) {
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
      await FsUtil.mkdirsAsync(targetPath);

      const children = await FsUtil.globAsync(path.resolve(sourcePath, "*"));

      await children.parallelAsync(async (childPath) => {
        if (filter && !filter(childPath)) {
          return;
        }

        const relativeChildPath = path.relative(sourcePath, childPath);
        const childTargetPath = path.resolve(targetPath, relativeChildPath);
        await FsUtil.copyAsync(childPath, childTargetPath);
      });
    }
    else {
      await FsUtil.mkdirsAsync(path.resolve(targetPath, ".."));

      try {
        await fs.promises.copyFile(sourcePath, targetPath);
      }
      catch (err) {
        throw new SdError(err, targetPath);
      }
    }
  }

  public static copy(sourcePath: string, targetPath: string, filter?: (subPath: string) => boolean): void {
    if (!FsUtil.exists(sourcePath)) {
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

      try {
        fs.copyFileSync(sourcePath, targetPath);
      }
      catch (err) {
        throw new SdError(err, targetPath);
      }
    }
  }

  public static async mkdirsAsync(targetPath: string): Promise<void> {
    if (FsUtil.exists(targetPath)) return;

    try {
      await new Promise<void>((resolve, reject) => {
        fs.mkdir(targetPath, { recursive: true }, (err) => {
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

  public static async writeJsonAsync(targetPath: string, data: any, options?: { replacer?: (this: any, key: string | undefined, value: any) => any; space?: string | number }): Promise<void> {
    const json = JsonConvert.stringify(data, options);
    await FsUtil.writeFileAsync(targetPath, json);
  }

  public static async writeFileAsync(targetPath: string, data: any): Promise<void> {
    await FsUtil.mkdirsAsync(path.dirname(targetPath));

    try {
      await new Promise<void>((resolve, reject) => {
        if (typeof data === "string") {
          fs.writeFile(targetPath, data, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }
        else {
          fs.writeFile(targetPath, data, (err) => {
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
    FsUtil.mkdirs(path.resolve(targetPath, ".."));
    try {
      if (typeof data === "string") {
        fs.writeFileSync(targetPath, data);
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
    if (!FsUtil.exists(targetPath)) {
      throw new SdError(targetPath + "파일을 찾을 수 없습니다.");
    }

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
    const contents = FsUtil.readFile(targetPath);
    return JsonConvert.parse(contents);
  }

  public static async readJsonAsync(targetPath: string): Promise<any> {
    const contents = await FsUtil.readFileAsync(targetPath);
    try {
      return JsonConvert.parse(contents);
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
        fs.read(fd, buffer, offset, length, position, (err) => {
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
        fs.close(fd, (err) => {
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
        fs.write(fd, buffer, offset, length, position, (err) => {
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
    return (await FsUtil.lstatAsync(targetPath)).isDirectory();
  }

  public static isDirectory(targetPath: string): boolean {
    return FsUtil.lstat(targetPath).isDirectory();
  }

  public static isChildPath(childPath: string, parentPath: string): boolean {
    const relativePath = path.relative(parentPath, childPath);
    return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  }

  public static async clearEmptyDirectoryAsync(dirPath: string): Promise<void> {
    if (!FsUtil.exists(dirPath)) return;

    const childNames = await FsUtil.readdirAsync(dirPath);
    for (const childName of childNames) {
      const childPath = path.resolve(dirPath, childName);
      if (await FsUtil.isDirectoryAsync(childPath)) {
        await this.clearEmptyDirectoryAsync(childPath);
      }
    }

    if ((await FsUtil.readdirAsync(dirPath)).length === 0) {
      await FsUtil.removeAsync(dirPath);
    }
  }

  public static async watchAsync(paths: string | string[],
                                 callback: (changedInfos: IFileChangeInfo[]) => void | Promise<void>,
                                 errorCallback: (err: Error) => void,
                                 options?: { ignoreDirectory?: boolean; aggregateTimeout?: number; useFirstRun?: boolean }): Promise<chokidar.FSWatcher> {
    let watchTimeout: NodeJS.Timeout;
    let isProcessing = false;
    let lastProcUuid = Uuid.new();

    let changeInfosQueue: IFileChangeInfo[] = [];

    return await new Promise<chokidar.FSWatcher>((resolve, reject) => {
      const watchPaths = (typeof paths === "string" ? [paths] : paths).map((item) => PathUtil.posix(item));
      const watcher = chokidar.watch(watchPaths, { ignoreInitial: !options?.useFirstRun });
      watcher.on("all", (event, filePath, fileStats) => {
        // 디렉토리 무시
        if (options?.ignoreDirectory && fileStats?.isDirectory()) {
          return;
        }

        try {
          const eventType: "add" | "change" | "unlink" =
            (event === "add" || event === "addDir") ? "add" :
              event === "unlink" || event === "unlinkDir" ? "unlink" :
                "change";

          changeInfosQueue.push({ type: eventType, filePath });

          const currProcUuid = Uuid.new();
          lastProcUuid = currProcUuid;

          clearTimeout(watchTimeout);
          watchTimeout = setTimeout(
            async () => {
              await Wait.true(() => !isProcessing);
              if (lastProcUuid !== currProcUuid) return;
              isProcessing = true;

              try {
                const changeInfos = ObjectUtil.clone(changeInfosQueue.distinct());
                changeInfosQueue = [];

                // 같은 파일이 있으면 마지막 것만
                const realChangeInfos: IFileChangeInfo[] = [];
                for (let i = 0; i < changeInfos.length; i++) {
                  if (changeInfos.slice(i + 1).some((item) => item.filePath === changeInfos[i].filePath)) continue;
                  realChangeInfos.push(changeInfos[i]);
                }

                await callback(realChangeInfos);
              }
              catch (err) {
                if (!(err instanceof Error)) {
                  throw new NeverEntryError();
                }

                errorCallback(err);
              }

              isProcessing = false;
            },
            options?.aggregateTimeout ?? 100
          );
        }
        catch (err) {
          if (!(err instanceof Error)) {
            throw new NeverEntryError();
          }

          err.message = `[${event}${filePath}] ${err.message}`;
          err.stack = `[${event}${filePath}]${err.stack !== undefined ? " " + err.stack : ""}`;
          errorCallback(err);
        }
      });

      watcher.on("ready", () => {
        resolve(watcher);
      });

      watcher.on("error", (err) => {
        reject(err);
      });
    });
  }
}

export interface IFileChangeInfo {
  type: "add" | "change" | "unlink";
  filePath: string;
}
