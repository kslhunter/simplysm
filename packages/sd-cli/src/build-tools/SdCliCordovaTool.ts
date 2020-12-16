import { FsUtil, Logger, SdProcessManager } from "@simplysm/sd-core-node";
import * as path from "path";
import { ISdClientPackageConfigAndroidPlatform } from "../commons";

export class SdCliCordovaTool {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public async initializeAsync(rootPath: string, platform: ISdClientPackageConfigAndroidPlatform): Promise<void> {
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    await SdProcessManager.spawnAsync(
      `${cordovaBinPath} telemetry on`,
      { cwd: rootPath },
      (message) => {
        this._logger.debug("CORDOVA: " + message);
      }
    );

    const cordovaProjectPath = path.resolve(rootPath, ".cordova");

    // 프로젝트 삭제
    if (FsUtil.exists(cordovaProjectPath)) {
      this._logger.debug(`CORDOVA 기존 프로젝트 삭제`);
      await FsUtil.removeAsync(cordovaProjectPath);
    }

    // 프로젝트 생성
    this._logger.debug(`CORDOVA 프로젝트 생성`);
    await SdProcessManager.spawnAsync(
      `${cordovaBinPath} create "${cordovaProjectPath}" "${platform.appId}" "${platform.appName}"`,
      { cwd: process.cwd() },
      (message) => {
        this._logger.debug("CORDOVA: " + message);
      }
    );

    // www 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));

    // 플랫폼 디바이스 설정
    if (!FsUtil.exists(path.resolve(cordovaProjectPath, "platforms", "android"))) {
      this._logger.debug(`CORDOVA 플랫폼 생성: android`);
      await SdProcessManager.spawnAsync(
        `${cordovaBinPath} platform add android`,
        { cwd: cordovaProjectPath },
        (message) => {
          this._logger.debug("CORDOVA: " + message);
        }
      );
    }

    if (!FsUtil.exists(path.resolve(cordovaProjectPath, "platforms", "browser"))) {
      this._logger.debug(`CORDOVA 플랫폼 생성: browser`);
      await SdProcessManager.spawnAsync(
        `${cordovaBinPath} platform add browser`,
        { cwd: cordovaProjectPath },
        (message) => {
          this._logger.debug("CORDOVA: " + message);
        }
      );
    }

    // 플러그인 설치
    const cordovaFetchConfig = await FsUtil.readJsonAsync(path.resolve(cordovaProjectPath, "plugins/fetch.json"));
    const prevPlugins = Object.values(cordovaFetchConfig)
      .map((item: any) => (item.source.id !== undefined ? item.source.id.replace(/@.*$/, "") : item.source.url));

    if (platform.plugins) {
      for (const plugin of platform.plugins) {
        if (!prevPlugins.includes(plugin)) {
          this._logger.debug(`CORDOVA 플러그인 설치 ${plugin}`);
          await SdProcessManager.spawnAsync(
            `${cordovaBinPath} plugin add ${plugin}`,
            { cwd: cordovaProjectPath },
            (message) => {
              this._logger.debug("CORDOVA: " + message);
            }
          );
        }
      }
    }
  }

  public async runDeviceAsync(cordovaProjectPath: string, url: string): Promise<void> {
    await FsUtil.removeAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.writeFileAsync(path.resolve(cordovaProjectPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url}"}, 3000);</script>`.trim());


    let configFileContent = await FsUtil.readFileAsync(path.resolve(cordovaProjectPath, "config.xml"));
    configFileContent = configFileContent.replace(/ {4}<allow-navigation href="[^"]*"\s?\/>\n/g, "");
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${url}" />\n</widget>`);
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${url}/*" />\n</widget>`);
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

    await FsUtil.writeFileAsync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent);

    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");
    await SdProcessManager.spawnAsync(`${cordovaBinPath} run android --device`, { cwd: cordovaProjectPath });
  }
}