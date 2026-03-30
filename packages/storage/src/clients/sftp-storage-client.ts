import type { Bytes } from "@simplysm/core-common";
import { SdError } from "@simplysm/core-common";
import SftpClient from "ssh2-sftp-client";
import fsP from "fs/promises";
import os from "os";
import pathMod from "path";
import type { StorageClient, FileInfo } from "../types/storage";
import type { StorageConnConfig } from "../types/storage-conn-config";

// ssh2-sftp-client 라이브러리 타입 정의에서의 Buffer 사용
type SftpGetResult = string | NodeJS.WritableStream | Bytes;

/**
 * SFTP 프로토콜을 사용하는 스토리지 클라이언트.
 *
 * @remarks
 * 직접 사용하기보다 {@link StorageFactory.connect} 사용을 권장합니다.
 */
export class SftpStorageClient implements StorageClient {
  private _client: SftpClient | undefined;

  /**
   * SFTP 서버에 연결합니다.
   *
   * @remarks
   * - 사용 후 {@link close}로 연결을 종료해야 합니다.
   * - 동일 인스턴스에서 여러 번 호출하지 마세요 (연결 누수).
   * - 자동 연결/종료 관리를 위해 {@link StorageFactory.connect} 사용을 권장합니다.
   */
  async connect(config: StorageConnConfig): Promise<void> {
    if (this._client !== undefined) {
      throw new SdError("SFTP 서버에 이미 연결되어 있습니다. 먼저 close()를 호출해 주세요.");
    }

    const client = new SftpClient();
    try {
      if (config.password != null) {
        await client.connect({
          host: config.host,
          port: config.port,
          username: config.user,
          password: config.password,
        });
      } else {
        // SSH agent + 키 파일로 인증
        const keyPath = pathMod.join(os.homedir(), ".ssh", "id_ed25519");

        const baseOptions = {
          host: config.host,
          port: config.port,
          username: config.user,
          ...(process.env["SSH_AUTH_SOCK"] != null ? { agent: process.env["SSH_AUTH_SOCK"] } : {}),
        };

        try {
          await client.connect({
            ...baseOptions,
            privateKey: await fsP.readFile(keyPath),
          });
        } catch {
          // privateKey 파싱 실패 (암호화된 키 등) -> agent만으로 재시도
          await client.connect(baseOptions);
        }
      }
      this._client = client;
    } catch (err) {
      await client.end();
      throw err;
    }
  }

  private _requireClient(): SftpClient {
    if (this._client === undefined) {
      throw new SdError("SFTP 서버에 연결되어 있지 않습니다.");
    }
    return this._client;
  }

  /** 디렉토리를 생성합니다. 부모 디렉토리가 없으면 함께 생성합니다. */
  async mkdir(dirPath: string): Promise<void> {
    await this._requireClient().mkdir(dirPath, true);
  }

  async rename(fromPath: string, toPath: string): Promise<void> {
    await this._requireClient().rename(fromPath, toPath);
  }

  /**
   * 파일 또는 디렉토리의 존재 여부를 확인합니다.
   *
   * @remarks
   * 부모 디렉토리가 존재하지 않아도 false를 반환합니다.
   * 네트워크 오류, 권한 오류 등 모든 예외에 대해 false를 반환합니다.
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      // ssh2-sftp-client의 exists()는 false | 'd' | '-' | 'l'을 반환합니다.
      // false: 존재하지 않음, 'd': 디렉토리, '-': 파일, 'l': 심볼릭 링크
      const result = await this._requireClient().exists(filePath);
      return typeof result === "string";
    } catch {
      return false;
    }
  }

  async list(dirPath: string): Promise<FileInfo[]> {
    const list = await this._requireClient().list(dirPath);
    return list.map((item) => ({
      name: item.name,
      isFile: item.type === "-",
    }));
  }

  async readFile(filePath: string): Promise<Bytes> {
    // ssh2-sftp-client의 get()은 dst가 제공되지 않으면 Buffer를 반환합니다.
    // 타입 정의(string | WritableStream | Buffer)와 달리 실제로는 Buffer만 반환됩니다.
    const result = (await this._requireClient().get(filePath)) as SftpGetResult;
    if (result instanceof Uint8Array) {
      return result;
    }
    // 타입 정의상 string도 가능하므로 방어 코드
    if (typeof result === "string") {
      return new TextEncoder().encode(result);
    }
    throw new SdError("예상하지 못한 응답 타입입니다.");
  }

  async remove(filePath: string): Promise<void> {
    await this._requireClient().delete(filePath);
  }

  /** 로컬 파일 경로 또는 바이트 데이터를 원격 경로에 업로드합니다. */
  async put(localPathOrBuffer: string | Bytes, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this._requireClient().fastPut(localPathOrBuffer, storageFilePath);
    } else {
      // eslint-disable-next-line no-restricted-globals -- ssh2-sftp-client library requirement
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
   * 이미 종료된 상태에서 호출해도 안전합니다 (오류 미발생).
   * 종료 후 동일 인스턴스에서 {@link connect}를 다시 호출하여 재연결할 수 있습니다.
   */
  async close(): Promise<void> {
    if (this._client === undefined) {
      return;
    }
    await this._client.end();
    this._client = undefined;
  }
}
