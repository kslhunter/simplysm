import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import semver from "semver/preload";

export class SdAndroidAutoUpdateManager {
  public constructor(private readonly _serviceClient: SdServiceClient,
                     private readonly _clientName: string,
                     private readonly _currentVersion: string,
                     private readonly _logger: (message: string, subMessages: string[]) => void) {
  }

  public async runAsync(): Promise<boolean> {
    const autoUpdateServiceClient = new SdAutoUpdateServiceClient(this._serviceClient);

    // 최신버전 확인
    this._logger("최신버전 확인 중...", []);
    const lastVersion = await autoUpdateServiceClient.getLastVersionAsync(this._clientName, "android");

    // 업데이트 할게 있으면 업데이트
    if (lastVersion !== undefined && semver.gt(lastVersion, this._currentVersion)) {
      this._logger("최신버전 파일 다운로드중...", []);
      await window["ApkUpdater"].download(
        `${this._serviceClient.serverUrl}/${this._clientName}/android/updates/${lastVersion}.apk`,
        {
          onDownloadProgress: (prog) => {
            this._logger(`최신버전 파일 다운로드중...(${prog.progress}%)`, []);
          }
        }
      );
      await window["ApkUpdater"].install();
      this._logger("최신버전 업데이트", []);

      return true;
    }
    else {
      this._logger("앱 로딩 중...", []);
      return false;
    }
  }
}
