import { INpmConfig, ISdClientCordovaPlatformConfig } from "../commons";
import * as path from "path";
import { FsUtil, Logger, SdProcessManager } from "@simplysm/sd-core-node";
import { NeverEntryError } from "@simplysm/sd-core-common";

export class SdCliCordova {
  protected readonly _logger: Logger;

  private readonly _npmConfig: INpmConfig;

  private readonly _cordovaPath = path.resolve(this._rootPath, ".cordova");
  private readonly _binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

  public constructor(private readonly _rootPath: string, private readonly _config: ISdClientCordovaPlatformConfig) {
    this._npmConfig = FsUtil.readJson(path.resolve(this._rootPath, "package.json"));
    this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this._npmConfig.name]);
  }

  public async initializeAsync(): Promise<void> {
    if (FsUtil.exists(this._cordovaPath)) {
      this._logger.log("미리 생성되어있는 '.cordova'를 사용합니다.");
    }
    else {
      await SdProcessManager.spawnAsync(
        `${this._binPath} telemetry on`,
        { cwd: this._rootPath },
        (message) => {
          this._logger.debug("CORDOVA: " + message);
        }
      );

      // 프로젝트 삭제
      /*if (FsUtil.exists(this._cordovaPath)) {
        this._logger.debug(`CORDOVA 기존 프로젝트 삭제`);
        await FsUtil.removeAsync(this._cordovaPath);
      }*/

      // 프로젝트 생성
      this._logger.debug(`CORDOVA 프로젝트 생성`);
      await SdProcessManager.spawnAsync(
        `${this._binPath} create "${this._cordovaPath}" "${this._config.appId}" "${this._config.appName}"`,
        { cwd: process.cwd() },
        (message) => {
          this._logger.debug("CORDOVA: " + message);
        }
      );
    }

    // www 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(this._cordovaPath, "www"));

    // BROWSER 플랫폼 미설치시 신규 생성
    const alreadyPlatforms = await FsUtil.readdirAsync(path.resolve(this._cordovaPath, "platforms"));
    if (!alreadyPlatforms.includes("browser")) {
      this._logger.debug(`CORDOVA 플랫폼 생성: browser`);
      await SdProcessManager.spawnAsync(
        `${this._binPath} platform add browser`,
        { cwd: this._cordovaPath },
        (message) => {
          this._logger.debug("CORDOVA: " + message);
        }
      );
    }

    // 미설치 빌드 플랫폼 신규 생성
    for (const target of this._config.targets) {
      if (!alreadyPlatforms.includes(target)) {
        this._logger.debug(`CORDOVA 플랫폼 생성: ${target}`);
        await SdProcessManager.spawnAsync(
          `${this._binPath} platform add ${target}`,
          { cwd: this._cordovaPath },
          (message) => {
            this._logger.debug(`CORDOVA: ${target}: ${message}`);
          }
        );
      }
    }

    // 미설치 플러그인들 설치
    if (this._config.plugins) {
      const pluginsFetch = await FsUtil.readJsonAsync(path.resolve(this._cordovaPath, "plugins/fetch.json"));
      const alreadyPlugins = Object.values(pluginsFetch)
        .map((item: any) => (item.source.id !== undefined ? item.source.id.replace(/@.*$/, "") : item.source.url));

      for (const plugin of this._config.plugins.distinct()) {
        if (!alreadyPlugins.includes(plugin)) {
          this._logger.debug(`CORDOVA 플러그인 설치 ${plugin}`);
          await SdProcessManager.spawnAsync(
            `${this._binPath} plugin add ${plugin}`,
            { cwd: this._cordovaPath },
            (message) => {
              this._logger.debug("CORDOVA: " + message);
            }
          );
        }
      }
    }

    // 서명 처리
    if (this._config.sign) {
      await FsUtil.copyAsync(
        path.resolve(this._rootPath, this._config.sign.keystore),
        path.resolve(this._cordovaPath, path.basename(this._config.sign.keystore))
      );
      await FsUtil.writeJsonAsync(
        path.resolve(this._cordovaPath, "build.json"),
        {
          android: {
            release: {
              keystore: path.basename(this._config.sign.keystore),
              storePassword: this._config.sign.storePassword,
              alias: this._config.sign.alias,
              password: this._config.sign.password,
              keystoreType: this._config.sign.keystoreType
            }
          }
        }
      );
    }

    // ICON 파일 복사
    if (this._config.icon !== undefined) {
      await FsUtil.copyAsync(path.resolve(this._rootPath, this._config.icon), path.resolve(this._cordovaPath, "res", "icon", "icon.png"));
    }

    // ANDROID GRADLE 오류 강제 수정
    if (this._config.targets.includes("android")) {
      const gradleFilePath = path.resolve(this._cordovaPath, "platforms/android/app/build.gradle");
      let gradleFileContent = await FsUtil.readFileAsync(gradleFilePath);
      gradleFileContent = gradleFileContent.replace(/lintOptions {/g, "lintOptions {\r\n      checkReleaseBuilds false;");
      await FsUtil.writeFileAsync(gradleFilePath, gradleFileContent);
    }

    // CONFIG
    const configFilePath = path.resolve(this._cordovaPath, "config.xml");
    let configFileContent = await FsUtil.readFileAsync(configFilePath);

    // CONFIG: 버전 설정
    configFileContent = configFileContent.replace(/version="[^"]*"/g, `version="${this._npmConfig.version}"`);

    // CONFIG: ICON 설정
    if (this._config.icon !== undefined && !configFileContent.includes("<icon")) {
      configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
    }

    // CONFIG: ANDROID usesCleartextTraffic 설정
    if (this._config.targets.includes("android")) {
      if (!configFileContent.includes("xmlns:android=\"http://schemas.android.com/apk/res/android\"")) {
        configFileContent = configFileContent.replace(
          "xmlns=\"http://www.w3.org/ns/widgets\"",
          `xmlns="http://www.w3.org/ns/widgets" xmlns:android="http://schemas.android.com/apk/res/android"`
        );
      }
      if (!configFileContent.includes("application android:usesCleartextTraffic=\"true\" />")) {
        configFileContent = configFileContent.replace("<platform name=\"android\">", `<platform name="android">
        <edit-config file="app/src/main/AndroidManifest.xml" mode="merge" target="/manifest/application">
            <application android:usesCleartextTraffic="true" />
        </edit-config>`);
      }
    }

    // CONFIG: 파일쓰기
    await FsUtil.writeFileAsync(configFilePath, configFileContent);
  }

  public async buildAsync(outPath: string): Promise<void> {
    // CONFIG
    const configFilePath = path.resolve(this._cordovaPath, "config.xml");
    let configFileContent = await FsUtil.readFileAsync(configFilePath);

    // CONFIG: 외부접근 허용안함
    configFileContent = configFileContent.replace(/<allow-navigation href="[^"]"\s?\/>/g, "");

    // CONFIG: 파일쓰기
    await FsUtil.writeFileAsync(configFilePath, configFileContent);

    // 실행
    for (const target of this._config.targets) {
      await SdProcessManager.spawnAsync(`${this._binPath} build ${target} --release`, { cwd: this._cordovaPath }, (message) => {
        this._logger.debug(`CORDOVA: ${target}: ${message}`);
      });
    }

    // 결과물 복사
    for (const target of this._config.targets) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (target === "android") {
        const apkFileName = this._config.sign !== undefined ? "app-release.apk" : "app-release-unsigned.apk";
        const distApkFileName = path.basename(`${this._config.appName}${this._config.sign !== undefined ? "" : "-unsigned"}-v${this._npmConfig.version}.apk`);
        await FsUtil.mkdirsAsync(outPath);
        await FsUtil.copyAsync(
          path.resolve(this._cordovaPath, "platforms/android/app/build/outputs/apk/release", apkFileName),
          path.resolve(outPath, distApkFileName)
        );
      }
      else {
        throw new NeverEntryError();
      }
    }
  }

  public static async runWebviewOnDeviceAsync(cordovaPath: string, target: string, url: string): Promise<void> {
    await FsUtil.removeAsync(path.resolve(cordovaPath, "www"));
    await FsUtil.mkdirsAsync(path.resolve(cordovaPath, "www"));
    await FsUtil.writeFileAsync(path.resolve(cordovaPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url}"}, 3000);</script>`.trim());

    // CONFIG
    const configFilePath = path.resolve(cordovaPath, "config.xml");
    let configFileContent = await FsUtil.readFileAsync(configFilePath);

    // CONFIG: 외부 접근 허용
    if (!(/<allow-navigation href="[^"]"\s?\/>/).test(configFileContent)) {
      configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${url}" />\n</widget>`);
      configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${url}/*" />\n</widget>`);
    }

    // CONFIG: 파일쓰기
    await FsUtil.writeFileAsync(configFilePath, configFileContent);

    const binPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");
    await SdProcessManager.spawnAsync(`${binPath} run ${target} --device`, { cwd: cordovaPath });
  }
}
