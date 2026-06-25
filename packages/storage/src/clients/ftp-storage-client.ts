import type { Bytes } from "@simplysm/core-common";
import { bytes, path, SdError } from "@simplysm/core-common";
import ftp from "basic-ftp";
import { PassThrough, Readable } from "stream";
import type { StorageClient, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

/**
 * FTP/FTPS 프로토콜을 사용하는 스토리지 클라이언트.
 *
 * @remarks
 * `secure` 생성자 매개변수로 FTPS 사용 여부를 설정합니다.
 * 직접 사용하기보다 {@link StorageFactory.connect} 사용을 권장합니다.
 */
export class FtpStorageClient implements StorageClient {
  private _client: ftp.Client | undefined;

  constructor(private readonly _secure: boolean = false) {}

  /**
   * FTP 서버에 연결합니다.
   *
   * @remarks
   * - 사용 후 {@link close}로 연결을 종료해야 합니다.
   * - 동일 인스턴스에서 여러 번 호출하지 마세요 (연결 누수).
   * - 자동 연결/종료 관리를 위해 {@link StorageFactory.connect} 사용을 권장합니다.
   */
  async connect(config: StorageConnConfig): Promise<void> {
    if (this._client != null) {
      throw new SdError("FTP 서버에 이미 연결되어 있습니다. 먼저 close()를 호출해 주세요.");
    }
    const client = new ftp.Client();
    try {
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: this._secure,
      });
      this._client = client;
    } catch (err) {
      client.close();
      throw err;
    }
  }

  private _requireClient(): ftp.Client {
    if (this._client == null) {
      throw new SdError("FTP 서버에 연결되어 있지 않습니다.");
    }
    return this._client;
  }

  /** 디렉토리를 생성합니다. 부모 디렉토리가 없으면 함께 생성합니다. */
  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().ensureDir(dirPath);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  async list(dirPath: string): Promise<FileInfo[]> {
    const fileInfos = await this._requireClient().list(dirPath);
    return fileInfos.map((item) => ({ name: item.name, isFile: item.isFile }));
  }

  async readFile(filePath: string): Promise<Bytes> {
    const client = this._requireClient();
    const chunks: Bytes[] = [];
    const writable = new PassThrough();
    writable.on("data", (chunk: Uint8Array) => {
      chunks.push(chunk);
    });
    await client.downloadTo(writable, filePath);
    return bytes.concat(chunks);
  }

  /**
   * 파일 또는 디렉토리의 존재 여부를 확인합니다.
   *
   * @remarks
   * 파일의 경우 size() 명령으로 O(1) 성능을 제공합니다.
   * 디렉토리의 경우 부모 디렉토리 목록을 조회하므로 항목이 많으면 성능이 저하될 수 있습니다.
   *
   * 슬래시가 없는 경로(예: `file.txt`)는 루트 디렉토리(`/`)에서 검색합니다.
   *
   * 부모 디렉토리가 존재하지 않아도 false를 반환합니다.
   * 네트워크 오류, 권한 오류 등 모든 예외에 대해 false를 반환합니다.
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      // size()로 파일 존재 여부 빠른 확인 (O(1))
      await this._requireClient().size(filePath);
      return true;
    } catch {
      // size() 실패 시 디렉토리일 수 있으므로 list()로 확인
      try {
        const lastSlash = filePath.lastIndexOf("/");
        const dirPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : "/";
        const fileName = path.basename(filePath);
        const list = await this._requireClient().list(dirPath);
        return list.some((item) => item.name === fileName);
      } catch {
        return false;
      }
    }
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().remove(filePath);
  }

  /** 로컬 파일 경로 또는 바이트 데이터를 원격 경로에 업로드합니다. */
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void> {
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

  /**
   * 연결을 종료합니다.
   *
   * @remarks
   * 이미 종료된 상태에서 호출해도 안전합니다 (오류 미발생).
   * 종료 후 동일 인스턴스에서 {@link connect}를 다시 호출하여 재연결할 수 있습니다.
   */
  close(): Promise<void> {
    if (this._client == null) {
      return Promise.resolve();
    }

    this._client.close();
    this._client = undefined;
    return Promise.resolve();
  }
}
