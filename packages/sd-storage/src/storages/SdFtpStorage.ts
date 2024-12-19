import ftp from "basic-ftp";
import {type ISdStorage, type ISdStorageConnectionConfig} from "../commons";
import {PassThrough, Readable} from "stream";

export class SdFtpStorage implements ISdStorage {
  private _ftp?: ftp.Client;

  public constructor(private readonly _secure: boolean) {
  }

  public async connectAsync(connectionConfig: ISdStorageConnectionConfig): Promise<void> {
    this._ftp = new ftp.Client();
    await this._ftp.access({
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.user,
      password: connectionConfig.pass,
      secure: this._secure
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

  public async readdirAsync(dirPath: string): Promise<{ name: string; isFile: boolean }[]> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    const fileInfos = await this._ftp.list(dirPath);
    return fileInfos.map((item) => ({name: item.name, isFile: item.isFile}));
  }

  public async readFileAsync(filePath: string): Promise<Buffer> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }

    let result = Buffer.from([]);
    const writable = new PassThrough();
    writable.on("data", (chunk) => {
      result = Buffer.concat([result, chunk]);
    });
    await this._ftp.downloadTo(writable, filePath);
    return result;
  }

  public async removeAsync(filePath: string): Promise<void> {
    if (this._ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this._ftp.remove(filePath);
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
