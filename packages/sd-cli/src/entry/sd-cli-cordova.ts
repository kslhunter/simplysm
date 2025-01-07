import * as path from "path";
import { FsUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import xml2js from "xml2js";
import JSZip from "jszip";
import { INpmConfig } from "../types/common-configs.types";
import { ISdClientBuilderCordovaConfig } from "../types/config.types";

// const BIN_PATH = path.resolve(process.cwd(), "node_modules/.bin/cordova.cmd");

export class SdCliCordova {
  private _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliCordova"]);

  private _platforms: string[];
  private _npmConfig: INpmConfig;

  constructor(private readonly _opt: { pkgPath: string; config: ISdClientBuilderCordovaConfig }) {
    this._platforms = Object.keys(this._opt.config.platform ?? { browser: {} });
    this._npmConfig = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    // this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name, this._npmConfig.name]);
  }

  private async _execAsync(cmd: string, cwd: string): Promise<void> {
    this._logger.debug(cmd);
    const msg = await SdProcess.spawnAsync(cmd, { cwd });
    this._logger.debug(msg);
  }

  public async initializeAsync(): Promise<void> {
    const cordovaPath = path.resolve(this._opt.pkgPath, ".cordova");

    if (FsUtils.exists(cordovaPath)) {
      this._logger.log("이미 생성되어있는 '.cordova'를 사용합니다.");
    }
    else {
      await this._execAsync(`npx cordova telemetry on`, this._opt.pkgPath);

      // 프로젝트 생성
      await this._execAsync(
        `npx cordova create "${cordovaPath}" "${this._opt.config.appId}" "${this._opt.config.appName}"`,
        process.cwd(),
      );

      // volta
      // await this._execAsync(`volta pin node@18`, cordovaPath);

      // package.json 수정
      /*const npmConfig = FsUtil.readJson(path.resolve(cordovaPath, "package.json"));
      npmConfig.volta = {
        node: process.version.substring(1)
      };
      FsUtil.writeJson(path.resolve(cordovaPath, "package.json"), npmConfig);*/
    }

    // platforms 폴더 혹시 없으면 생성
    FsUtils.mkdirs(path.resolve(cordovaPath, "platforms"));

    // www 폴더 혹시 없으면 생성
    FsUtils.mkdirs(path.resolve(cordovaPath, "www"));

    // 미설치 빌드 플랫폼 신규 생성
    const alreadyPlatforms = FsUtils.readdir(path.resolve(cordovaPath, "platforms"));
    for (const platform of this._platforms) {
      if (!alreadyPlatforms.includes(platform)) {
        // await this._execAsync(`${BIN_PATH} platform add ${platform}`, cordovaPath);
        if (platform === "android") {
          await this._execAsync(`npx cordova platform add ${platform}@12.0.0`, cordovaPath);
        }
        else {
          await this._execAsync(`npx cordova platform add ${platform}`, cordovaPath);
        }
      }
    }

    // 설치 미빌드 플랫폼 삭제
    /*for (const alreadyPlatform of alreadyPlatforms) {
      if (!this._platforms.includes(alreadyPlatform)) {
        await this._execAsync(`${BIN_PATH} platform remove ${alreadyPlatform}`, cordovaPath);
      }
    }*/

    // 설치된 미사용 플러그인 삭제
    const pluginsFetch = FsUtils.exists(path.resolve(cordovaPath, "plugins/fetch.json"))
      ? FsUtils.readJson(path.resolve(cordovaPath, "plugins/fetch.json"))
      : undefined;

    const alreadyPlugins: { name: string; id: string }[] = [];

    if (pluginsFetch != null) {
      for (const key of Object.keys(pluginsFetch)) {
        alreadyPlugins.push({
          name: key,
          id: pluginsFetch[key].source.id,
        });
      }
    }

    const usePlugins = (this._opt.config.plugins ?? []).distinct();

    // TODO: Dependency에 의해 설치된 플러그인 삭제되면 안됨 android.json의 installed_plugin으로 변경하면 될지도?
    /*for (const alreadyPlugin of alreadyPlugins) {
      let hasPlugin = false;
      for (const usePlugin of usePlugins) {
        if (alreadyPlugin.name === usePlugin || alreadyPlugin.id === usePlugin) {
          hasPlugin = true;
          break;
        }
      }

      if (!hasPlugin) {
        await this._execAsync(`${BIN_PATH} plugin remove ${alreadyPlugin.name}`, cordovaPath);
      }
    }*/

    // 미설치 플러그인들 설치
    for (const usePlugin of usePlugins) {
      if (!alreadyPlugins.some((item) => usePlugin === item.id || usePlugin === item.name)) {
        await this._execAsync(`npx cordova plugin add ${usePlugin}`, cordovaPath);
      }
    }

    // ANDROID SIGN 파일 복사
    if (this._opt.config.platform?.android?.sign) {
      FsUtils.copy(
        path.resolve(this._opt.pkgPath, this._opt.config.platform.android.sign.keystore),
        path.resolve(cordovaPath, "android.keystore"),
      );
    }
    else {
      FsUtils.remove(path.resolve(cordovaPath, "android.keystore"));
      // SIGN을 안쓸경우 아래 파일이 생성되어 있으면 오류남
      FsUtils.remove(path.resolve(cordovaPath, "platforms/android/release-signing.properties"));
    }

    // 빌드 옵션 파일 생성
    FsUtils.writeJson(path.resolve(cordovaPath, "build.json"), {
      ...(this._opt.config.platform?.android
        ? {
          android: {
            release: {
              packageType: this._opt.config.platform.android.bundle ? "bundle" : "apk",
              ...(this._opt.config.platform.android.sign
                ? {
                  keystore: path.resolve(cordovaPath, "android.keystore"),
                  storePassword: this._opt.config.platform.android.sign.storePassword,
                  alias: this._opt.config.platform.android.sign.alias,
                  password: this._opt.config.platform.android.sign.password,
                  keystoreType: this._opt.config.platform.android.sign.keystoreType,
                }
                : {}),
            },
          },
        }
        : {}),
    });

    // ICON 파일 복사
    if (this._opt.config.icon != null) {
      FsUtils.copy(
        path.resolve(this._opt.pkgPath, this._opt.config.icon),
        path.resolve(cordovaPath, "res/icons", path.basename(this._opt.config.icon)),
      );
    }
    else {
      FsUtils.remove(path.resolve(cordovaPath, "res/icons"));
    }

    // SplashScreen 파일 생성
    if (this._opt.config.platform?.android && this._opt.config.icon != null) {
      FsUtils.writeFile(
        path.resolve(cordovaPath, "res/screen/android/splashscreen.xml"),
        `
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item
    android:width="48dp"
    android:height="48dp"
    android:drawable="@mipmap/ic_launcher"
    android:gravity="center" />
</layer-list>`.trim(),
      );
    }

    // CONFIG: 초기값 백업
    const configFilePath = path.resolve(cordovaPath, "config.xml");
    const configBackFilePath = path.resolve(cordovaPath, "config.xml.bak");
    if (!FsUtils.exists(configBackFilePath)) {
      FsUtils.copy(configFilePath, configBackFilePath);
    }

    // CONFIG: 초기값 읽기
    const configFileContent = FsUtils.readFile(configBackFilePath);
    const configXml = await xml2js.parseStringPromise(configFileContent);

    // CONFIG: 버전 설정
    configXml.widget.$.version = this._npmConfig.version;

    // CONFIG: ICON 설정
    if (this._opt.config.icon != null) {
      configXml["widget"]["icon"] = [
        {
          $: {
            src: "res/icons/"
              + path.basename(this._opt.config.icon),
          },
        },
      ];
    }

    // CONFIG: 접근허용 세팅
    configXml["widget"]["access"] = [{ $: { origin: "*" } }];
    configXml["widget"]["allow-navigation"] = [{ $: { href: "*" } }];
    configXml["widget"]["allow-intent"] = [{ $: { href: "*" } }];
    configXml["widget"]["preference"] = [{ $: { name: "MixedContentMode", value: "0" } }];

    // CONFIG: ANDROID usesCleartextTraffic 설정 및 splashscreen 파일 설정
    if (this._opt.config.platform?.android) {
      configXml.widget.$["xmlns:android"] = "http://schemas.android.com/apk/res/android";

      configXml["widget"]["platform"] = configXml["widget"]["platform"] ?? [];

      const androidPlatform = {
        "$": {
          name: "android",
        },
        "preference": [
          {
            $: {
              name: "AndroidWindowSplashScreenAnimatedIcon",
              value: "res/screen/android/splashscreen.xml",
            },
          },
        ],
        "edit-config": [
          {
            $: {
              file: "app/src/main/AndroidManifest.xml",
              mode: "merge",
              target: "/manifest/application",
            },
            application: [
              {
                $: {
                  "android:usesCleartextTraffic": "true",
                },
              },
            ],
          },
        ],
      };

      if (this._opt.config.platform.android.sdkVersion != null) {
        androidPlatform.preference.push(
          ...[
            {
              $: {
                name: "android-maxSdkVersion",
                value: `${this._opt.config.platform.android.sdkVersion}`,
              },
            },
            {
              $: {
                name: "android-minSdkVersion",
                value: `${this._opt.config.platform.android.sdkVersion}`,
              },
            },
            {
              $: {
                name: "android-targetSdkVersion",
                value: `${this._opt.config.platform.android.sdkVersion}`,
              },
            },
            {
              $: {
                name: "android-compileSdkVersion",
                value: `33`,
              },
            },
          ],
        );
      }

      if (this._opt.config.platform.android.permissions) {
        androidPlatform["config-file"] = androidPlatform["config-file"] ?? [];
        androidPlatform["config-file"].push({
          "$": {
            target: "AndroidManifest.xml",
            parent: "/*",
          },
          "uses-permission": this._opt.config.platform.android.permissions.map((perm) => ({
            $: {
              "android:name": `android.permission.${perm.name}`,
              ...(perm.maxSdkVersion != null
                ? {
                  "android:maxSdkVersion": `${perm.maxSdkVersion}`,
                }
                : {}),
            },
          })),
        });
      }

      configXml["widget"]["platform"].push(androidPlatform);
    }

    // CONFIG: 파일 새로 쓰기
    const configResultContent = new xml2js.Builder().buildObject(configXml);
    FsUtils.writeFile(configFilePath, configResultContent);

    //android.json의 undefined 문제 해결
    /*const androidJsonFilePath = path.resolve(cordovaPath, "platforms/android/android.json");
    if (FsUtil.exists(androidJsonFilePath)) {
      const androidConf = FsUtil.readJson(androidJsonFilePath);
      if (androidConf.config_munge.files["undefined"] != null) {
        delete androidConf.config_munge.files["undefined"];
      }
      FsUtil.writeJson(androidJsonFilePath, androidConf, { space: 2 });
    }*/

    // 각 플랫폼 www 준비
    await this._execAsync(`npx cordova prepare`, cordovaPath);
  }

  public async buildAsync(outPath: string): Promise<void> {
    const cordovaPath = path.resolve(this._opt.pkgPath, ".cordova");

    // 실행
    const buildType = this._opt.config.debug ? "debug" : "release";
    for (const platform of this._platforms) {
      await this._execAsync(`npx cordova build ${platform} --${buildType}`, cordovaPath);
    }

    for (const platform of Object.keys(this._opt.config.platform ?? {})) {
      const targetOutPath = path.resolve(outPath, platform);

      // 결과물 복사: ANDROID
      if (platform === "android") {
        const apkFileName = this._opt.config.platform!.android!.sign
          ? `app-${buildType}.apk`
          : `app-${buildType}-unsigned.apk`;
        const latestDistApkFileName = path.basename(
          `${this._opt.config.appName}${this._opt.config.platform!.android!.sign
            ? ""
            : "-unsigned"}-latest.apk`,
        );
        FsUtils.mkdirs(targetOutPath);
        FsUtils.copy(
          path.resolve(
            cordovaPath,
            "platforms/android/app/build/outputs/apk",
            buildType,
            apkFileName,
          ),
          path.resolve(targetOutPath, latestDistApkFileName),
        );
      }

      // 자동업데이트를 위한 파일 쓰기 (ZIP)
      const zip = new JSZip();
      const wwwFiles = FsUtils.glob(path.resolve(cordovaPath, "www/**/*"), { nodir: true });
      for (const wwwFile of wwwFiles) {
        const relFilePath = path.relative(path.resolve(cordovaPath, "www"), wwwFile);
        const fileBuffer = FsUtils.readFileBuffer(wwwFile);
        zip.file(relFilePath, fileBuffer);
      }
      const platformWwwFiles = FsUtils.glob(path.resolve(
        cordovaPath,
        "platforms",
        platform,
        "platform_www/**/*",
      ), {
        nodir: true,
      });
      for (const platformWwwFile of platformWwwFiles) {
        const relFilePath = path.relative(
          path.resolve(cordovaPath, "platforms", platform, "platform_www"),
          platformWwwFile,
        );
        const fileBuffer = FsUtils.readFileBuffer(platformWwwFile);
        zip.file(relFilePath, fileBuffer);
      }

      FsUtils.writeFile(
        path.resolve(path.resolve(outPath, platform, "updates"), this._npmConfig.version + ".zip"),
        await zip.generateAsync({ type: "nodebuffer" }),
      );
    }
  }

  public static async runWebviewOnDeviceAsync(opt: {
    platform: string;
    pkgName: string;
    url?: string
  }): Promise<void> {
    const cordovaPath = path.resolve(process.cwd(), `packages/${opt.pkgName}/.cordova/`);

    if (opt.url !== undefined) {
      FsUtils.remove(path.resolve(cordovaPath, "www"));
      FsUtils.mkdirs(path.resolve(cordovaPath, "www"));
      FsUtils.writeFile(
        path.resolve(cordovaPath, "www/index.html"),
        `'${opt.url}'로 이동중... <script>setTimeout(function () {window.location.href = "${opt.url.replace(
          /\/$/,
          "",
        )}/${opt.pkgName}/cordova/"}, 3000);</script>`.trim(),
      );
    }

    await SdProcess.spawnAsync(`npx cordova run ${opt.platform} --device`, { cwd: cordovaPath });
  }
}
