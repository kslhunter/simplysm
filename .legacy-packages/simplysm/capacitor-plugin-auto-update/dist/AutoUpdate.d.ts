import type { SdServiceClient } from "@simplysm/sd-service-client";
export declare abstract class AutoUpdate {
  private static _throwAboutReinstall;
  private static _checkPermissionAsync;
  private static _installApkAsync;
  private static _getErrorMessage;
  private static _freezeApp;
  static runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }): Promise<void>;
  static runByExternalStorageAsync(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }): Promise<void>;
}
