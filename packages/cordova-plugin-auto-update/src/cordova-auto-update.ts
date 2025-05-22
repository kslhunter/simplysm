/// <reference types="@simplysm/types-cordova-plugin-ionic-webview"/>

import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { NetUtils, SdZip } from "@simplysm/sd-core-common";
import { SdAutoUpdateServiceClient, SdServiceClient } from "@simplysm/sd-service-client";
import path from "path";
import semver from "semver";

export abstract class CordovaAutoUpdate {
  static async runAsync(opt: {
    log: (messageHtml: string) => void;
    serviceClient: SdServiceClient;
  }) {
    if (navigator.userAgent.toLowerCase().includes("android")) {
      try {
        opt.log(`최신버전 확인 중...`);

        // 서버의 버전 및 다운로드링크 가져오기
        const autoUpdateServiceClient = new SdAutoUpdateServiceClient(opt.serviceClient);

        const serverVersionInfo = await autoUpdateServiceClient.getLastVersion("android");
        if (!serverVersionInfo) {
          throw new Error("서버에서 최신버전 정보를 가져오지 못했습니다.");
        }

        await this._runAsync({
          log: opt.log,
          latestVersion: serverVersionInfo.version,
          getZipBufferAsync: async () => {
            return await NetUtils.downloadBufferAsync(
              opt.serviceClient.serverUrl + serverVersionInfo.downloadPath,
              (progress) => {
                const progressText = (
                  (progress.receivedLength * 100) /
                  progress.contentLength
                ).toFixed(2);
                opt.log(`최신버전 파일 다운로드중...(${progressText}%)`);
              },
            );
          },
        });
      } catch (err) {
        opt.log(`업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }
  }

  static async runByExternalStorageAsync(opt: {
    log: (messageHtml: string) => void;
    dirPath: string;
  }) {
    if (navigator.userAgent.toLowerCase().includes("android")) {
      try {
        opt.log(`최신버전 확인 중...`);

        // 버전 가져오기
        const externalPath = await CordovaFileSystem.getStoragePathAsync("external");
        const fileInfos = await CordovaFileSystem.readdirAsync(
          path.join(externalPath, opt.dirPath),
        );

        const versions = fileInfos
          .filter((fileInfo) => !fileInfo.isDirectory)
          .map((fileInfo) => ({
            fileName: fileInfo.name,
            version: path.basename(fileInfo.name, path.extname(fileInfo.name)),
            extName: path.extname(fileInfo.name),
          }))
          .filter((item) => {
            return item.extName === ".zip" && /^[0-9.]*$/.test(item.version);
          });
        const latestVersion = semver.maxSatisfying(
          versions.map((item) => item.version),
          "*",
        )!;

        await this._runAsync({
          log: opt.log,
          latestVersion: latestVersion,
          getZipBufferAsync: async () => {
            return await CordovaFileSystem.readFileBufferAsync(
              path.join(externalPath, opt.dirPath, latestVersion + ".zip"),
            );
          },
        });
      } catch (err) {
        opt.log(`업데이트 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }
  }

  private static async _runAsync(opt: {
    log: (messageHtml: string) => void;
    latestVersion: string;
    getZipBufferAsync: () => Promise<Buffer>;
  }) {
    opt.log(`보유버전 확인 중...`);

    // 로컬의 최종 버전 확인
    const appPath = await CordovaFileSystem.getStoragePathAsync("app");
    const isExistsLocalVersion = await CordovaFileSystem.existsAsync(
      path.join(appPath, `files/last-version.json`),
    );
    let localVersion = isExistsLocalVersion
      ? JSON.parse(
          await CordovaFileSystem.readFileStringAsync(
            path.join(appPath, `files/last-version.json`),
          ),
        )
      : undefined;

    // 서버와 로컬의 버전이 다르면,
    if (localVersion !== opt.latestVersion) {
      opt.log(`최신버전 파일 다운로드중...`);

      // 서버에서 최신버전의 zip파일 다운로드
      const zipBuffer = await opt.getZipBufferAsync();

      opt.log(`최신버전 파일 압축해제중...`);

      // 다운로드한 최신버전파일 APP폴더에 압축풀기
      const zip = new SdZip(zipBuffer);
      const extractedFileMap = await zip.extractAllAsync((progress) => {
        const progressText = ((progress.extractedSize * 100) / progress.totalSize).toFixed(2);
        opt.log(`최신버전 파일 압축해제중...(${progressText}%)`);
      });
      await zip.closeAsync();

      opt.log(`최신버전 파일 설치중...`);

      const totalByteLength = Array.from(extractedFileMap.values()).sum((item) => item!.byteLength);
      let currByteLength = 0;

      await Array.from(extractedFileMap.keys()).parallelAsync(async (extractedFileName) => {
        await CordovaFileSystem.writeFileAsync(
          path.join(appPath, `files/www/${extractedFileName.replace(/\\/g, "/")}`),
          extractedFileMap.get(extractedFileName)!,
        );

        currByteLength += extractedFileMap.get(extractedFileName)!.byteLength;
        const installProgressText = ((currByteLength * 100) / totalByteLength).toFixed(2);
        opt.log(`최신버전 파일 설치중...(${installProgressText}%)`);
      });

      opt.log(`최신버전 설치 완료...`);

      // 로컬의 최종버전값 변경
      await CordovaFileSystem.writeFileAsync(
        path.join(appPath, `files/last-version.json`),
        JSON.stringify(opt.latestVersion),
      );
      localVersion = opt.latestVersion;
    }

    // 실행버전이 로컬의 최종버전(새로설치된 버전포함)과 다르면, APP폴더의 index.html로 baseurl변경
    if (localVersion != null && process.env["SD_VERSION"] !== localVersion) {
      opt.log(`최신버전 실행...`);

      Ionic.WebView.setServerBasePath(path.join(appPath, `files/www`));
      return;
    }
  }
}
