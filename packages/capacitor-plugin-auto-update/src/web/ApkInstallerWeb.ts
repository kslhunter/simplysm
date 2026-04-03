import { WebPlugin } from "@capacitor/core";
import { env } from "@simplysm/core-common";
import type { ApkInstallerPlugin, VersionInfo } from "../ApkInstallerPlugin";

export class ApkInstallerWeb extends WebPlugin implements ApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] 웹 환경에서는 APK 설치를 지원하지 않습니다.");
    return Promise.resolve();
  }

  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> {
    // 웹에서는 권한 확인 생략
    return Promise.resolve({ granted: true, manifest: true });
  }

  async requestPermissions(): Promise<void> {
    // 웹에서는 동작 없음
  }

  getVersionInfo(): Promise<VersionInfo> {
    return Promise.resolve({
      versionName:
        env("__VER__") ?? "0.0.0",
      versionCode: "0",
    });
  }
}
