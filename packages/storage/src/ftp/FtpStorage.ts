import * as fs from "fs";
import {IStorage} from "../common/IStorage";
import {IFtpConnectionConfig} from "./IFtpConnectionConfig";
import * as JSFtp from "jsftp";
import {Logger} from "@simplism/core";

export class FtpStorage implements IStorage {
  private readonly _logger = new Logger("@simplism/storage");
  private _ftp: any;

  public async connectAsync(connectionConfig: IFtpConnectionConfig): Promise<void> {
    this._ftp = new JSFtp.default({
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.user,
      pass: connectionConfig.password
    });

    await new Promise<void>((resolve, reject) => {
      this._ftp.raw("OPTS UTF8 ON", (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async mkdirAsync(storageDirPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._ftp.raw("MKD", storageDirPath, (err: Error) => {
        if (err && err["code"] !== 550) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    const buffer = typeof localPathOrBuffer === "string"
      ? fs.readFileSync(localPathOrBuffer)
      : localPathOrBuffer;

    await new Promise<void>((resolve, reject) => {
      this._ftp.put(buffer, storageFilePath, (err: Error) => {
        if (err) {
          if (err["code"] === 550) {
            this._logger.warn(`${storageFilePath}: ${err.message}`);
          } else {
            reject(err);
            return;
          }
        }
        resolve();
      });
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._ftp.raw("quit", (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
