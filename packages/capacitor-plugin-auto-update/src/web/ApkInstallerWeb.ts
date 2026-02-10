import { WebPlugin } from "@capacitor/core";
import type { IApkInstallerPlugin, IVersionInfo } from "../IApkInstallerPlugin";

export class ApkInstallerWeb extends WebPlugin implements IApkInstallerPlugin {
  async install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
  }

  async hasPermission(): Promise<{ granted: boolean }> {
    // 웹에서는 권한 체크 스킵
    return { granted: true };
  }

  async requestPermission(): Promise<void> {
    // 웹에서는 no-op
  }

  async hasPermissionManifest(): Promise<{ declared: boolean }> {
    // 웹에서는 매니페스트 체크 스킵
    return { declared: true };
  }

  async getVersionInfo(): Promise<IVersionInfo> {
    return {
      versionName: (import.meta as unknown as { env?: Record<string, string> }).env?.["__VER__"] ?? "0.0.0",
      versionCode: "0",
    };
  }
}
