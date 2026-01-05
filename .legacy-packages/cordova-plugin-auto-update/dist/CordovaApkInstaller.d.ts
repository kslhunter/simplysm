export declare abstract class CordovaApkInstaller {
    static hasPermissionManifest(): Promise<boolean>;
    static hasPermission(): Promise<boolean>;
    static requestPermission(): Promise<void>;
    static install(apkUri: string): Promise<void>;
    static getVersionInfo(): Promise<{
        versionName: string;
        versionCode: string;
    }>;
}
