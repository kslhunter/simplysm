import type { Bytes } from "@simplysm/core-common";
import { SdError } from "@simplysm/core-common";
import SftpClient from "ssh2-sftp-client";
import type { Storage, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

// ssh2-sftp-client 라이브러리 타입 정의에서 Buffer 사용
type SftpGetResult = string | NodeJS.WritableStream | Bytes;

/**
 * SFTP 프로토콜을 사용하는 스토리지 클라이언트.
 *
 * @remarks
 * 직접 사용보다 {@link StorageFactory.connect}를 통한 사용을 권장합니다.
 */
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
    if (this._client !== undefined) {
      throw new SdError("이미 SFTP 서버에 연결되어 있습니다. 먼저 close()를 호출하세요.");
    }

    const client = new SftpClient();
    try {
      if (config.pass != null) {
        await client.connect({
          host: config.host,
          port: config.port,
          username: config.user,
          password: config.pass,
        });
      } else if (process.env["SSH_AUTH_SOCK"] != null) {
        // SSH agent 사용 (passphrase로 보호된 키도 처리)
        await client.connect({
          host: config.host,
          port: config.port,
          username: config.user,
          agent: process.env["SSH_AUTH_SOCK"],
        });
      } else {
        // SSH 키 파일 직접 사용
        const fs = await import("fs/promises");
        const os = await import("os");
        const path = await import("path");
        const keyPath = path.join(os.homedir(), ".ssh", "id_ed25519");
        await client.connect({
          host: config.host,
          port: config.port,
          username: config.user,
          privateKey: await fs.readFile(keyPath),
        });
      }
      this._client = client;
    } catch (err) {
      await client.end();
      throw err;
    }
  }

  private _requireClient(): SftpClient {
    if (this._client === undefined) {
      throw new SdError("SFTP 서버에 연결되어있지 않습니다.");
    }
    return this._client;
  }

  /** 디렉토리를 생성합니다. 상위 디렉토리가 없으면 함께 생성합니다. */
  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().mkdir(dirPath, true);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  /**
   * 파일 또는 디렉토리 존재 여부를 확인합니다.
   *
   * @remarks
   * 상위 디렉토리가 존재하지 않는 경우에도 false를 반환합니다.
   * 네트워크 오류, 권한 오류 등 모든 예외도 false를 반환합니다.
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      // ssh2-sftp-client의 exists()는 false | 'd' | '-' | 'l' 를 반환한다.
      // false: 존재하지 않음, 'd': 디렉토리, '-': 파일, 'l': 심볼릭 링크
      const result = await this._requireClient().exists(filePath);
      return typeof result === "string";
    } catch {
      return false;
    }
  }

  async readdir(dirPath: string): Promise<FileInfo[]> {
    const list = await this._requireClient().list(dirPath);
    return list.map((item) => ({
      name: item.name,
      isFile: item.type === "-",
    }));
  }

  async readFile(filePath: string): Promise<Bytes> {
    // ssh2-sftp-client의 get()은 dst 미전달 시 Buffer를 반환한다.
    // 타입 정의(string | WritableStream | Buffer)와 달리 실제로는 Buffer만 반환된다.
    const result = (await this._requireClient().get(filePath)) as SftpGetResult;
    if (result instanceof Uint8Array) {
      return result;
    }
    // 타입 정의상 string도 가능하므로 방어 코드
    if (typeof result === "string") {
      return new TextEncoder().encode(result);
    }
    throw new SdError("예상치 못한 응답 타입입니다.");
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().delete(filePath);
  }

  /** 로컬 파일 경로 또는 바이트 데이터를 원격 경로에 업로드합니다. */
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void> {
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

  /**
   * 연결을 종료합니다.
   *
   * @remarks
   * 이미 종료된 상태에서 호출해도 에러가 발생하지 않습니다.
   * 종료 후에는 동일 인스턴스에서 {@link connect}를 다시 호출하여 재연결할 수 있습니다.
   */
  async close(): Promise<void> {
    if (this._client === undefined) {
      return;
    }
    await this._client.end();
    this._client = undefined;
  }
}
