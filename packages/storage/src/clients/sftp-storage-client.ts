import SftpClient from "ssh2-sftp-client";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

export class SftpStorageClient implements Storage {
  private _client: SftpClient | undefined;

  async connect(config: StorageConnConfig): Promise<void> {
    this._client = new SftpClient();
    await this._client.connect({
      host: config.host,
      port: config.port,
      username: config.user,
      password: config.pass,
    });
  }

  private _requireClient(): SftpClient {
    if (this._client === undefined) {
      throw new Error("SFTP 서버에 연결되어있지 않습니다.");
    }
    return this._client;
  }

  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().mkdir(dirPath, true);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const result = await this._requireClient().exists(filePath);
    return result !== false;
  }

  async readdir(dirPath: string): Promise<FileInfo[]> {
    const list = await this._requireClient().list(dirPath);
    return list.map((item) => ({
      name: item.name,
      isFile: item.type === "-",
    }));
  }

  async readFile(filePath: string): Promise<Buffer> {
    const result = await this._requireClient().get(filePath);
    if (typeof result === "string") {
      return Buffer.from(result);
    }
    if (Buffer.isBuffer(result)) {
      return result;
    }
    throw new Error("예상치 못한 응답 타입입니다.");
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().delete(filePath);
  }

  async put(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this._requireClient().fastPut(localPathOrBuffer, storageFilePath);
    } else {
      await this._requireClient().put(localPathOrBuffer, storageFilePath);
    }
  }

  async uploadDir(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().uploadDir(fromPath, toPath);
  }

  async close(): Promise<void> {
    await this._requireClient().end();
  }
}
