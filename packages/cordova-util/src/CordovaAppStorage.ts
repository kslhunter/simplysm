/// <reference types="cordova-plugin-file"/>

import * as path from "path";
import {JsonConvert} from "@simplysm/sd-core-common";

export abstract class CordovaAppStorage {
  static async readJsonAsync(filePath: string): Promise<any> {
    return JsonConvert.parse(await this.readFileAsync(filePath));
  }

  static async readFileAsync(filePath: string): Promise<string> {
    return await (await this.readFileObjectAsync(filePath)).text();
  }

  static async readFileBufferAsync(filePath: string): Promise<Buffer> {
    return Buffer.from(await (await this.readFileObjectAsync(filePath)).arrayBuffer());
  }

  static async readFileObjectAsync(filePath: string): Promise<File> {
    const fullUrl = this.getFullUrl(filePath);
    const relDirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    return await new Promise<File>((resolve, reject) => {
      window.resolveLocalFileSystemURL(relDirUrl, entry => {
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
      });
    });
  }

  static async writeJsonAsync(filePath: string, data: any) {
    await this.writeAsync(filePath, JsonConvert.stringify(data));
  }

  static async writeAsync(filePath: string, data: any) {
    const fullUrl = this.getFullUrl(filePath);
    const relDirUrl = path.dirname(fullUrl);
    const fileName = path.basename(fullUrl);

    await new Promise<void>((resolve, reject) => {
      window.resolveLocalFileSystemURL(relDirUrl, entry => {
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
      });
    });
  }

  static getFullUrl(targetPath: string) {
    return path.join(window.cordova.file.applicationStorageDirectory, targetPath.replace(/^[\\\/]/, ""));
  }
}