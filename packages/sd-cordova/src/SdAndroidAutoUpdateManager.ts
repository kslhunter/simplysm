import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import { SdAndroidFsUtil } from "./SdAndroidFsUtil";
import semver from "semver/preload";

export class SdAndroidAutoUpdateManager {
  public constructor(private readonly _serviceClient: SdServiceClient,
                     private readonly _clientName: string,
                     private readonly _currentVersion: string,
                     private readonly _logger: (message: string, subMessages: string[]) => void) {
  }

  public async runAsync(): Promise<void> {
    const autoUpdateServiceClient = new SdAutoUpdateServiceClient(this._serviceClient);

    this._logger("업데이트 여부 확인 중...", []);
    // 업데이트 확인
    const lastVersion = await autoUpdateServiceClient.getLastVersionAsync(this._clientName, "android");
    this._logger(`최종버전: ${lastVersion}`, []);

    // 업데이트 할게 있으면 업데이트
    if (lastVersion !== undefined && semver.gt(lastVersion, this._currentVersion)) {
      this._logger("최신버전 파일 다운로드중...", []);

      const apkUrl = await SdAndroidFsUtil.getNativeUrlAsync(`updates/${lastVersion}.apk`);
      const buffer = await this._serviceClient.downloadAsync(`/${this._clientName}/android/updates/${lastVersion}.apk`);
      await SdAndroidFsUtil.writeFileAsync(apkUrl, new Blob([buffer], { type: "blob" }));

      await new Promise<void>((resolve, reject) => {
        cordova.plugins["webintent"].startActivity({
            action: cordova.plugins["webintent"].ACTION_VIEW,
            url: apkUrl,
            type: "application/vnd.android.package-archive"
          },
          () => {
            resolve();
          },
          () => {
            reject(new Error("파일 실행 실패: " + apkUrl));
          }
        );
      });
    }
    else {
      this._logger("앱 로딩 중...", []);
    }
  }
}
