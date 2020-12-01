import * as ftp from "basic-ftp";
import { ISdFtpConnectionConfig, ISdStorage } from "./commons";
import { Readable } from "stream";

export class SdFtpStorage implements ISdStorage {
  private _ftp?: ftp.Client;

  public async connectAsync(connectionConfig: ISdFtpConnectionConfig): Promise<void> {
    this._ftp = new ftp.Client();
    await this._ftp.access({
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.username,
      password: connectionConfig.password
    });
  }

  public async mkdirAsync(storageDirPath: string): Promise<void> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this._ftp.ensureDir(storageDirPath);
  }

  public async renameAsync(fromPath: string, toPath: string): Promise<void> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this._ftp.rename(fromPath, toPath);
  }

  public async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }

    let param: string | Readable;
    if (typeof localPathOrBuffer === "string") {
      param = localPathOrBuffer;
    }
    else {
      param = new Readable();
      param.push(localPathOrBuffer);
      param.push(null);
    }

    await this._ftp.uploadFrom(param, storageFilePath);
  }

  public async uploadDirAsync(fromPath: string, toPath: string): Promise<void> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this._ftp.uploadFromDir(fromPath, toPath);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async closeAsync(): Promise<void> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    this._ftp.close();
  }
}
