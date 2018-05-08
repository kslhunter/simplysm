import * as fs from "fs";
import {Exception, Logger} from "@simplism/sd-core";
import {IStorage} from "../common/IStorage";
import {IFtpConnectionConfig} from "./IFtpConnectionConfig";
import * as JSFtp from "jsftp";

export class FtpStorage implements IStorage {
  private readonly _logger = new Logger("@simplism/sd-storage", "FtpStorage");
  private _ftp: any;

  public async connect(connectionConfig: IFtpConnectionConfig): Promise<void> {
    this._ftp = new JSFtp({
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.user,
      pass: connectionConfig.password
    });

    await new Promise<void>((resolve, reject) => {
      this._ftp.raw("OPTS UTF8 ON", (err: Error) => {
        if (err) {
          reject(new Exception(`${err.message}`, {code: err["code"]}));
          return;
        }
        resolve();
      });
    });
  }

  public async mkdir(storageDirPath: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._ftp.raw("MKD", storageDirPath, (err: Error) => {
        if (err && err["code"] !== 550) {
          reject(new Exception(`[${err["code"]}] ${err.message}`));
          return;
        }
        resolve();
      });
    });
  }

  public async put(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    const buffer = typeof localPathOrBuffer === "string"
      ? fs.readFileSync(localPathOrBuffer)
      : localPathOrBuffer;

    await new Promise<void>((resolve, reject) => {
      this._ftp.put(buffer, storageFilePath, (err: Error) => {
        if (err) {
          if (err["code"] === 550) {
            this._logger.warn(`${storageFilePath}: ${err.message}`);
          }
          else {
            reject(new Exception(`[${err["code"]}] ${err.message}`));
            return;
          }
        }
        resolve();
      });
    });
  }

  public async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._ftp.raw("quit", (err: Error) => {
        if (err) {
          reject(new Exception(`[${err["code"]}] ${err.message}`));
          return;
        }
        resolve();
      });
    });
  }
}
