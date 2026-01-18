import ftp from "basic-ftp";
import { PassThrough, Readable } from "stream";
import { BytesUtils } from "@simplysm/core-common";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

export class FtpStorageClient implements Storage {
  private _client: ftp.Client | undefined;

  constructor(private readonly _secure: boolean = false) {}

  /**
   * FTP 서버에 연결합니다.
   *
   * @remarks
   * - 연결 후 반드시 {@link close}로 연결을 종료해야 합니다.
   * - 동일 인스턴스에서 여러 번 호출하지 마세요. (연결 누수 발생)
   * - 자동 연결/종료 관리가 필요하면 {@link StorageFactory.connect}를 사용하세요. (권장)
   */
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

  async readFile(filePath: string): Promise<Uint8Array> {
    const client = this._requireClient();
    const chunks: Uint8Array[] = [];
    const writable = new PassThrough();
    writable.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });
    await client.downloadTo(writable, filePath);
    return BytesUtils.concat(chunks);
  }

  /**
   * 파일 또는 디렉토리 존재 여부를 확인합니다.
   *
   * @remarks
   * 내부적으로 상위 디렉토리의 전체 목록을 조회하므로,
   * 항목이 많은 디렉토리에서는 성능이 저하될 수 있습니다.
   *
   * 상위 디렉토리가 존재하지 않는 경우에도 false를 반환합니다.
   */
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

  async put(localPathOrBuffer: string | Uint8Array, storageFilePath: string): Promise<void> {
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
    this._client = undefined;
  }
}
