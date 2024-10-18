/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import { NetUtil } from "@simplysm/sd-core-common";
import JSZip from "jszip";
import { CordovaAppStorage } from "@simplysm/cordova-plugin-app-storage";

export abstract class CordovaAutoUpdate {
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

        const { version: serverVersion, downloadPath } = await autoUpdateServiceClient.getLastVersion("android");

        // 서버와 로컬의 버전이 다르면,
        if (localVersion !== serverVersion) {
          opt.log(`최신버전 파일 다운로드중...`);

          // 서버에서 최신버전의 zip파일 다운로드
          const downloadZipBuffer = await NetUtil.downloadAsync(
            opt.serviceClient.serverUrl + downloadPath,
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
          await storage.writeJsonAsync(`/files/last-version.json`, serverVersion);
          localVersion = serverVersion;
        }
      }

      // 실행버전이 로컬의 최종버전(새로설치된 버전포함)과 다르면, APP폴더의 index.html로 baseurl변경
      if (localVersion != null && process.env["SD_VERSION"] !== localVersion) {
        opt.log(`최신버전 실행...`);

        const url = storage.getFullUrl(`/files/www/index.html`);

        // await SdLocalBaseUrl.setUrl(url);
        Ionic.Webview.setServerBasePath(url);
        return;
      }
    }
  }
}
