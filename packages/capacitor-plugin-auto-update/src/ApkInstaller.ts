import { registerPlugin } from "@capacitor/core";
import type { ApkInstallerPlugin, VersionInfo } from "./ApkInstallerPlugin";

const apkInstallerPlugin = registerPlugin<ApkInstallerPlugin>("ApkInstaller", {
  web: async () => {
    const { ApkInstallerWeb } = await import("./web/ApkInstallerWeb");
    return new ApkInstallerWeb();
  },
});

/**
 * APK 설치 플러그인
 * - Android: APK 설치 인텐트를 실행하고, REQUEST_INSTALL_PACKAGES 권한을 관리
 * - Browser: 알림 메시지를 표시하고 정상 반환
 */
export abstract class ApkInstaller {
  /**
   * 권한 확인 (설치 권한 승인 여부 + manifest 선언 여부)
   */
  static async checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> {
    return apkInstallerPlugin.checkPermissions();
  }

  /**
   * REQUEST_INSTALL_PACKAGES 권한 요청 (설정 화면으로 이동)
   */
  static async requestPermissions(): Promise<void> {
    await apkInstallerPlugin.requestPermissions();
  }

  /**
   * APK 설치
   * @param apkUri content:// URI (FileProvider URI)
   */
  static async install(apkUri: string): Promise<void> {
    await apkInstallerPlugin.install({ uri: apkUri });
  }

  /**
   * 앱 버전 정보 조회
   */
  static async getVersionInfo(): Promise<VersionInfo> {
    return apkInstallerPlugin.getVersionInfo();
  }
}
