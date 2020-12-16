import { FsUtil, Logger, SdProcessManager } from "@simplysm/sd-core-node";
import * as path from "path";
import { ISdClientPackageConfigAndroidPlatform } from "../commons";

export class SdCliCordovaTool {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string,
                     private readonly _platform: ISdClientPackageConfigAndroidPlatform,
                     private readonly _device: "android" | "browser") {
  }

  public async initializeAsync(url: string): Promise<void> {
    const cordovaProjectPath = path.resolve(this._rootPath, ".cordova");
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    // await SdProcessManager.spawnAsync(`${cordovaBinPath} telemetry on`, { cwd: rootPath });

    // 프로젝트 생성
    if (!FsUtil.exists(cordovaProjectPath)) {
      this._logger.debug(`CORDOVA 프로젝트 생성`);
      await SdProcessManager.spawnAsync(`${cordovaBinPath} create "${cordovaProjectPath}" "${this._platform.appId}" "${this._platform.appName}"`, { cwd: process.cwd() });
    }

    // www 폴더 혹시 없으면 생성
    // await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));

    // 플랫폼 디바이스 설정
    if (!FsUtil.exists(path.resolve(cordovaProjectPath, "platforms", this._device))) {
      this._logger.debug(`CORDOVA 플랫폼 생성: ${this._device}`);
      await SdProcessManager.spawnAsync(`${cordovaBinPath} platform add ${this._device}`, { cwd: cordovaProjectPath });
    }

    // 플러그인 설치
    const cordovaFetchConfig = await FsUtil.readJsonAsync(path.resolve(cordovaProjectPath, "plugins/fetch.json"));
    const prevPlugins = Object.values(cordovaFetchConfig)
      .map((item: any) => (item.source.id !== undefined ? item.source.id.replace(/@.*$/, "") : item.source.url));

    if (this._platform.plugins) {
      for (const plugin of this._platform.plugins) {
        if (!prevPlugins.includes(plugin)) {
          this._logger.debug(`CORDOVA 플러그인 설치 ${plugin}`);
          await SdProcessManager.spawnAsync(`${cordovaBinPath} plugin add ${plugin}`, { cwd: cordovaProjectPath });
        }
      }
    }

    await FsUtil.removeAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.writeFileAsync(path.resolve(cordovaProjectPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url}"}, 3000);</script>`.trim());
  }

  /*private async runAsync(url: string): Promise<void> {
    const cordovaProjectPath = path.resolve(this._rootPath, ".cordova");
    // const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    await FsUtil.removeAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.writeFileAsync(path.resolve(cordovaProjectPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url}"}, 3000);</script>`.trim());

    if (this._platform.icon !== undefined) {
      await FsUtil.copyAsync(
        path.resolve(this._rootPath, this._platform.icon),
        path.resolve(cordovaProjectPath, "res", "icon", "icon.png")
      );
    }

    let configFileContent = await FsUtil.readFileAsync(path.resolve(cordovaProjectPath, "config.xml"));
    /!*configFileContent = configFileContent.replace(/ {4}<allow-navigation href="[^"]*"\s?\/>\n/g, "");
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${serverUrl}" />\n</widget>`);
    configFileContent = configFileContent.replace("</widget>", `    <allow-navigation href="${serverUrl}/!*" />\n</widget>`);
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
    }*!/

    if (this._platform.icon !== undefined && !configFileContent.includes("<icon")) {
      configFileContent = configFileContent.replace("</widget>", "    <icon src=\"res/icon/icon.png\" />\r\n</widget>");
    }

    // configFileContent = configFileContent.replace("</widget>", "    <preference name=\"Orientation\" value=\"portrait\" />\r\n</widget>");

    await FsUtil.writeFileAsync(path.resolve(cordovaProjectPath, "config.xml"), configFileContent);

    // await SdProcessManager.spawnAsync(`${cordovaBinPath} run android --device`, { cwd: cordovaProjectPath });
  }*/
}