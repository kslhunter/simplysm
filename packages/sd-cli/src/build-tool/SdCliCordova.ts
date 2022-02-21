import { INpmConfig, ISdCliClientPackageCordovaConfig, TSdCliCordovaPlatform } from "../commons";
import * as path from "path";
import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import { NotImplementError } from "@simplysm/sd-core-common";
import JSZip from "jszip";

export class SdCliCordova {
  protected readonly _logger: Logger;

  private readonly _npmConfig: INpmConfig;

  public readonly cordovaPath = path.resolve(this._rootPath, ".cordova");
  private readonly _binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

  public get platforms(): TSdCliCordovaPlatform[] {
    return this._config.platforms;
  }

  public constructor(private readonly _rootPath: string, private readonly _config: ISdCliClientPackageCordovaConfig) {
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
      await this._execAsync(`${this._binPath} telemetry on`, this._rootPath);

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

    // 미설치 플러그인들 설치
    if (this._config.plugins) {
      const pluginsFetch = FsUtil.exists(path.resolve(this.cordovaPath, "plugins/fetch.json"))
        ? await FsUtil.readJsonAsync(path.resolve(this.cordovaPath, "plugins/fetch.json"))
        : undefined;
      const alreadyPlugins = pluginsFetch != undefined
        ? Object.values(pluginsFetch)
          .map((item: any) => (item.source.id !== undefined ? item.source.id.replace(/@.*$/, "") : item.source.url))
        : [];

      for (const plugin of this._config.plugins.distinct()) {
        if (!alreadyPlugins.includes(plugin)) {
          await this._execAsync(`${this._binPath} plugin add ${plugin}`, this.cordovaPath);
        }
      }
    }

    // ICON 파일 복사
    if (this._config.icon !== undefined) {
      await FsUtil.copyAsync(path.resolve(this._rootPath, this._config.icon), path.resolve(this.cordovaPath, "res", "icon", "icon.png"));
    }

    // ANDROID GRADLE 오류 강제 수정
    // if (this._config.targets.includes("android")) {
    //   const gradleFilePath = path.resolve(this._cordovaPath, "platforms/android/app/build.gradle");
    //   let gradleFileContent = await FsUtil.readFileAsync(gradleFilePath);
    //   gradleFileContent = gradleFileContent.replace(/lintOptions {/g, "lintOptions {\r\n      checkReleaseBuilds false;");
    //   await FsUtil.writeFileAsync(gradleFilePath, gradleFileContent);
    // }

    // CONFIG
    const configFilePath = path.resolve(this.cordovaPath, "config.xml");
    let configFileContent = await FsUtil.readFileAsync(configFilePath);

    // CONFIG: 버전 설정
    configFileContent = configFileContent.replace(/version="[^"]*"/g, `version="${this._npmConfig.version}"`);

    // CONFIG: ICON 설정
    if (this._config.icon !== undefined && !configFileContent.includes("<icon")) {
      configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
    }

    // CONFIG: ANDROID usesCleartextTraffic 설정
    // if (this._config.targets.includes("android")) {
    //   if (!configFileContent.includes("xmlns:android=\"http://schemas.android.com/apk/res/android\"")) {
    //     configFileContent = configFileContent.replace(
    //       "xmlns=\"http://www.w3.org/ns/widgets\"",
    //       `xmlns="http://www.w3.org/ns/widgets" xmlns:android="http://schemas.android.com/apk/res/android"`
    //     );
    //   }
    //   if (!configFileContent.includes("application android:usesCleartextTraffic=\"true\" />")) {
    //     configFileContent = configFileContent.replace("<platform name=\"android\">", `<platform name="android">
    //     <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
    //         <application android:usesCleartextTraffic="true" />
    //     </edit-config>`);
    //   }
    // }

    // CONFIG: 파일쓰기
    await FsUtil.writeFileAsync(configFilePath, configFileContent);
  }

