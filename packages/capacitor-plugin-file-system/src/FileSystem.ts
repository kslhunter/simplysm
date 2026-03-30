import { registerPlugin } from "@capacitor/core";
import type { FileInfo, FileSystemPlugin, StorageType } from "./FileSystemPlugin";
import type { Bytes } from "@simplysm/core-common";
import { bytes } from "@simplysm/core-common";

const fileSystemPlugin = registerPlugin<FileSystemPlugin>("FileSystem", {
  web: async () => {
    const { FileSystemWeb } = await import("./web/FileSystemWeb");
    return new FileSystemWeb();
  },
});

/**
 * 파일 시스템 접근 플러그인
 * - Android 11+: MANAGE_EXTERNAL_STORAGE 권한을 통한 전체 파일 시스템 접근
 * - Android 10-: READ/WRITE_EXTERNAL_STORAGE 권한
 * - Browser: IndexedDB 기반 에뮬레이션
 */
export abstract class FileSystem {
  /**
   * 권한 확인
   */
  static async checkPermissions(): Promise<boolean> {
    const result = await fileSystemPlugin.checkPermissions();
    return result.granted;
  }

  /**
   * 권한 요청
   * - Android 11+: 설정 화면으로 이동
   * - Android 10-: 권한 대화상자 표시
   */
  static async requestPermissions(): Promise<void> {
    await fileSystemPlugin.requestPermissions();
  }

  /**
   * 디렉토리 읽기
   */
  static async readdir(dirPath: string): Promise<FileInfo[]> {
    const result = await fileSystemPlugin.readdir({ path: dirPath });
    return result.files;
  }

  /**
   * 저장소 경로 조회
   * @param type 저장소 유형
   * - external: 외부 저장소 루트 (Environment.getExternalStorageDirectory)
   * - externalFiles: 앱 전용 외부 파일 디렉토리
   * - externalCache: 앱 전용 외부 캐시 디렉토리
   * - externalMedia: 앱 전용 외부 미디어 디렉토리
   * - appData: 앱 데이터 디렉토리
   * - appFiles: 앱 파일 디렉토리
   * - appCache: 앱 캐시 디렉토리
   */
  static async getStoragePath(type: StorageType): Promise<string> {
    const result = await fileSystemPlugin.getStoragePath({ type });
    return result.path;
  }

  /**
   * 파일 URI 조회 (FileProvider)
   */
  static async getUri(filePath: string): Promise<string> {
    const result = await fileSystemPlugin.getUri({ path: filePath });
    return result.uri;
  }

  /**
   * 파일 쓰기
   */
  static async writeFile(filePath: string, data: string | Bytes): Promise<void> {
    if (typeof data !== "string") {
      // Bytes (Uint8Array) - cross-realm 환경에서도 안전하게 동작
      await fileSystemPlugin.writeFile({
        path: filePath,
        data: bytes.toBase64(data),
        encoding: "base64",
      });
    } else {
      await fileSystemPlugin.writeFile({
        path: filePath,
        data,
        encoding: "utf8",
      });
    }
  }

  /**
   * 파일 읽기 (기본: Bytes, encoding "utf8" 지정 시: string)
   */
  static async readFile(filePath: string): Promise<Bytes>;
  static async readFile(filePath: string, encoding: "utf8"): Promise<string>;
  static async readFile(filePath: string, encoding?: "utf8"): Promise<string | Bytes> {
    if (encoding === "utf8") {
      const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "utf8" });
      return result.data;
    } else {
      const result = await fileSystemPlugin.readFile({ path: filePath, encoding: "base64" });
      return bytes.fromBase64(result.data);
    }
  }

  /**
   * 파일/디렉토리 삭제 (재귀)
   */
  static async remove(targetPath: string): Promise<void> {
    await fileSystemPlugin.remove({ path: targetPath });
  }

  /**
   * 디렉토리 생성 (재귀)
   */
  static async mkdir(targetPath: string): Promise<void> {
    await fileSystemPlugin.mkdir({ path: targetPath });
  }

  /**
   * 존재 여부 확인
   */
  static async exists(targetPath: string): Promise<boolean> {
    const result = await fileSystemPlugin.exists({ path: targetPath });
    return result.exists;
  }
}
