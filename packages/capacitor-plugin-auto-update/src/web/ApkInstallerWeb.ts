import { WebPlugin } from "@capacitor/core";
import type { ApkInstallerPlugin, VersionInfo } from "../ApkInstallerPlugin";

export class ApkInstallerWeb extends WebPlugin implements ApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] APK installation is not supported in web environment.");
    return Promise.resolve();
  }

  checkPermissions(): Promise<{ granted: boolean; manifest: boolean }> {
    // Skip permission check on web
    return Promise.resolve({ granted: true, manifest: true });
  }

  async requestPermissions(): Promise<void> {
    // No-op on web
  }

  getVersionInfo(): Promise<VersionInfo> {
    return Promise.resolve({
      versionName:
        (import.meta as unknown as { env?: Record<string, string> }).env?.["__VER__"] ?? "0.0.0",
      versionCode: "0",
    });
  }
}
