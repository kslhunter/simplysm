import { WebPlugin } from "@capacitor/core";
import type { IApkInstallerPlugin, IVersionInfo } from "../IApkInstallerPlugin";

export class ApkInstallerWeb extends WebPlugin implements IApkInstallerPlugin {
  async install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
    await Promise.resolve();
  }

  async hasPermission(): Promise<{ granted: boolean }> {
    // 웹에서는 권한 체크 스킵
    return await Promise.resolve({ granted: true });
  }

  async requestPermission(): Promise<void> {
    // no-op
  }

  async hasPermissionManifest(): Promise<{ declared: boolean }> {
    // 웹에서는 매니페스트 체크 스킵
    return await Promise.resolve({ declared: true });
  }

  async getVersionInfo(): Promise<IVersionInfo> {
    return await Promise.resolve({
      versionName: process.env["SD_VERSION"] ?? "0.0.0",
      versionCode: "0",
    });
  }
}
