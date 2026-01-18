import SftpClient from "ssh2-sftp-client";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

// ssh2-sftp-client 라이브러리 타입 정의에서 Buffer 사용
type SftpGetResult = string | NodeJS.WritableStream | Uint8Array;

export class SftpStorageClient implements Storage {
  private _client: SftpClient | undefined;

  /**
   * SFTP 서버에 연결합니다.
   *
   * @remarks
   * - 연결 후 반드시 {@link close}로 연결을 종료해야 합니다.
   * - 동일 인스턴스에서 여러 번 호출하지 마세요. (연결 누수 발생)
   * - 자동 연결/종료 관리가 필요하면 {@link StorageFactory.connect}를 사용하세요. (권장)
   */
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

  async readFile(filePath: string): Promise<Uint8Array> {
    const result = (await this._requireClient().get(filePath)) as SftpGetResult;
    if (typeof result === "string") {
      return new TextEncoder().encode(result);
    }
    if (result instanceof Uint8Array) {
      return result;
    }
    throw new Error("예상치 못한 응답 타입입니다.");
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().delete(filePath);
  }

  async put(localPathOrBuffer: string | Uint8Array, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this._requireClient().fastPut(localPathOrBuffer, storageFilePath);
    } else {
      // eslint-disable-next-line no-restricted-globals -- ssh2-sftp-client 라이브러리 요구사항
      await this._requireClient().put(Buffer.from(localPathOrBuffer), storageFilePath);
    }
  }

  async uploadDir(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().uploadDir(fromPath, toPath);
  }

  async close(): Promise<void> {
    await this._requireClient().end();
    this._client = undefined;
  }
}
