import { registerPlugin } from "@capacitor/core";
import type { IApkInstallerPlugin, IVersionInfo } from "./IApkInstallerPlugin";

const ApkInstallerPlugin = registerPlugin<IApkInstallerPlugin>("ApkInstaller", {
  web: async () => {
    const { ApkInstallerWeb } = await import("./web/ApkInstallerWeb");
    return new ApkInstallerWeb();
  },
});

/**
 * APK 설치 플러그인
 * - Android: APK 설치 인텐트 실행, REQUEST_INSTALL_PACKAGES 권한 관리
 * - Browser: alert으로 안내 후 정상 반환
 */
export abstract class ApkInstaller {
  /**
   * Manifest에 REQUEST_INSTALL_PACKAGES 권한이 선언되어 있는지 확인
   */
  static async hasPermissionManifest(): Promise<boolean> {
    const result = await ApkInstallerPlugin.hasPermissionManifest();
    return result.declared;
  }

  /**
   * REQUEST_INSTALL_PACKAGES 권한이 허용되어 있는지 확인
   */
  static async hasPermission(): Promise<boolean> {
    const result = await ApkInstallerPlugin.hasPermission();
    return result.granted;
  }

  /**
   * REQUEST_INSTALL_PACKAGES 권한 요청 (설정 화면으로 이동)
   */
  static async requestPermission(): Promise<void> {
    await ApkInstallerPlugin.requestPermission();
  }

  /**
   * APK 설치
   * @param apkUri content:// URI (FileProvider URI)
   */
  static async install(apkUri: string): Promise<void> {
    await ApkInstallerPlugin.install({ uri: apkUri });
  }

  /**
   * 앱 버전 정보 가져오기
   */
  static async getVersionInfo(): Promise<IVersionInfo> {
    return await ApkInstallerPlugin.getVersionInfo();
  }
}
