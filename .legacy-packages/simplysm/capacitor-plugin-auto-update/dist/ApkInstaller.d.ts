import type { IVersionInfo } from "./IApkInstallerPlugin";
/**
 * APK 설치 플러그인
 * - Android: APK 설치 인텐트 실행, REQUEST_INSTALL_PACKAGES 권한 관리
 * - Browser: alert으로 안내 후 정상 반환
 */
export declare abstract class ApkInstaller {
  /**
   * Manifest에 REQUEST_INSTALL_PACKAGES 권한이 선언되어 있는지 확인
   */
  static hasPermissionManifest(): Promise<boolean>;
  /**
   * REQUEST_INSTALL_PACKAGES 권한이 허용되어 있는지 확인
   */
  static hasPermission(): Promise<boolean>;
  /**
   * REQUEST_INSTALL_PACKAGES 권한 요청 (설정 화면으로 이동)
   */
  static requestPermission(): Promise<void>;
  /**
   * APK 설치
   * @param apkUri content:// URI (FileProvider URI)
   */
  static install(apkUri: string): Promise<void>;
  /**
   * 앱 버전 정보 가져오기
   */
  static getVersionInfo(): Promise<IVersionInfo>;
}