  public async buildAsync(outPath: string): Promise<void> {
    // ANDROID 서명 처리
    if (this._config.buildOption?.sign?.android) {
      await FsUtil.copyAsync(
        path.resolve(this._rootPath, this._config.buildOption.sign.android.keystore),
        path.resolve(this.cordovaPath, path.basename(this._config.buildOption.sign.android.keystore))
      );
      await FsUtil.writeJsonAsync(
        path.resolve(this.cordovaPath, "build.json"),
        {
          android: {
            release: {
              keystore: path.basename(this._config.buildOption.sign.android.keystore),
              storePassword: this._config.buildOption.sign.android.storePassword,
              alias: this._config.buildOption.sign.android.alias,
              password: this._config.buildOption.sign.android.password,
              keystoreType: this._config.buildOption.sign.android.keystoreType
            }
          }
        }
      );
    }

    // CONFIG
    const configFilePath = path.resolve(this.cordovaPath, "config.xml");
    let configFileContent = await FsUtil.readFileAsync(configFilePath);

    // CONFIG: 접근허용 일단 모두 지우기
    configFileContent = configFileContent.replace(/ {4}<allow-navigation href="[^"]*" \/>\n/g, "");

    // CONFIG: 접근허용 등록
    // configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="file://data/user/*" />\n</widget>`);
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="*://*/*" />\n</widget>`);

    // CONFIG: 파일쓰기
    await FsUtil.writeFileAsync(configFilePath, configFileContent);

    // 실행
    const buildType = this._config.buildOption?.debug ? "debug" : "release";
    const packageType = this._config.buildOption?.bundle ? "bundle" : "apk";
    for (const platform of this.platforms) {
      await this._execAsync(`${this._binPath} build ${platform} --${buildType} --packageType=${packageType}`, this.cordovaPath);
    }

    // 결과물 복사
    for (const platform of this.platforms) {
      if (platform === "android") {
        const targetOutPath = path.resolve(outPath, platform);
        const apkFileName = this._config.buildOption?.sign?.android ? `app-${buildType}.apk` : `app-${buildType}-unsigned.apk`;
        const distApkFileName = path.basename(`${this._config.appName}${this._config.buildOption?.sign?.android ? "" : "-unsigned"}-v${this._npmConfig.version}.apk`);
        const latestDistApkFileName = path.basename(`${this._config.appName}${this._config.buildOption?.sign?.android ? "" : "-unsigned"}-latest.apk`);
        await FsUtil.mkdirsAsync(targetOutPath);
        await FsUtil.copyAsync(
          path.resolve(this.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
          path.resolve(targetOutPath, distApkFileName)
        );
        await FsUtil.copyAsync(
          path.resolve(this.cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
          path.resolve(targetOutPath, latestDistApkFileName)
        );
      }
      else {
        throw new NotImplementError();
      }
    }

    // 자동업데이트를 위한 zip 파일 쓰기
    const zip = new JSZip();
    const resultFiles = await FsUtil.globAsync(path.resolve(this.cordovaPath, "www", "**/*"), {
      dot: true,
      nodir: true
    });
    for (const resultFile of resultFiles) {
      const contentBuffer = await FsUtil.readFileBufferAsync(resultFile);
      const relativePath = path.relative(path.resolve(this.cordovaPath, "www"), resultFile);
      zip.file("/" + relativePath, contentBuffer);
    }

    const zipFileName = path.basename(`${this._config.appName}-v${this._npmConfig.version}.zip`);
    const resultBuffer = await zip.generateAsync({ type: "nodebuffer" });

    await FsUtil.writeFileAsync(path.resolve(outPath, "updates/", zipFileName), resultBuffer);
  }

  public static async runWebviewOnDeviceAsync(cordovaPath: string, platform: TSdCliCordovaPlatform, url: string): Promise<void> {
    await FsUtil.removeAsync(path.resolve(cordovaPath, "www"));
    await FsUtil.mkdirsAsync(path.resolve(cordovaPath, "www"));
    await FsUtil.writeFileAsync(path.resolve(cordovaPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url}"}, 3000);</script>`.trim());

    // CONFIG
    const configFilePath = path.resolve(cordovaPath, "config.xml");
    let configFileContent = await FsUtil.readFileAsync(configFilePath);

    // CONFIG: 접근허용 일단 모두 지우기
    configFileContent = configFileContent.replace(/ {4}<allow-navigation href="[^"]*" \/>\n/g, "");

    // CONFIG: 접근허용 등록
    // configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${url}" />\n</widget>`);
    // configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${url}/*" />\n</widget>`);
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="*://*/*" />\n</widget>`);

    // CONFIG: 파일쓰기
    await FsUtil.writeFileAsync(configFilePath, configFileContent);

    const binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");
    await SdProcess.spawnAsync(`${binPath} run ${platform} --device`, { cwd: cordovaPath });
  }
}
