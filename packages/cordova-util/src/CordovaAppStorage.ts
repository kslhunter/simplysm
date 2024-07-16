/// <reference types="cordova-plugin-file"/>

import * as path from "path";
import {JsonConvert, StringUtil} from "@simplysm/sd-core-common";
import {fileURLToPath, pathToFileURL} from "url";

export class CordovaAppStorage {
  #rootDirectoryUrl: string;

  constructor(rootDirectory?: string) {
    this.#rootDirectoryUrl = rootDirectory ?? window.cordova.file.applicationStorageDirectory;
  }

  async readJsonAsync(filePath: string): Promise<any> {
    const fileStr = await this.readFileAsync(filePath);
    return StringUtil.isNullOrEmpty(fileStr) ? undefined : JsonConvert.parse(fileStr);
  }

  async readFileBufferAsync(filePath: string): Promise<Buffer> {
    const file = await this.readFileObjectAsync(filePath);

    return await new Promise<Buffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (ev) => {
        const arrayBuffer = ev.target!.result as ArrayBuffer;
        resolve(Buffer.from(arrayBuffer));
      };
      reader.onerror = (ev) => {
        reject(reader.error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async readFileAsync(filePath: string): Promise<string> {
    const file = await this.readFileObjectAsync(filePath);

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = (ev) => {
        resolve(ev.target!.result as string);
      };
      reader.onerror = (ev) => {
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  }

  async readFileObjectAsync(filePath: string): Promise<File> {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    return await new Promise<File>((resolve, reject) => {
      window.resolveLocalFileSystemURL(dirUrl, entry => {
        const appDirEntry = entry as DirectoryEntry;

        appDirEntry.getFile(fileName, {create: true}, (fileEntry) => {
          fileEntry.file(thisFile => {
            resolve(thisFile);
          }, (err) => {
            reject(err);
          });
        }, (err) => {
          reject(err);
        });
      }, err => {
        reject(err);
      });
    });
  }

  async writeJsonAsync(filePath: string, data: any) {
    await this.writeAsync(filePath, JsonConvert.stringify(data));
  }

  async writeAsync(filePath: string, data: any) {
    const fullUrl = this.getFullUrl(filePath);
    const dirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    await this.#mkdirsAsync(path.dirname(filePath));

    await new Promise<void>((resolve, reject) => {
      window.resolveLocalFileSystemURL(dirUrl, entry => {
        const appDirEntry = entry as DirectoryEntry;

        appDirEntry.getFile(fileName, {create: true}, (fileEntry) => {
          fileEntry.createWriter(writer => {
            writer.write(data);
            resolve();
          }, (err) => {
            reject(err);
          });
        }, (err) => {
          reject(err);
        });
      }, err => {
        reject(err);
      });
    });
  }

  async readdirAsync(dirPath: string) {
    const fullUrl = this.getFullUrl(dirPath);

    return await new Promise<string[]>((resolve, reject) => {
      window.resolveLocalFileSystemURL(fullUrl, entry => {
        const appDirEntry = entry as DirectoryEntry;
        const reader = appDirEntry.createReader();

        reader.readEntries((entries) => {
          resolve(entries.map(item => item.name));
        }, (err) => {
          reject(err);
        });
      }, err => {
        reject(err);
      });
    });
  }

  async removeAsync(dirOrFilePath: string) {
    const fullUrl = this.getFullUrl(dirOrFilePath);

    return await new Promise<void>((resolve, reject) => {
      window.resolveLocalFileSystemURL(fullUrl, entry => {
        if (entry.isDirectory) {
          (entry as DirectoryEntry).removeRecursively(() => {
            resolve();
          }, err => {
            reject(err);
          });
        }
        else {
          (entry as FileEntry).remove(() => {
            resolve();
          }, err => {
            reject(err);
          });
        }
      }, err => {
        reject(err);
      });
    });
  }

  getFullUrl(targetPath: string) {
    return pathToFileURL(path.join(fileURLToPath(this.#rootDirectoryUrl), targetPath.replace(/^\//, ""))).toString();
  }

  async #mkdirsAsync(targetDirPath: string) {
    const dirs = targetDirPath.replace(/^\//, "").replace(/\/$/, "").split("/");

    let currDir = "";

    for (const dir of dirs) {
      currDir += dir;

      await new Promise<void>((resolve, reject) => {
        window.resolveLocalFileSystemURL(this.#rootDirectoryUrl, entry => {
          const appDirEntry = entry as DirectoryEntry;
          appDirEntry.getDirectory(currDir, {create: true}, () => {
            resolve();
          }, err => {
            reject(err);
          });
        }, err => {
          reject(err);
        });
      });

      currDir += "/";
    }
  }
}