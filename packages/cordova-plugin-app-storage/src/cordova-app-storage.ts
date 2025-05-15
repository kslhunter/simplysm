import * as path from "path";
import { JsonConvert, SdError } from "@simplysm/sd-core-common";
import { Device } from "@awesome-cordova-plugins/device";
import { File } from "@awesome-cordova-plugins/file";
import semver from "semver";

// "@awesome-cordova-plugins/file"의 "FileError"는 .d.ts에는 있으나 .js가 실제로 export하지 않음.

export class CordovaAppStorage {
  static raw = File;

  private _rootDirectoryUrl: string;

  constructor(rootDirectory?: string) {
    this._rootDirectoryUrl = rootDirectory ?? File.applicationStorageDirectory;
  }

  async readJsonAsync(filePath: string): Promise<any> {
    const fileStr = await this.readFileAsync(filePath);
    return JsonConvert.parse(fileStr);
  }

  async readFileBufferAsync(filePath: string): Promise<Buffer> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    return Buffer.from(await File.readAsArrayBuffer(dirUrl, fileName));
  }

  async readFileAsync(filePath: string): Promise<string> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    return await File.readAsText(dirUrl, fileName);
  }

  async writeJsonAsync(filePath: string, data: any) {
    await this.writeAsync(filePath, JsonConvert.stringify(data));
  }

  async writeAsync(filePath: string, data: Blob | string) {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    await this._mkdirsAsync(path.dirname(filePath));

    await File.writeFile(dirUrl, fileName, data, { replace: true });
  }

  // Android SDK >= 33 에 External접근 시 권한 오류발생 (다른폴더접근시에도 발생하는진 모르겠음)
  async readdirAsync(dirPath: string) {
    if (Device.sdkVersion == null || semver.gte("33", Device.sdkVersion)) {
      throw new Error(`문제발생 소지가 있음. 프레임워크 개발자의 테스트가 필요함. (SDK: ${Device.sdkVersion})`);
    }

    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    const entries = await File.listDir(dirUrl, dirName);
    return entries.map((item) => item.name);
  }

  // Android SDK >= 33 에 External접근 시 권한 오류발생 (다른폴더접근시에도 발생하는진 모르겠음)
  /*async exists(targetPath: string) {
    const fullUrl = this.getFullUrl(targetPath);
    const dirUrl = path.dirname(fullUrl);
    const dirOrFileName = path.basename(fullUrl);

    try {
      const list = await File.listDir(path.dirname(dirUrl) + "/", path.basename(dirUrl));
      return list.some((item) => item.name === dirOrFileName);
    }
    catch (err) {
      throw new SdError(err, "CordovaAppStorage Error: exists");
    }
  }*/

  async existsAsync(targetPath: string): Promise<boolean> {
    const fullUrl = this.getFullUrl(targetPath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    try {
      await File.readAsText(dirUrl, fileName);
      return true;
    }
    catch (err) {
      // 존재하지 않음
      if ("code" in err && err.code === 1 /*NOT_FOUND_ERR*/) {
        return false;
      }

      // 디렉터리인 경우 TYPE_MISMATCH_ERR 발생 → 존재는 함
      if ("code" in err && err.code === 11 /*TYPE_MISMATCH_ERR*/) {
        return true;
      }

      // 그 외 예외는 propagate
      throw new SdError(err, "CordovaAppStorage Error: existsAsync");
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
    return this._rootDirectoryUrl + (targetPath.startsWith("/")
      ? targetPath.substring(1)
      : targetPath);
  }

  getFullPath(targetPath: string) {
    return "/" + this.getFullUrl(targetPath).replace(/^file:\/*/, "");
  }

  private async _mkdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);
    const dirUrl = path.dirname(fullUrl);
    const dirName = path.basename(fullUrl);

    await File.createDir(dirUrl, dirName, true);
  }

  private async _mkdirsAsync(dirPath: string) {
    const dirs = dirPath.replace(/^\//, "").replace(/\/$/, "").split("/");

    let currDir = "";

    for (const dir of dirs) {
      currDir += dir;
      await this._mkdirAsync(currDir);
      currDir += "/";
    }
  }
}
