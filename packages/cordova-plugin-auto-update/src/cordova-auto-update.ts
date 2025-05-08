/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import { NetUtils, SdZip } from "@simplysm/sd-core-common";
import { CordovaAppStorage } from "@simplysm/cordova-plugin-app-storage";
import mime from "mime";

export abstract class CordovaAutoUpdate {
  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient
  }) {
    if (navigator.userAgent.toLowerCase().includes("android")) {
      try {
        opt.log(`보유버전 확인 중...`);

        // 로컬의 최종 버전 확인
        const storage = new CordovaAppStorage();
        const isExistsLocalVersion = await storage.existsAsync(`/files/last-version.json`);
        let localVersion = isExistsLocalVersion
          ? await storage.readJsonAsync(`/files/last-version.json`)
          : undefined;

        opt.log(`최신버전 확인 중...`);

        // 서버의 버전 및 다운로드링크 가져오기
        const autoUpdateServiceClient = new SdAutoUpdateServiceClient(opt.serviceClient);

        const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
        if (!serverVersionInfo) {
          throw new Error("서버에서 최신버전 정보를 가져오지 못했습니다.");
        }

        // 서버와 로컬의 버전이 다르면,
        if (localVersion !== serverVersionInfo.version) {
          opt.log(`최신버전 파일 다운로드중...`);

          // 서버에서 최신버전의 zip파일 다운로드
          const downloadZipBytes = await NetUtils.downloadBytesAsync(
            opt.serviceClient.serverUrl + serverVersionInfo.downloadPath,
            (progress) => {
              const progressText = ((progress.receivedLength * 100) / progress.contentLength)
                .toFixed(2);
              opt.log(`최신버전 파일 다운로드중...(${progressText}%)`);
            },
          );

          opt.log(`최신버전 파일 압축해제중...`);

          // 다운로드한 최신버전파일 APP폴더에 압축풀기
          const zip = new SdZip(downloadZipBytes);
          const extractedFileMap = await zip.extractAllAsync(progress => {
            const progressText = ((progress.extractedSize * 100) / progress.totalSize)
              .toFixed(2);
            opt.log(`최신버전 파일 압축해제중...(${progressText}%)`);
          });
          await zip.closeAsync();

          opt.log(`최신버전 파일 설치중...`);

          const totalByteLength = Array.from(extractedFileMap.values())
            .sum(item => item!.byteLength);
          let currByteLength = 0;

          await Array.from(extractedFileMap.keys()).parallelAsync(async extractedFileName => {
            await storage.writeAsync(
              `/files/www/${extractedFileName.replace(/\\/g, "/")}`,
              new Blob(
                [extractedFileMap.get(extractedFileName)!],
                { type: mime.getType(extractedFileName)! },
              ),
            );

            currByteLength += extractedFileMap.get(extractedFileName)!.byteLength;
            const installProgressText = ((currByteLength * 100) / totalByteLength)
              .toFixed(2);
            opt.log(`최신버전 파일 설치중...(${installProgressText}%)`);
          });

          opt.log(`최신버전 설치 완료...`);

          // 로컬의 최종버전값 변경
          await storage.writeJsonAsync(`/files/last-version.json`, serverVersionInfo.version);
          localVersion = serverVersionInfo.version;
        }

        // 실행버전이 로컬의 최종버전(새로설치된 버전포함)과 다르면, APP폴더의 index.html로 baseurl변경
        if (localVersion != null && process.env["SD_VERSION"] !== localVersion) {
          opt.log(`최신버전 실행...`);

          const basePath = storage.getFullPath(`/files/www`);

          Ionic.WebView.setServerBasePath(basePath);
          return;
        }
      }
      catch (err) {
        opt.log(`업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }
  }
}