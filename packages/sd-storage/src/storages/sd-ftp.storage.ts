import ftp from "basic-ftp";
import {ISdStorage, ISdStorageConnectionConfig} from "../interfaces";
import {PassThrough, Readable} from "stream";

export class SdFtpStorage implements ISdStorage {
  #ftp?: ftp.Client;

  constructor(private readonly _secure: boolean) {
  }

  async connectAsync(connectionConfig: ISdStorageConnectionConfig): Promise<void> {
    this.#ftp = new ftp.Client();
    await this.#ftp.access({
      host: connectionConfig.host,
      port: connectionConfig.port,
      user: connectionConfig.user,
      password: connectionConfig.pass,
      secure: this._secure
    });
  }

  async mkdirAsync(storageDirPath: string): Promise<void> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this.#ftp.ensureDir(storageDirPath);
  }

  async renameAsync(fromPath: string, toPath: string): Promise<void> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this.#ftp.rename(fromPath, toPath);
  }

  async readdirAsync(dirPath: string): Promise<{ name: string; isFile: boolean }[]> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    const fileInfos = await this.#ftp.list(dirPath);
    return fileInfos.map((item) => ({name: item.name, isFile: item.isFile}));
  }

  async readFileAsync(filePath: string): Promise<Buffer> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }

    let result = Buffer.from([]);
    const writable = new PassThrough();
    writable.on("data", (chunk) => {
      result = Buffer.concat([result, chunk]);
    });
    await this.#ftp.downloadTo(writable, filePath);
    return result;
  }

  async removeAsync(filePath: string): Promise<void> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this.#ftp.remove(filePath);
  }

  async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    if (this.#ftp === undefined) {
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

    await this.#ftp.uploadFrom(param, storageFilePath);
  }

  async uploadDirAsync(fromPath: string, toPath: string): Promise<void> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    await this.#ftp.uploadFromDir(fromPath, toPath);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async closeAsync(): Promise<void> {
    if (this.#ftp === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    this.#ftp.close();
  }
}
