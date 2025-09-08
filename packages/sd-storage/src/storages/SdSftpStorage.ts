import { ISdStorageConnConf } from "../ISdStorageConnConf";
import SFtpClient from "ssh2-sftp-client";
import { ISdStorage } from "../ISdStorage";

export class SdSftpStorage implements ISdStorage {
  #sftp?: SFtpClient;

  async connectAsync(connectionConfig: ISdStorageConnConf): Promise<void> {
    this.#sftp = new SFtpClient();
    await this.#sftp.connect({
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.user,
      password: connectionConfig.pass,
    });
  }

  async mkdirAsync(storageDirPath: string): Promise<void> {
    await this.#sftp!.mkdir(storageDirPath, true);
  }

  async renameAsync(fromPath: string, toPath: string): Promise<void> {
    await this.#sftp!.rename(fromPath, toPath);
  }

  async existsAsync(filePath: string): Promise<boolean> {
    return Boolean(await this.#sftp!.exists(filePath));
  }

  async readdirAsync(filePath: string): Promise<string[]> {
    return (await this.#sftp!.list(filePath)).map((item) => item.name);
  }

  async readFileAsync(filePath: string): Promise<any> {
    return await this.#sftp!.get(filePath);
  }

  async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this.#sftp!.fastPut(localPathOrBuffer, storageFilePath);
    } else {
      await this.#sftp!.put(localPathOrBuffer, storageFilePath);
    }
  }

  async uploadDirAsync(fromPath: string, toPath: string): Promise<void> {
    await this.#sftp!.uploadDir(fromPath, toPath);
  }

  async closeAsync(): Promise<void> {
    await this.#sftp!.end();
  }
}
