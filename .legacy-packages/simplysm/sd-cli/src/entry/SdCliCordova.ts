import * as path from "path";
import { FsUtils, PathUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import type { ISdClientBuilderCordovaConfig } from "../types/config/ISdProjectConfig";
import { SdZip, XmlConvert } from "@simplysm/sd-core-common";
import type { INpmConfig } from "../types/common-config/INpmConfig";

export class SdCliCordova {
  // 상수 정의
  private readonly _CORDOVA_DIR_NAME = ".cordova";
  private readonly _PLATFORMS_DIR_NAME = "platforms";
  private readonly _WWW_DIR_NAME = "www";

  private readonly _PLUGINS_DIR_NAME = "plugins";
  private readonly _PLUGINS_FETCH_FILE = "fetch.json";
  private readonly _ANDROID_SDK_VERSION = "35"; //cordova-android@14
  private readonly _KEYSTORE_FILE_NAME = "android.keystore";
  private readonly _CONFIG_XML_FILE_NAME = "config.xml";
  private readonly _CONFIG_XML_BACKUP_FILE_NAME = "config.xml.bak";
  private readonly _BUILD_JSON_FILE_NAME = "build.json";
  private readonly _ANDROID_SIGNING_PROP_PATH = "platforms/android/release-signing.properties";
  private readonly _ICON_DIR_PATH = "res/icons";
  private readonly _SPLASH_SCREEN_DIR_PATH = "res/screen/android";
  private readonly _SPLASH_SCREEN_XML_FILE = "splashscreen.xml";

  private readonly _platforms: string[];
  private readonly _npmConfig: INpmConfig;

  constructor(private readonly _opt: { pkgPath: string; config: ISdClientBuilderCordovaConfig }) {
    this._platforms = Object.keys(this._opt.config.platform ?? { browser: {} });
    this._npmConfig = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json"));
  }

  private static readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliCordova"]);

  private static async _execAsync(cmd: string, args: string[], cwd: string): Promise<void> {
    this._logger.debug(`실행 명령: ${cmd + " " + args.join(" ")}`);
    const msg = await SdProcess.spawnAsync(cmd, args, { cwd });
    this._logger.debug(`실행 결과: ${msg}`);
  }

  async initializeAsync(): Promise<void> {
    const cordovaPath = path.resolve(this._opt.pkgPath, this._CORDOVA_DIR_NAME);

    // 1. Cordova 프로젝트 초기화
    await this._initializeCordovaProjectAsync(cordovaPath);

    // 2. 플랫폼 관리
    await this._managePlatformsAsync(cordovaPath);

    // 3. 플러그인 관리
    await this._managePluginsAsync(cordovaPath);

    // 4. 안드로이드 서명 설정
    this._setupAndroidSign(cordovaPath);

    // 5. 빌드 설정 파일 생성
    this._createBuildConfig(cordovaPath);

    // 6. 아이콘 및 스플래시 스크린 설정
    this._setupIconAndSplashScreen(cordovaPath);

    // 7. XML 설정 구성
    this._configureXml(cordovaPath);

    // 8. 각 플랫폼 www 준비
    await SdCliCordova._execAsync("npx", ["cordova", "prepare"], cordovaPath);
  }

  // 1. Cordova 프로젝트 초기화
  private async _initializeCordovaProjectAsync(cordovaPath: string): Promise<void> {
    if (FsUtils.exists(cordovaPath)) {
      SdCliCordova._logger.log("이미 생성되어있는 '.cordova'를 사용합니다.");
    } else {
      // await SdCliCordova.#execAsync("npx", ["cordova", "telemetry", "on"], this._opt.pkgPath);

      // 프로젝트 생성
      await SdCliCordova._execAsync(
        "npx",
        ["cordova", "create", cordovaPath, this._opt.config.appId, this._opt.config.appName],
        process.cwd(),
      );
    }

    // platforms 폴더 혹시 없으면 생성
    FsUtils.mkdirs(path.resolve(cordovaPath, this._PLATFORMS_DIR_NAME));

    // www 폴더 혹시 없으면 생성
    FsUtils.mkdirs(path.resolve(cordovaPath, this._WWW_DIR_NAME));
  }

  // 2. 플랫폼 관리
  private async _managePlatformsAsync(cordovaPath: string): Promise<void> {
    const alreadyPlatforms = FsUtils.readdir(path.resolve(cordovaPath, this._PLATFORMS_DIR_NAME));

    // 미설치 빌드 플랫폼 신규 생성
    for (const platform of this._platforms) {
      if (alreadyPlatforms.includes(platform)) continue;

      await SdCliCordova._execAsync("npx", ["cordova", "platform", "add", platform], cordovaPath);
    }
  }

  // 3. 플러그인 관리
  private async _managePluginsAsync(cordovaPath: string): Promise<void> {
    const pluginsFetchPath = path.resolve(
      cordovaPath,
      this._PLUGINS_DIR_NAME,
      this._PLUGINS_FETCH_FILE,
    );
    const pluginsFetch = FsUtils.exists(pluginsFetchPath) ? FsUtils.readJson(pluginsFetchPath) : {};

    const alreadyPlugins: Array<{
      name: string;
      id: string;
      dependencies?: string[];
    }> = Object.keys(pluginsFetch).map((key) => ({
      name: key,
      id: pluginsFetch[key].source.id,
      dependencies: pluginsFetch[key].dependencies,
    }));

    const usePlugins = (this._opt.config.plugins ?? []).distinct();

    // 사용하지 않는 플러그인 제거 및 새 플러그인 설치 - 의존성 때문에 순차 처리
    await this._removeUnusedPluginsAsync(cordovaPath, alreadyPlugins, usePlugins);
    await this._installNewPluginsAsync(cordovaPath, alreadyPlugins, usePlugins);
  }

  private async _removeUnusedPluginsAsync(
    cordovaPath: string,
    alreadyPlugins: Array<{ name: string; id: string; dependencies?: string[] }>,
    usePlugins: string[],
  ): Promise<void> {
    for (const alreadyPlugin of alreadyPlugins) {
      if (!usePlugins.includes(alreadyPlugin.id) && !usePlugins.includes(alreadyPlugin.name)) {
        try {
          await SdCliCordova._execAsync(
            "npx",
            ["cordova", "plugin", "remove", alreadyPlugin.name],
            cordovaPath,
          );
        } catch (err) {
          // 의존성으로 인한 skip 메시지는 무시 (로그 생략)
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("is required by") || !msg.includes("skipping uninstallation")) {
            throw err;
          }
        }
      }
    }
  }

  private async _installNewPluginsAsync(
    cordovaPath: string,
    alreadyPlugins: Array<{ name: string; id: string; dependencies?: string[] }>,
    usePlugins: string[],
  ): Promise<void> {
    // 병렬로 플러그인을 설치하면 충돌이 발생할 수 있으므로 순차 처리
    for (const usePlugin of usePlugins) {
      const isPluginAlreadyInstalled = alreadyPlugins.some(
        (plugin) => usePlugin === plugin.id || usePlugin === plugin.name,
      );

      if (!isPluginAlreadyInstalled) {
        await SdCliCordova._execAsync("npx", ["cordova", "plugin", "add", usePlugin], cordovaPath);
      }
    }
  }

  // 4. 안드로이드 서명 설정
  private _setupAndroidSign(cordovaPath: string): void {
    const keystorePath = path.resolve(cordovaPath, this._KEYSTORE_FILE_NAME);
    const signingPropsPath = path.resolve(cordovaPath, this._ANDROID_SIGNING_PROP_PATH);

    if (this._opt.config.platform?.android?.sign) {
      FsUtils.copy(
        path.resolve(this._opt.pkgPath, this._opt.config.platform.android.sign.keystore),
        keystorePath,
      );
    } else {
      FsUtils.remove(keystorePath);
      // SIGN을 안쓸경우 아래 파일이 생성되어 있으면 오류남
      FsUtils.remove(signingPropsPath);
    }
  }

  // 5. 빌드 설정 파일 생성
  private _createBuildConfig(cordovaPath: string): void {
    const buildJsonPath = path.resolve(cordovaPath, this._BUILD_JSON_FILE_NAME);
    const keystorePath = path.resolve(cordovaPath, this._KEYSTORE_FILE_NAME);

    const androidConfig = this._opt.config.platform?.android
      ? {
          android: {
            release: {
              packageType: this._opt.config.platform.android.bundle ? "bundle" : "apk",
              ...(this._opt.config.platform.android.sign
                ? {
                    keystore: keystorePath,
                    storePassword: this._opt.config.platform.android.sign.storePassword,
                    alias: this._opt.config.platform.android.sign.alias,
                    password: this._opt.config.platform.android.sign.password,
                    keystoreType: this._opt.config.platform.android.sign.keystoreType,
                  }
                : {}),
            },
          },
        }
      : {};

    FsUtils.writeJson(buildJsonPath, androidConfig);
  }

  // 6. 아이콘 및 스플래시 스크린 설정
  private _setupIconAndSplashScreen(cordovaPath: string): void {
    const iconDirPath = path.resolve(cordovaPath, this._ICON_DIR_PATH);
    const splashScreenPath = path.resolve(cordovaPath, this._SPLASH_SCREEN_DIR_PATH);
    const splashScreenXmlPath = path.resolve(splashScreenPath, this._SPLASH_SCREEN_XML_FILE);

    // ICON 파일 복사
    if (this._opt.config.icon != null) {
      FsUtils.mkdirs(iconDirPath);
      FsUtils.copy(
        path.resolve(this._opt.pkgPath, this._opt.config.icon),
        path.resolve(iconDirPath, path.basename(this._opt.config.icon)),
      );
    } else {
      FsUtils.remove(iconDirPath);
    }

    // SplashScreen 파일 생성
    if (this._opt.config.platform?.android && this._opt.config.icon != null) {
      FsUtils.mkdirs(splashScreenPath);
      FsUtils.writeFile(
        splashScreenXmlPath,
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
  }

  // 7. XML 설정 구성
  private _configureXml(cordovaPath: string) {
    // CONFIG: 초기값 백업
    const configFilePath = path.resolve(cordovaPath, this._CONFIG_XML_FILE_NAME);
    const configBackFilePath = path.resolve(cordovaPath, this._CONFIG_XML_BACKUP_FILE_NAME);

    if (!FsUtils.exists(configBackFilePath)) {
      FsUtils.copy(configFilePath, configBackFilePath);
    }

    // CONFIG: 초기값 읽기
    const configFileContent = FsUtils.readFile(configBackFilePath);
    const configXml = XmlConvert.parse(configFileContent);

    // CONFIG: 기본 설정
    this._configureBasicXmlSettings(configXml);

    // CONFIG: 안드로이드 설정
    if (this._opt.config.platform?.android) {
      this._configureAndroidXmlSettings(configXml);
    }

    // CONFIG: 파일 새로 쓰기
    const configResultContent = XmlConvert.stringify(configXml, {
      format: true,
    });
    FsUtils.writeFile(configFilePath, configResultContent);
  }

  private _configureBasicXmlSettings(configXml: any): void {
    // 버전 설정
    configXml.widget.$.version = this._npmConfig.version;

    // ICON 설정
    if (this._opt.config.icon != null) {
      configXml.widget.icon = [
        {
          $: {
            src: `${this._ICON_DIR_PATH}/${path.basename(this._opt.config.icon)}`,
          },
        },
      ];
    }

    // 접근허용 세팅
    configXml.widget.content = [{ $: { src: "http://localhost/index.html" } }];
    configXml.widget.access = [{ $: { origin: "*" } }];
    configXml.widget["allow-navigation"] = [{ $: { href: "*" } }];
    configXml.widget["allow-intent"] = [{ $: { href: "*" } }];
    configXml.widget.preference = [{ $: { name: "MixedContentMode", value: "1" } }];
  }

  private _configureAndroidXmlSettings(configXml: any) {
    configXml.widget.$["xmlns:android"] = "http://schemas.android.com/apk/res/android";
    configXml.widget.$["xmlns:tools"] = "http://schemas.android.com/tools";

    configXml.widget.platform = configXml.widget.platform ?? [];

    const androidPlatform: Record<string, any> = {
      "$": {
        name: "android",
      },
      "preference": [
        {
          $: {
            name: "AndroidWindowSplashScreenAnimatedIcon",
            value: `${this._SPLASH_SCREEN_DIR_PATH}/${this._SPLASH_SCREEN_XML_FILE}`,
          },
        },
      ],
      "edit-config": [
        {
          $: {
            file: "app/src/main/AndroidManifest.xml",
            mode: "merge",
            target: "/manifest",
          },
          manifest: [
            {
              $: {
                "xmlns:tools": "http://schemas.android.com/tools",
              },
            },
          ],
        },
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
                ...(this._opt.config.platform!.android!.config
                  ? Object.keys(this._opt.config.platform!.android!.config).toObject(
                      (key) => "android:" + key,
                      (key) => this._opt.config.platform!.android!.config![key],
                    )
                  : {}),
              },
            },
          ],
        },
      ],
    };

    // SDK 버전 설정
    if (this._opt.config.platform!.android!.sdkVersion != null) {
      androidPlatform["preference"].push(
        ...[
          {
            $: {
              name: "android-maxSdkVersion",
              value: `${this._opt.config.platform!.android!.sdkVersion}`,
            },
          },
          {
            $: {
              name: "android-minSdkVersion",
              value: `${this._opt.config.platform!.android!.sdkVersion}`,
            },
          },
          {
            $: {
              name: "android-targetSdkVersion",
              value: `${this._opt.config.platform!.android!.sdkVersion}`,
            },
          },
          {
            $: {
              name: "android-compileSdkVersion",
              value: this._ANDROID_SDK_VERSION,
            },
          },
        ],
      );
    }

    // 권한 설정
    if (this._opt.config.platform!.android!.permissions) {
      androidPlatform["config-file"] = androidPlatform["config-file"] ?? [];
      androidPlatform["config-file"].push({
        "$": {
          target: "AndroidManifest.xml",
          parent: "/*",
        },
        "uses-permission": this._opt.config.platform!.android!.permissions.map((perm) => ({
          $: {
            "android:name": `android.permission.${perm.name}`,
            ...(perm.maxSdkVersion != null
              ? {
                  "android:maxSdkVersion": `${perm.maxSdkVersion}`,
                }
              : {}),
            ...(perm.ignore != null
              ? {
                  "tools:ignore": `${perm.ignore}`,
                }
              : {}),
          },
        })),
      });
    }

    configXml.widget.platform.push(androidPlatform);
  }

  async buildAsync(outPath: string): Promise<void> {
    const cordovaPath = path.resolve(this._opt.pkgPath, this._CORDOVA_DIR_NAME);

    // 빌드 실행 - 병렬 처리로 개선
    const buildType = this._opt.config.debug ? "debug" : "release";

    // 모든 플랫폼 동시에 빌드
    await Promise.all(
      this._platforms.map((platform) =>
        SdCliCordova._execAsync(
          "npx",
          ["cordova", "build", platform, `--${buildType}`],
          cordovaPath,
        ),
      ),
    );

    // 결과물 복사 및 ZIP 파일 생성 - 병렬 처리
    await Promise.all(
      Object.keys(this._opt.config.platform ?? {}).map(async (platform) => {
        await this._processBuildOutputAsync(cordovaPath, outPath, platform, buildType);
      }),
    );
  }

  private async _processBuildOutputAsync(
    cordovaPath: string,
    outPath: string,
    platform: string,
    buildType: string,
  ): Promise<void> {
    const targetOutPath = path.resolve(outPath, platform);

    // 결과물 복사: ANDROID
    if (platform === "android") {
      this._copyAndroidBuildOutput(cordovaPath, targetOutPath, buildType);
    }

    // 자동업데이트를 위한 파일 생성
    await this._createUpdateZipAsync(cordovaPath, outPath, platform);
  }

  private _copyAndroidBuildOutput(cordovaPath: string, targetOutPath: string, buildType: string) {
    const apkFileName = this._opt.config.platform!.android!.sign
      ? `app-${buildType}.apk`
      : `app-${buildType}-unsigned.apk`;

    const latestDistApkFileName = path.basename(
      `${this._opt.config.appName}${this._opt.config.platform!.android!.sign ? "" : "-unsigned"}-latest.apk`,
    );

    FsUtils.mkdirs(targetOutPath);
    FsUtils.copy(
      path.resolve(cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
      path.resolve(targetOutPath, latestDistApkFileName),
    );

    // 업데이트파일
    FsUtils.copy(
      path.resolve(cordovaPath, "platforms/android/app/build/outputs/apk", buildType, apkFileName),
      path.resolve(targetOutPath, "updates", `${this._npmConfig.version}.apk`),
    );
  }

  /** @deprecated */
  private async _createUpdateZipAsync(
    cordovaPath: string,
    outPath: string,
    platform: string,
  ): Promise<void> {
    const zip = new SdZip();
    const wwwPath = path.resolve(cordovaPath, this._WWW_DIR_NAME);
    const platformWwwPath = path.resolve(
      cordovaPath,
      this._PLATFORMS_DIR_NAME,
      platform,
      "platform_www",
    );

    this._addFilesToZip(zip, wwwPath);
    this._addFilesToZip(zip, platformWwwPath);

    // ZIP 파일 생성
    const updateDirPath = path.resolve(outPath, platform, "updates");
    FsUtils.mkdirs(updateDirPath);
    FsUtils.writeFile(
      path.resolve(updateDirPath, this._npmConfig.version + ".zip"),
      await zip.compressAsync(),
    );
  }

  private _addFilesToZip(zip: SdZip, dirPath: string) {
    const files = FsUtils.glob(path.resolve(dirPath, "**/*"), { nodir: true });
    for (const file of files) {
      const relFilePath = path.relative(dirPath, file);
      const fileBuffer = FsUtils.readFileBuffer(file);
      zip.write(relFilePath, fileBuffer);
    }
  }

  static async runWebviewOnDeviceAsync(opt: {
    platform: string;
    package: string;
    url?: string;
  }): Promise<void> {
    const projNpmConf = FsUtils.readJson(path.resolve(process.cwd(), "package.json")) as INpmConfig;
    const allPkgPaths = projNpmConf.workspaces!.mapMany((item) =>
      FsUtils.glob(PathUtils.posix(process.cwd(), item)),
    );

    const cordovaPath = path.resolve(
      allPkgPaths.single((item) => item.endsWith(opt.package))!,
      ".cordova",
    );

    if (opt.url !== undefined) {
      FsUtils.remove(path.resolve(cordovaPath, "www"));
      FsUtils.mkdirs(path.resolve(cordovaPath, "www"));
      FsUtils.writeFile(
        path.resolve(cordovaPath, "www/index.html"),
        `
'${opt.url}'로 이동중...
<script>
  setTimeout(function () {
    window.location.href = "${opt.url.replace(/\/$/, "")}/${opt.package}/cordova/";
  }, 3000);
</script>`.trim(),
      );
    }

    await this._execAsync("npx", ["cordova", "run", opt.platform, "--device"], cordovaPath);
  }
}
