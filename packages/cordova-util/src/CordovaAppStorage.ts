/// <reference types="cordova-plugin-file"/>

import * as path from "path";
import {JsonConvert, SdError, StringUtil} from "@simplysm/sd-core-common";
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
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(Buffer.from(arrayBuffer));
      };
      reader.onerror = () => {
        if (reader.error instanceof FileError) {
          reject(new SdError(`파일 읽기 오류: ${this.#convertError(reader.error)}`));
        }
        else {
          reject(reader.error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async readFileAsync(filePath: string): Promise<string> {
    const file = await this.readFileObjectAsync(filePath);

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        resolve(ev.target!.result as string);
      };
      reader.onerror = () => {
        if (reader.error instanceof FileError) {
          reject(new SdError(`파일 읽기 오류: ${this.#convertError(reader.error)}`));
        }
        else {
          reject(reader.error);
        }
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

  async writeAsync(filePath: string, data: Blob | string | ArrayBuffer) {
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
        try {
          const appDirEntry = entry as DirectoryEntry;
          const reader = appDirEntry.createReader();

          reader.readEntries((entries) => {
            resolve(entries.map(item => item.name));
          }, (err) => {
            reject(err);
          });
        }
        catch (err) {
          reject(err);
        }
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

  getFullPath(targetPath: string) {
    return path.join(fileURLToPath(this.#rootDirectoryUrl), targetPath.replace(/^\//, ""));
  }

  getFullUrl(targetPath: string) {
    return pathToFileURL(this.getFullPath(targetPath)).toString();
  }

  #convertError(err: FileError) {
    switch (err.code) {
      case 1:
        return "NOT_FOUND_ERR";
      case 2:
        return "SECURITY_ERR";
      case 3:
        return "ABORT_ERR";
      case 4:
        return "NOT_READABLE_ERR";
      case 5:
        return "ENCODING_ERR";
      case 6:
        return "NO_MODIFICATION_ALLOWED_ERR";
      case 7:
        return "INVALID_STATE_ERR";
      case 8:
        return "SYNTAX_ERR";
      case 9:
        return "INVALID_MODIFICATION_ERR";
      case 10:
        return "QUOTA_EXCEEDED_ERR";
      case 11:
        return "TYPE_MISMATCH_ERR";
      case 12:
        return "PATH_EXISTS_ERR";
      default:
        return "UNKNOWN_ERR";
    }
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