import ftp from "basic-ftp";
import { PassThrough, Readable } from "stream";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

export class FtpStorageClient implements Storage {
  private _client: ftp.Client | undefined;

  constructor(private readonly _secure: boolean = false) {}

  async connect(config: StorageConnConfig): Promise<void> {
    this._client = new ftp.Client();
    await this._client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.pass,
      secure: this._secure,
    });
  }

  private _requireClient(): ftp.Client {
    if (this._client === undefined) {
      throw new Error("FTP 서버에 연결되어있지 않습니다.");
    }
    return this._client;
  }

  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().ensureDir(dirPath);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  async readdir(dirPath: string): Promise<FileInfo[]> {
    const fileInfos = await this._requireClient().list(dirPath);
    return fileInfos.map((item) => ({ name: item.name, isFile: item.isFile }));
  }

  async readFile(filePath: string): Promise<Buffer> {
    const client = this._requireClient();
    const chunks: Buffer[] = [];
    const writable = new PassThrough();
    writable.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    await client.downloadTo(writable, filePath);
    return Buffer.concat(chunks);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const lastSlash = filePath.lastIndexOf("/");
      const dirPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : "/";
      const fileName = filePath.substring(lastSlash + 1);
      const list = await this._requireClient().list(dirPath);
      return list.some((item) => item.name === fileName);
    } catch {
      return false;
    }
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().remove(filePath);
  }

  async put(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    let param: string | Readable;
    if (typeof localPathOrBuffer === "string") {
      param = localPathOrBuffer;
    } else {
      param = Readable.from(localPathOrBuffer);
    }
    await this._requireClient().uploadFrom(param, storageFilePath);
  }

  async uploadDir(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().uploadFromDir(fromPath, toPath);
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- basic-ftp close()는 동기 함수
  async close(): Promise<void> {
    this._requireClient().close();
  }
}
