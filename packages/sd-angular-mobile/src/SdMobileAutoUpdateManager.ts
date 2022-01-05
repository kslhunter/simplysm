import { SdServiceClient } from "@simplysm/sd-service-browser";
import * as JSZip from "jszip";
import { SdMobileFsUtil } from "./SdMobileFsUtil";

export class SdMobileAutoUpdateManager {
  public constructor(private readonly _serviceClient: SdServiceClient,
                     private readonly _clientName: string,
                     private readonly _logEl?: HTMLElement) {
  }

  // 아래 반환값은 이동할 버전 href (redirectHref)
  public async runAsync(): Promise<string | undefined> {
    this._log(`설치버전 확인 중...`, []);
    // 현재의 최종 인스톨 버전 가져오기
    let lastInstalledVersion = await this._getLastInstalledVersion();

    this._log(`업데이트 여부 확인 중...`, []);
    // 업데이트 확인
    const lastVersion = await this._getLastVersion();

    // 업데이트 할게 있으면 업데이트
    if (lastVersion !== undefined && (lastInstalledVersion === undefined || lastVersion !== lastInstalledVersion)) {
      this._log(`최신버전 파일 다운로드중...`, []);
      // 서버에서 "[lastVersion]"파일을 버퍼로 저장
      const buffer = await this._getVersionZipButton(lastVersion);

      // "buffer"에 있는것을 "/root/[lastVersion]"에 압축풀기
      const zip = await new JSZip().loadAsync(buffer);

      const zipContentFileNames = Object.keys(zip.files);
      const zipContentFileLength = zipContentFileNames.length;
      for (let i = 0; i < zipContentFileLength; i++) {
        const zipContentFileName = zipContentFileNames[i];
        this._log(`최신버전 파일의 압축을 푸는 중...(${Math.round(i * 100 / zipContentFileLength)}%)`, [zipContentFileName]);
        const contentFileBlob = await zip.file(zipContentFileName)!.async("blob");
        await SdMobileFsUtil.writeFileAsync(lastVersion + zipContentFileName, contentFileBlob);
      }

      // 최종 인스톨 버전 변수 설정
      lastInstalledVersion = lastVersion;
    }

    // 현재 버전이 최종설치버전이 아니면, 최종설치버전으로 이동
    if (process.env.SD_VERSION !== lastInstalledVersion) {
      this._log(`새 버전으로 이동 중...`, []);
      return await SdMobileFsUtil.getFullUrlAsync(lastInstalledVersion + "/index.html");
    }
    // "/root"에 버전디렉토리가 없으면 그냥 시작
    else {
      this._log(`로딩 중...`, []);
      return undefined;
    }
  }

  private async _getVersionZipButton(version: string): Promise<Buffer> {
    return await this._serviceClient.sendAsync("MobileAutoUpdateService.getVersionZipBufferAsync", [this._clientName, version]);
  }

  private async _getLastVersion(): Promise<string | undefined> {
    return await this._serviceClient.sendAsync("MobileAutoUpdateService.getLastVersionAsync", [this._clientName]);
  }

  private async _getLastInstalledVersion(): Promise<string | undefined> {
    const installedVersions = await SdMobileFsUtil.readdirAsync("", { noFile: true });
    return installedVersions.orderByDesc().first();
  }

  private _log(message: string, subMessages: string[]): void {
    if (!this._logEl) return;
    this._logEl.innerHTML = "";
    this._logEl.innerHTML += message;
    if (subMessages.length > 0) {
      for (const subMessage of subMessages) {
        this._logEl.innerHTML += `<br/><small>${subMessage}</small>`;
      }
    }
  }
}