import * as fs from "fs";
import { IStorage } from "../common/IStorage";
import { IFtpConnectionConfig } from "./IFtpConnectionConfig";
import JSFtp from "jsftp";
import { Logger } from "@simplysm/sd-core-node";

export class FtpStorage implements IStorage {
  private readonly _logger = Logger.get(["simplysm", "storage", "FtpStorage"]);
  private _ftp?: JSFtp;

  public async connectAsync(connectionConfig: IFtpConnectionConfig): Promise<void> {
    this._ftp = new JSFtp({
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.user,
      pass: connectionConfig.password
    });
    this._ftp.keepAlive(30000);

    await new Promise<void>((resolve, reject) => {
      if (this._ftp === undefined) {
        throw new Error("FTP 서버에 연결되어있지 않습니다.");
      }

      this._ftp.raw("OPTS UTF8 ON", err => {
        if (err != null) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async mkdirAsync(storageDirPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (this._ftp === undefined) {
        throw new Error("FTP 서버에 연결되어있지 않습니다.");
      }

      this._ftp.raw("MKD", storageDirPath, (err: Error) => {
        if (err != null && err["code"] !== 550) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    const buffer = typeof localPathOrBuffer === "string" ?
      fs.readFileSync(localPathOrBuffer) :
      localPathOrBuffer;

    await new Promise<void>((resolve, reject) => {
      if (this._ftp === undefined) {
        throw new Error("FTP 서버에 연결되어있지 않습니다.");
      }

      this._ftp.put(buffer, storageFilePath, err => {
        if (err != null) {
          if (err["code"] === 550) {
            this._logger.warn(`${storageFilePath}: ${err.message}`);
          }
          else {
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
      if (this._ftp === undefined) {
        throw new Error("FTP 서버에 연결되어있지 않습니다.");
      }

      this._ftp.destroy();
      resolve();

      /*this._ftp.raw("quit", (err: Error) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });*/
    });
  }
}
