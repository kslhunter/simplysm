import { INpmConfig, ISdCliClientBuilderCordovaConfig } from "../commons";
import * as path from "path";
import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import xml2js from "xml2js";

export class SdCliCordova {
  protected readonly _logger: Logger;

  private readonly _npmConfig: INpmConfig;

  public readonly cordovaPath = path.resolve(this._rootPath, ".cache", "cordova");
  private readonly _binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

  public get platforms(): ("browser" | "android")[] {
    return [
      ...this._config.target?.browser ? ["browser" as const] : [],
      ...this._config.target?.android ? ["android" as const] : []
    ];
  }

  public constructor(private readonly _rootPath: string, private readonly _config: ISdCliClientBuilderCordovaConfig) {
    this._npmConfig = FsUtil.readJson(path.resolve(this._rootPath, "package.json"));
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this._npmConfig.name]);
  }

  private async _execAsync(cmd: string, cwd: string): Promise<void> {
    this._logger.debug(cmd);
    const msg = await SdProcess.spawnAsync(cmd, { cwd });
    this._logger.debug(msg);
  }

  public async initializeAsync(): Promise<void> {
    if (FsUtil.exists(this.cordovaPath)) {
      this._logger.log("이미 생성되어있는 '.cordova'를 사용합니다.");
    }
    else {
      await this._execAsync(`${this._binPath} telemetry on`, this.cordovaPath);

      // 프로젝트 생성
      await this._execAsync(`${this._binPath} create "${this.cordovaPath}" "${this._config.appId}" "${this._config.appName}"`, process.cwd());
    }

    // platforms 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(this.cordovaPath, "platforms"));

    // www 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(this.cordovaPath, "www"));

    // 미설치 빌드 플랫폼 신규 생성
    const alreadyPlatforms = await FsUtil.readdirAsync(path.resolve(this.cordovaPath, "platforms"));
    for (const platform of this.platforms) {
      if (!alreadyPlatforms.includes(platform)) {
        await this._execAsync(`${this._binPath} platform add ${platform}`, this.cordovaPath);
      }
    }

    // 설치 미빌드 플랫폼 삭제
    for (const alreadyPlatform of alreadyPlatforms) {
      if (this._config.target?.[alreadyPlatform] == null) {
        await this._execAsync(`${this._binPath} platform remove ${alreadyPlatform}`, this.cordovaPath);
      }
    }

    // 설치된 미사용 플러그인 삭제
    const pluginsFetch = FsUtil.exists(path.resolve(this.cordovaPath, "plugins/fetch.json"))
      ? await FsUtil.readJsonAsync(path.resolve(this.cordovaPath, "plugins/fetch.json"))
      : undefined;
    const alreadyPluginIds = pluginsFetch != undefined
      ? Object.values(pluginsFetch)
        .map((item: any) => (item.source.id !== undefined ? item.source.id : item.source.url))
      : [];
    const usePlugins = ["cordova-plugin-ionic-webview", ...this._config.plugins ?? []].distinct();

    for (const alreadyPluginId of alreadyPluginIds) {
      let hasPlugin = false;
      for (const usePlugin of usePlugins) {
        if (
          (usePlugin.includes("@") && alreadyPluginId === usePlugin) ||
          (!usePlugin.includes("@") && alreadyPluginId.replace(/@.*$/, "") === usePlugin)
        ) {
          hasPlugin = true;
          break;
        }
      }

      if (!hasPlugin) {
        await this._execAsync(`${this._binPath} plugin remove ${alreadyPluginId.replace(/@.*$/, "")}`, this.cordovaPath);
      }
    }

    // 미설치 플러그인들 설치
    for (const usePlugin of usePlugins) {
      if (
        (usePlugin.includes("@") && !alreadyPluginIds.includes(usePlugin)) ||
        (!usePlugin.includes("@") && !alreadyPluginIds.map((alreadyPluginId) => alreadyPluginId.replace(/@.*$/, "")).includes(usePlugin))
      ) {
        await this._execAsync(`${this._binPath} plugin add ${usePlugin}`, this.cordovaPath);
      }
    }

    // ANDROID SIGN 파일 복사
    if (this._config.target?.android?.sign) {
      await FsUtil.copyAsync(
        path.resolve(this._rootPath, this._config.target.android.sign.keystore),
        path.resolve(this.cordovaPath, "android.keystore")
      );
    }
    else {
      await FsUtil.removeAsync(path.resolve(this.cordovaPath, "android.keystore"));
      // SIGN을 안쓸경우 아래 파일이 생성되어 있으면 오류남
      await FsUtil.removeAsync(path.resolve(this.cordovaPath, "platforms/android/release-signing.properties"));
    }

    // 빌드 옵션 파일 생성
    await FsUtil.writeJsonAsync(
      path.resolve(this.cordovaPath, "build.json"),
      {
        ...this._config.target?.android ? {
          android: {
            release: {
              packageType: this._config.target.android.bundle ? "bundle" : "apk",
              ...this._config.target.android.sign ? {
                keystore: path.resolve(this.cordovaPath, "android.keystore"),
                storePassword: this._config.target.android.sign.storePassword,
                alias: this._config.target.android.sign.alias,
                password: this._config.target.android.sign.password,
                keystoreType: this._config.target.android.sign.keystoreType
              } : {}
            }
          }
        } : {}
      }
    );

    // ICON 파일 복사
    if (this._config.icon !== undefined) {
      await FsUtil.copyAsync(path.resolve(this._rootPath, this._config.icon), path.resolve(this.cordovaPath, "res", "icon.png"));
    }
    else {
      await FsUtil.removeAsync(path.resolve(this.cordovaPath, "res", "icon.png"));
    }

    // CONFIG: 초기값 백업
    const configFilePath = path.resolve(this.cordovaPath, "config.xml");
    const configBackFilePath = path.resolve(this.cordovaPath, "config.xml.bak");
    if (!FsUtil.exists(configBackFilePath)) {
      await FsUtil.copyAsync(configFilePath, configBackFilePath);
    }

    // CONFIG: 초기값 읽기
    const configFileContent = await FsUtil.readFileAsync(configBackFilePath);
    const configXml = await xml2js.parseStringPromise(configFileContent);


    // CONFIG: 버전 설정
    configXml.widget.$.version = this._npmConfig.version;

    // CONFIG: ICON 설정
    if (this._config.icon !== undefined) {
      configXml["widget"]["icon"] = [{ "$": { "src": "res/icon.png" } }];
    }

    // CONFIG: 접근허용 세팅
    configXml["widget"]["access"] = [{ "$": { "origin": "*" } }];
    configXml["widget"]["allow-navigation"] = [{ "$": { "href": "*" } }];
    configXml["widget"]["allow-intent"] = [{ "$": { "href": "*" } }];
    configXml["widget"]["preference"] = [{ "$": { "name": "MixedContentMode", "value": "0" } }];

    // CONFIG: ANDROID usesCleartextTraffic 설정
    if (this._config.target?.android) {
      configXml.widget.$["xmlns:android"] = "http://schemas.android.com/apk/res/android";

      configXml["widget"]["platform"] = configXml["widget"]["platform"] ?? [];
      configXml["widget"]["platform"].push({
        "$": {
          "name": "android"
        },
        "edit-config": [{
          "$": {
            "file": "app/src/main/AndroidManifest.xml",
            "mode": "merge",
            "target": "/manifest/application"
          },
          "application": [{
            "$": {
              "android:usesCleartextTraffic": "true"
            }
          }]
        }]
      });
    }

    // CONFIG: 파일 새로 쓰기
    const configResultContent = new xml2js.Builder().buildObject(configXml);
    await FsUtil.writeFileAsync(configFilePath, configResultContent);

    // 각 플랫폼 www 준비
    await this._execAsync(`${this._binPath} prepare`, this.cordovaPath);
  }

  public async buildAsync(outPath: string): Promise<void> {
    // 실행
    const buildType = this._config.debug ? "debug" : "release";
    for (const platform of this.platforms) {
      await this._execAsync(`${this._binPath} build ${platform} --${buildType}`, this.cordovaPath);
    }

    // 결과물 복사: ANDROID
    if (this._config.target?.android) {
      const targetOutPath = path.resolve(outPath, "android");
      const apkFileName = this._config.target.android.sign ? `app-${buildType}.apk` : `app-${buildType}-unsigned.apk`;
      // const distApkFileName = path.basename(`${this._config.appName}${this._config.target.android.sign ? "" : "-unsigned"}-v${this._npmConfig.version}.apk`);
      const latestDistApkFileName = path.basename(`${this._config.appName}${this._config.target.android.sign ? "" : "-unsigned"}-latest.apk`);
      await FsUtil.mkdirsAsync(targetOutPath);
      // await FsUtil.copyAsync(
      //   path.resolve(this.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
      //   path.resolve(targetOutPath, distApkFileName)
      // );
      await FsUtil.copyAsync(
        path.resolve(this.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
        path.resolve(targetOutPath, latestDistApkFileName)
      );
      // 자동업데이트를 위한 파일 쓰기
      await FsUtil.copyAsync(
        path.resolve(this.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
        path.resolve(path.resolve(targetOutPath, "updates"), this._npmConfig.version + ".apk")
      );
    }

    /*if (this._config.target?.android) {
      // 자동업데이트를 위한 zip 파일 쓰기
      const zip = new JSZip();
      const resultFiles = await FsUtil.globAsync(path.resolve(this.cordovaPath, "platforms", "android", "app", "src", "main", "assets", "www", "**!/!*"), {
        dot: true,
        nodir: true
      });
      for (const resultFile of resultFiles) {
        const contentBuffer = await FsUtil.readFileBufferAsync(resultFile);
        const relativePath = path.relative(path.resolve(this.cordovaPath, "platforms", "android", "app", "src", "main", "assets", "www"), resultFile);
        zip.file("/" + relativePath, contentBuffer);
      }

      const zipFileName = path.basename(`${this._npmConfig.version}.zip`);
      const resultBuffer = await zip.generateAsync({ type: "nodebuffer" });

      await FsUtil.writeFileAsync(path.resolve(outPath, "android/updates/", zipFileName), resultBuffer);
    }*/
  }

  public static async runWebviewOnDeviceAsync(rootPath: string, platform: "browser" | "android", pkgName: string, url?: string): Promise<void> {
    const cordovaPath = path.resolve(rootPath, `packages/${pkgName}/.cordova/`);

    if (url !== undefined) {
      await FsUtil.removeAsync(path.resolve(cordovaPath, "www"));
      await FsUtil.mkdirsAsync(path.resolve(cordovaPath, "www"));
      await FsUtil.writeFileAsync(path.resolve(cordovaPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url.replace(/\/$/, "")}/${pkgName}/cordova/"}, 3000);</script>`.trim());
    }

    const binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");
    // await SdProcess.spawnAsync(`${binPath} build ${platform}`, { cwd: cordovaPath }, true);
    await SdProcess.spawnAsync(`${binPath} run ${platform} --device`, { cwd: cordovaPath }, true);
  }
}
