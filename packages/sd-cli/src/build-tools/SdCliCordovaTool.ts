import { FsUtil, Logger, SdProcessManager } from "@simplysm/sd-core-node";
import * as path from "path";
import { ISdClientPackageConfigAndroidPlatform } from "../commons";

export class SdCliCordovaTool {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string,
                     private readonly _platform: ISdClientPackageConfigAndroidPlatform) {
  }

  public async initializeAsync(): Promise<void> {
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    await SdProcessManager.spawnAsync(
      `${cordovaBinPath} telemetry on`,
      { cwd: this._rootPath },
      (message) => {
        this._logger.debug("CORDOVA: " + message);
      }
    );

    const cordovaProjectPath = path.resolve(this._rootPath, ".cordova");

    // 프로젝트 삭제
    if (FsUtil.exists(cordovaProjectPath)) {
      this._logger.debug(`CORDOVA 기존 프로젝트 삭제`);
      await FsUtil.removeAsync(cordovaProjectPath);
    }

    // 프로젝트 생성
    this._logger.debug(`CORDOVA 프로젝트 생성`);
    await SdProcessManager.spawnAsync(
      `${cordovaBinPath} create "${cordovaProjectPath}" "${this._platform.appId}" "${this._platform.appName}"`,
      { cwd: process.cwd() },
      (message) => {
        this._logger.debug("CORDOVA: " + message);
      }
    );

    // www 폴더 혹시 없으면 생성
    await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));

    // 플랫폼 디바이스 설정
    if (!FsUtil.exists(path.resolve(cordovaProjectPath, "platforms", this._platform.type))) {
      this._logger.debug(`CORDOVA 플랫폼 생성: ${this._platform.type}`);
      await SdProcessManager.spawnAsync(
        `${cordovaBinPath} platform add ${this._platform.type}`,
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

    if (this._platform.plugins) {
      for (const plugin of this._platform.plugins) {
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

  /*public async simulateAsync(url: string): Promise<void> {
    const cordovaBinPath = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

    const cordovaProjectPath = path.resolve(this._rootPath, ".cordova");

    await FsUtil.removeAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.mkdirsAsync(path.resolve(cordovaProjectPath, "www"));
    await FsUtil.writeFileAsync(path.resolve(cordovaProjectPath, "www/index.html"), `'${url}'로 이동중... <script>setTimeout(function () {window.location.href = "${url}"}, 3000);</script>`.trim());


  }*/
}