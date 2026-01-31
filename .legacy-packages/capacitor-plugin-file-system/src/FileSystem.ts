import { registerPlugin } from "@capacitor/core";
import type { IFileInfo, IFileSystemPlugin, TStorage } from "./IFileSystemPlugin";

const FileSystemPlugin = registerPlugin<IFileSystemPlugin>("FileSystem", {
  web: async () => {
    const { FileSystemWeb } = await import("./web/FileSystemWeb");
    return new FileSystemWeb();
  },
});

/**
 * 파일 시스템 접근 플러그인
 * - Android 11+: MANAGE_EXTERNAL_STORAGE 권한으로 전체 파일 시스템 접근
 * - Android 10-: READ/WRITE_EXTERNAL_STORAGE 권한
 * - Browser: IndexedDB 기반 에뮬레이션
 */
export abstract class FileSystem {
  /**
   * 권한 확인
   */
  static async checkPermissionAsync(): Promise<boolean> {
    const result = await FileSystemPlugin.checkPermission();
    return result.granted;
  }

  /**
   * 권한 요청
   * - Android 11+: 설정 화면으로 이동
   * - Android 10-: 권한 다이얼로그 표시
   */
  static async requestPermissionAsync(): Promise<void> {
    await FileSystemPlugin.requestPermission();
  }

  /**
   * 디렉토리 읽기
   */
  static async readdirAsync(dirPath: string): Promise<IFileInfo[]> {
    const result = await FileSystemPlugin.readdir({ path: dirPath });
    return result.files;
  }

  /**
   * 저장소 경로 얻기
   * @param type 저장소 타입
   * - external: 외부 저장소 루트 (Environment.getExternalStorageDirectory)
   * - externalFiles: 앱 전용 외부 파일 디렉토리
   * - externalCache: 앱 전용 외부 캐시 디렉토리
   * - externalMedia: 앱 전용 외부 미디어 디렉토리
   * - appData: 앱 데이터 디렉토리
   * - appFiles: 앱 파일 디렉토리
   * - appCache: 앱 캐시 디렉토리
   */
  static async getStoragePathAsync(type: TStorage): Promise<string> {
    const result = await FileSystemPlugin.getStoragePath({ type });
    return result.path;
  }

  /**
   * 파일 URI 얻기 (FileProvider)
   */
  static async getFileUriAsync(filePath: string): Promise<string> {
    const result = await FileSystemPlugin.getFileUri({ path: filePath });
    return result.uri;
  }

  /**
   * 파일 쓰기
   */
  static async writeFileAsync(filePath: string, data: string | Buffer): Promise<void> {
    if (Buffer.isBuffer(data)) {
      await FileSystemPlugin.writeFile({
        path: filePath,
        data: data.toString("base64"),
        encoding: "base64",
      });
    } else {
      await FileSystemPlugin.writeFile({
        path: filePath,
        data,
        encoding: "utf8",
      });
    }
  }

  /**
   * 파일 읽기 (UTF-8 문자열)
   */
  static async readFileStringAsync(filePath: string): Promise<string> {
    const result = await FileSystemPlugin.readFile({ path: filePath, encoding: "utf8" });
    return result.data;
  }

  /**
   * 파일 읽기 (Buffer)
   */
  static async readFileBufferAsync(filePath: string): Promise<Buffer> {
    const result = await FileSystemPlugin.readFile({ path: filePath, encoding: "base64" });
    return Buffer.from(result.data, "base64");
  }

  /**
   * 파일/디렉토리 삭제 (재귀)
   */
  static async removeAsync(targetPath: string): Promise<void> {
    await FileSystemPlugin.remove({ path: targetPath });
  }

  /**
   * 디렉토리 생성 (재귀)
   */
  static async mkdirsAsync(targetPath: string): Promise<void> {
    await FileSystemPlugin.mkdir({ path: targetPath });
  }

  /**
   * 존재 여부 확인
   */
  static async existsAsync(targetPath: string): Promise<boolean> {
    const result = await FileSystemPlugin.exists({ path: targetPath });
    return result.exists;
  }
}
