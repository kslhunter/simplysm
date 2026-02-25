import { WebPlugin } from "@capacitor/core";
import type { IApkInstallerPlugin, IVersionInfo } from "../IApkInstallerPlugin";

export class ApkInstallerWeb extends WebPlugin implements IApkInstallerPlugin {
  install(_options: { uri: string }): Promise<void> {
    alert("[ApkInstaller] APK installation is not supported in web environment.");
    return Promise.resolve();
  }

  hasPermission(): Promise<{ granted: boolean }> {
    // Skip permission check on web
    return Promise.resolve({ granted: true });
  }

  async requestPermission(): Promise<void> {
    // No-op on web
  }

  hasPermissionManifest(): Promise<{ declared: boolean }> {
    // Skip manifest check on web
    return Promise.resolve({ declared: true });
  }

  getVersionInfo(): Promise<IVersionInfo> {
    return Promise.resolve({
      versionName:
        (import.meta as unknown as { env?: Record<string, string> }).env?.["__VER__"] ?? "0.0.0",
      versionCode: "0",
    });
  }
}
