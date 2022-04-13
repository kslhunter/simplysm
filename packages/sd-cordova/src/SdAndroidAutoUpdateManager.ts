import JSZip from "jszip";
import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import { SdAndroidFsUtil } from "./SdAndroidFsUtil";
import semver from "semver/preload";

export class SdAndroidAutoUpdateManager {
  public constructor(private readonly _serviceClient: SdServiceClient,
                     private readonly _clientName: string,
                     private readonly _currentVersion: string | undefined,
                     private readonly _logger: (message: string, subMessages: string[]) => void) {
  }

  // 아래 반환값은 이동할 버전 href (redirectHref)
  public async runAsync(): Promise<string | undefined> {
    const autoUpdateServiceClient = new SdAutoUpdateServiceClient(this._serviceClient);

    this._logger("설치버전 확인 중...", []);
    // 현재의 최종 인스톨 버전 가져오기
    let lastInstalledVersion = await this._getLastInstalledVersion();
    this._logger(`설치버전: ${lastInstalledVersion}`, []);

    this._logger("업데이트 여부 확인 중...", []);
    // 업데이트 확인
    const lastVersion = await autoUpdateServiceClient.getLastVersionAsync(this._clientName, "android");
    this._logger(`최종버전: ${lastVersion}`, []);

    // 업데이트 할게 있으면 업데이트
    if (lastVersion !== undefined && (lastInstalledVersion === undefined || semver.gt(lastVersion, lastInstalledVersion))) {
      this._logger("최신버전 파일 다운로드중...", []);
      // 서버에서 "[lastVersion]"파일을 버퍼로 저장
      const buffer = await this._serviceClient.downloadAsync(`/${this._clientName}/android/updates/${lastVersion}.zip`);

      // "buffer"에 있는것을 "/root/[lastVersion]"에 압축풀기
      const zip = await new JSZip().loadAsync(buffer);

      const zipContentFileNames = Object.keys(zip.files);
      const zipContentFileLength = zipContentFileNames.length;
      for (let i = 0; i < zipContentFileLength; i++) {
        const zipContentFileName = zipContentFileNames[i];
        this._logger(`최신버전 파일의 압축을 푸는 중...(${Math.round(i * 100 / zipContentFileLength)}%)`, [zipContentFileName]);
        const contentFileBlob = await zip.file(zipContentFileName)!.async("blob");
        await SdAndroidFsUtil.writeFileAsync(lastVersion + zipContentFileName, contentFileBlob);
      }

      // 최종 인스톨 버전 변수 설정
      lastInstalledVersion = lastVersion;
    }

    // 현재 버전이 최종설치버전이 아니면, 최종설치버전으로 이동
    if (this._currentVersion !== lastInstalledVersion) {
      this._logger(`새 버전으로 이동 중...(${lastInstalledVersion})`, []);
      return await SdAndroidFsUtil.getFullUrlAsync(lastInstalledVersion + "/index.html");
      // return lastInstalledVersion + "/index.html";
    }
    // "/root"에 버전디렉토리가 없으면 그냥 시작
    else {
      this._logger("앱 로딩 중...", []);
      return undefined;
    }
  }

  private async _getLastInstalledVersion(): Promise<string | undefined> {
    const installedVersions = await SdAndroidFsUtil.readdirAsync("", { noFile: true });
    return installedVersions.orderByDesc().first();
  }
}
