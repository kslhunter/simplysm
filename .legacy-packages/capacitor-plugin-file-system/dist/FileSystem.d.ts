import type { IFileInfo, TStorage } from "./IFileSystemPlugin";
/**
 * 파일 시스템 접근 플러그인
 * - Android 11+: MANAGE_EXTERNAL_STORAGE 권한으로 전체 파일 시스템 접근
 * - Android 10-: READ/WRITE_EXTERNAL_STORAGE 권한
 * - Browser: IndexedDB 기반 에뮬레이션
 */
export declare abstract class FileSystem {
  /**
   * 권한 확인
   */
  static checkPermissionAsync(): Promise<boolean>;
  /**
   * 권한 요청
   * - Android 11+: 설정 화면으로 이동
   * - Android 10-: 권한 다이얼로그 표시
   */
  static requestPermissionAsync(): Promise<void>;
  /**
   * 디렉토리 읽기
   */
  static readdirAsync(dirPath: string): Promise<IFileInfo[]>;
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
  static getStoragePathAsync(type: TStorage): Promise<string>;
  /**
   * 파일 URI 얻기 (FileProvider)
   */
  static getFileUriAsync(filePath: string): Promise<string>;
  /**
   * 파일 쓰기
   */
  static writeFileAsync(filePath: string, data: string | Buffer): Promise<void>;
  /**
   * 파일 읽기 (UTF-8 문자열)
   */
  static readFileStringAsync(filePath: string): Promise<string>;
  /**
   * 파일 읽기 (Buffer)
   */
  static readFileBufferAsync(filePath: string): Promise<Buffer>;
  /**
   * 파일/디렉토리 삭제 (재귀)
   */
  static removeAsync(targetPath: string): Promise<void>;
  /**
   * 디렉토리 생성 (재귀)
   */
  static mkdirsAsync(targetPath: string): Promise<void>;
  /**
   * 존재 여부 확인
   */
  static existsAsync(targetPath: string): Promise<boolean>;
}
