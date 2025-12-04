import { ISdStorageConnConf } from "../ISdStorageConnConf";
import SFtpClient from "ssh2-sftp-client";
import { ISdStorage } from "../ISdStorage";

export class SdSftpStorage implements ISdStorage {
  private _sftp?: SFtpClient;

  async connectAsync(connectionConfig: ISdStorageConnConf): Promise<void> {
    this._sftp = new SFtpClient();
    await this._sftp.connect({
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.user,
      password: connectionConfig.pass,
    });
  }

  async mkdirAsync(storageDirPath: string): Promise<void> {
    await this._sftp!.mkdir(storageDirPath, true);
  }

  async renameAsync(fromPath: string, toPath: string): Promise<void> {
    await this._sftp!.rename(fromPath, toPath);
  }

  async existsAsync(filePath: string): Promise<boolean> {
    return Boolean(await this._sftp!.exists(filePath));
  }

  async readdirAsync(filePath: string): Promise<string[]> {
    return (await this._sftp!.list(filePath)).map((item) => item.name);
  }

  async readFileAsync(filePath: string): Promise<any> {
    return await this._sftp!.get(filePath);
  }

  async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this._sftp!.fastPut(localPathOrBuffer, storageFilePath);
    } else {
      await this._sftp!.put(localPathOrBuffer, storageFilePath);
    }
  }

  async uploadDirAsync(fromPath: string, toPath: string): Promise<void> {
    await this._sftp!.uploadDir(fromPath, toPath);
  }

  async closeAsync(): Promise<void> {
    await this._sftp!.end();
  }
}
