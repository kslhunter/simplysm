import * as path from "path";
import { JsonConvert, StringUtil } from "@simplysm/sd-core-common";
import { File } from "@awesome-cordova-plugins/file";

export class CordovaAppStorage {
  // static raw = File;

  #rootDirectoryUrl: string;

  constructor(rootDirectory?: string) {
    this.#rootDirectoryUrl = rootDirectory ?? File.applicationStorageDirectory;
  }

  async readJsonAsync(filePath: string): Promise<any> {
    const fileStr = await this.readFileAsync(filePath);
    return StringUtil.isNullOrEmpty(fileStr) ? undefined : JsonConvert.parse(fileStr);
  }

  async readFileBufferAsync(filePath: string): Promise<Buffer | undefined> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    if (await this.exists(fullUrl)) {
      return Buffer.from(await File.readAsArrayBuffer(dirUrl, fileName));
    }
    else {
      return undefined;
    }
  }

  async readFileAsync(filePath: string): Promise<string | undefined> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    if (await this.exists(fullUrl)) {
      return await File.readAsText(dirUrl, fileName);
    }
    else {
      return undefined;
    }
  }

  async writeJsonAsync(filePath: string, data: any) {
    await this.writeAsync(filePath, JsonConvert.stringify(data));
  }

  async writeAsync(filePath: string, data: Blob | string | ArrayBuffer) {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    await this.#mkdirsAsync(path.dirname(filePath));

    await File.writeFile(dirUrl, fileName, data, { replace: true });
  }

  async readdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    const entries = await File.listDir(dirUrl, dirName);
    return entries.map((item) => item.name);
  }

  async exists(targetPath: string) {
    const fullUrl = this.getFullUrl(targetPath);
    const dirUrl = path.dirname(fullUrl);
    const dirOrFileName = path.basename(fullUrl);

    try {
      const list = await File.listDir(path.dirname(dirUrl), path.basename(dirUrl));
      return list.some((item) => item.name === dirOrFileName);
    }
    catch {
      return false;
    }
  }

  async removeAsync(dirOrFilePath: string) {
    const fullUrl = this.getFullUrl(dirOrFilePath);
    const dirUrl = path.dirname(fullUrl);
    const dirOrFileName = path.basename(fullUrl);

    const list = await File.listDir(path.dirname(dirUrl), path.basename(dirUrl));
    const single = list.single((item) => item.name === dirOrFileName);
    if (!single) return;

    if (single.isDirectory) {
      await File.removeRecursively(dirUrl, dirOrFileName);
    }
    else {
      await File.removeFile(dirUrl, dirOrFileName);
    }
  }

  getFullUrl(targetPath: string) {
    return path.join(this.#rootDirectoryUrl, targetPath);
  }

  async #mkdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    await File.createDir(dirUrl, dirName, true);
  }

  async #mkdirsAsync(dirPath: string) {
    const dirs = dirPath.replace(/^\//, "").replace(/\/$/, "").split("/");

    let currDir = "";

    for (const dir of dirs) {
      currDir += dir;
      await this.#mkdirAsync(currDir);
      currDir += "/";
    }
  }
}
