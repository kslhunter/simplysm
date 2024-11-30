/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import { NetUtil } from "@simplysm/sd-core-common";
import JSZip from "jszip";
import { CordovaAppStorage } from "@simplysm/cordova-plugin-app-storage";

/**
 * 코르도바 앱의 자동 업데이트를 처리하는 클래스
 * 
 * @remarks
 * - Android 플랫폼에서만 동작합니다.
 * - 서버에서 최신 버전을 확인하고 다운로드하여 설치합니다.
 * - {@link CordovaAppStorage}를 사용하여 로컬 파일을 관리합니다.
 * - {@link SdAutoUpdateServiceClient}를 통해 서버와 통신합니다.
 * 
 * @example
 * ```ts
 * await CordovaAutoUpdate.runAsync({
 *   log: (msg) => console.log(msg),
 *   serviceClient: new SdServiceClient("http://server-url")
 * });
 * ```
 */
export abstract class CordovaAutoUpdate {
  /**
   * 코르도바 앱의 자동 업데이트를 실행하는 메서드
   * 
   * @param opt - 옵션 객체
   * @param opt.log - 로그 메시지를 출력하는 콜백 함수
   * @param opt.serviceClient - 서버와 통신하기 위한 서비스 클라이언트 객체
   * 
   * @remarks
   * - Android 플랫폼에서만 동작합니다.
   * - 로컬의 최종 버전과 서버의 최신 버전을 비교하여 업데이트가 필요한 경우 다운로드 및 설치를 진행합니다.
   * - 업데이트가 완료되면 새로운 버전의 index.html로 baseUrl을 변경하여 앱을 재시작합니다.
   * 
   * @example
   * ```ts
   * await CordovaAutoUpdate.runAsync({
   *   log: (msg) => console.log(msg),
   *   serviceClient: new SdServiceClient("http://server-url")
   * });
   * ```
   */
  static async runAsync(opt: { log: (messageHtml: string) => void; serviceClient?: SdServiceClient }) {
    if (navigator.userAgent.toLowerCase().includes("android")) {
      opt.log(`보유버전 확인 중...`);

      // 로컬의 최종 버전 확인
      const storage = new CordovaAppStorage();
      let localVersion = await storage.readJsonAsync(`/files/last-version.json`);

      if (opt.serviceClient) {
        opt.log(`최신버전 확인 중...`);

        // 서버의 버전 및 다운로드링크 가져오기
        const autoUpdateServiceClient = new SdAutoUpdateServiceClient(opt.serviceClient);

        const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
        if (serverVersionInfo) {
          // 서버와 로컬의 버전이 다르면,
          if (localVersion !== serverVersionInfo.version) {
            opt.log(`최신버전 파일 다운로드중...`);

            // 서버에서 최신버전의 zip파일 다운로드
            const downloadZipBuffer = await NetUtil.downloadAsync(
              opt.serviceClient.serverUrl + serverVersionInfo.downloadPath,
              (progress) => {
                opt.log(
                  `최신버전 파일 다운로드중...(${((progress.receivedLength * 100) / progress.contentLength).toFixed(2)}%)`,
                );
              },
            );

            opt.log(`최신버전 파일 압축해제...`);

            // 다운로드한 최신버전파일 APP폴더에 압축풀기
            const zip = await JSZip.loadAsync(downloadZipBuffer);
            for (const zipFilePath of Object.keys(zip.files)) {
              const zipFile = zip.files[zipFilePath];
              if (!zipFile.dir) {
                const zipFileBlob = await zipFile.async("blob");
                await storage.writeAsync(`/files/www/${zipFilePath.replace(/\\/g, "/")}`, zipFileBlob);
                opt.log(`최신버전 파일 압축해제...`);
              }
            }

            opt.log(`최신버전 설치 완료...`);

            // 로컬의 최종버전값 변경
            await storage.writeJsonAsync(`/files/last-version.json`, serverVersionInfo.version);
            localVersion = serverVersionInfo.version;
          }
        }
      }

      // 실행버전이 로컬의 최종버전(새로설치된 버전포함)과 다르면, APP폴더의 index.html로 baseurl변경
      if (localVersion != null && process.env["SD_VERSION"] !== localVersion) {
        opt.log(`최신버전 실행...`);

        const url = storage.getFullPath(`/files/www/index.html`);

        // await SdLocalBaseUrl.setUrl(url);
        Ionic.WebView.setServerBasePath(url);
        return;
      }
    }
  }
}
