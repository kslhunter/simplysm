import * as path from "path";
import { FsUtils, PathUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import { ISdClientBuilderCapacitorConfig } from "../types/config/ISdProjectConfig";
import { INpmConfig } from "../types/common-config/INpmConfig";
import { StringUtils, typescript } from "@simplysm/sd-core-common";

export class SdCliCapacitor {
  // 상수 정의
  private readonly _CAPACITOR_DIR_NAME = ".capacitor";
  private readonly _CONFIG_FILE_NAME = "capacitor.config.ts";
  private readonly _KEYSTORE_FILE_NAME = "android.keystore";
  private readonly _ICON_DIR_PATH = "resources";

  // private readonly _ANDROID_DIR_NAME = "android";
  // private readonly _WWW_DIR_NAME = "www";

  private readonly _platforms: string[];
  private readonly _npmConfig: INpmConfig;

  constructor(private readonly _opt: { pkgPath: string; config: ISdClientBuilderCapacitorConfig }) {
    this._platforms = Object.keys(this._opt.config.platform ?? { android: {} });
    this._npmConfig = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json"));
  }

  private static readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliCapacitor"]);

  private static async _execAsync(cmd: string, args: string[], cwd: string): Promise<void> {
    this._logger.debug(`실행 명령: ${cmd + " " + args.join(" ")}`);
    const msg = await SdProcess.spawnAsync(cmd, args, { cwd });
    this._logger.debug(`실행 결과: ${msg}`);
  }

  async initializeAsync(): Promise<void> {
    const capacitorPath = path.resolve(this._opt.pkgPath, this._CAPACITOR_DIR_NAME);

    // 1. Capacitor 프로젝트 초기화
    await this._initializeCapacitorProjectAsync(capacitorPath);

    // 2. Capacitor 설정 파일 생성
    this._createCapacitorConfig(capacitorPath);

    // 3. 플랫폼 관리
    await this._managePlatformsAsync(capacitorPath);

    // 4. 플러그인 관리
    await this._managePluginsAsync(capacitorPath);

    // 5. 안드로이드 서명 설정
    this._setupAndroidSign(capacitorPath);

    // 6. 아이콘 및 스플래시 스크린 설정
    await this._setupIconAndSplashScreenAsync(capacitorPath);

    // 7. Android 네이티브 설정 (AndroidManifest.xml, build.gradle 등)
    if (this._platforms.includes("android")) {
      this._configureAndroidNative(capacitorPath);
    }

    // 8. 웹 자산 동기화
    await SdCliCapacitor._execAsync("npx", ["cap", "sync"], capacitorPath);
  }

  // 1. Capacitor 프로젝트 초기화
  private async _initializeCapacitorProjectAsync(capacitorPath: string): Promise<void> {
    if (FsUtils.exists(capacitorPath)) {
      SdCliCapacitor._logger.log("이미 생성되어있는 '.capacitor'를 사용합니다.");

      // 버전 동기화
      this._syncVersion(capacitorPath);
    } else {
      FsUtils.mkdirs(capacitorPath);

      // package.json 생성
      const pkgJson = {
        name: this._opt.config.appId,
        version: this._npmConfig.version,
        private: true,
        dependencies: {
          "@capacitor/core": "^7.0.0",
        },
        devDependencies: {
          "@capacitor/cli": "^7.0.0",
          "@capacitor/assets": "^3.0.0",
        },
      };
      FsUtils.writeJson(path.resolve(capacitorPath, "package.json"), pkgJson, { space: 2 });

      // yarn install
      await SdCliCapacitor._execAsync("yarn", ["install"], capacitorPath);

      // capacitor init
      await SdCliCapacitor._execAsync(
        "npx",
        ["cap", "init", this._opt.config.appName, this._opt.config.appId],
        capacitorPath,
      );
    }
  }

  // 버전 동기화
  private _syncVersion(capacitorPath: string): void {
    const pkgJsonPath = path.resolve(capacitorPath, "package.json");

    if (FsUtils.exists(pkgJsonPath)) {
      const pkgJson = FsUtils.readJson(pkgJsonPath) as INpmConfig;

      if (pkgJson.version !== this._npmConfig.version) {
        pkgJson.version = this._npmConfig.version;
        FsUtils.writeJson(pkgJsonPath, pkgJson, { space: 2 });
        SdCliCapacitor._logger.log(`버전 동기화: ${this._npmConfig.version}`);
      }
    }
  }

  // 2. Capacitor 설정 파일 생성
  private _createCapacitorConfig(capacitorPath: string): void {
    const configFilePath = path.resolve(capacitorPath, this._CONFIG_FILE_NAME);

    // 플러그인 옵션 생성
    const pluginOptions: Record<string, Record<string, unknown>> = {};
    for (const [pluginName, options] of Object.entries(this._opt.config.plugins ?? {})) {
      if (options !== true) {
        // @capacitor/splash-screen → SplashScreen 형태로 변환
        const configKey = StringUtils.toPascalCase(pluginName.split("/").last()!);
        pluginOptions[configKey] = options;
      }
    }

    const pluginsConfigStr =
      Object.keys(pluginOptions).length > 0
        ? JSON.stringify(pluginOptions, null, 4).replace(/^/gm, "  ").trim()
        : "{}";

    const configContent = typescript`
      import type { CapacitorConfig } from "@capacitor/cli";

      const config: CapacitorConfig = {
        appId: "${this._opt.config.appId}",
        appName: "${this._opt.config.appName}",
        server: {
          androidScheme: "http",
          cleartext: true,
          allowNavigation: ["*"],
        },
        android: {
          allowMixedContent: true,
        },
        plugins: ${pluginsConfigStr},
      };

      export default config;
    `;

    FsUtils.writeFile(configFilePath, configContent);
  }

  // 3. 플랫폼 관리
  private async _managePlatformsAsync(capacitorPath: string): Promise<void> {
    for (const platform of this._platforms) {
      if (FsUtils.exists(path.resolve(capacitorPath, platform))) continue;

      await SdCliCapacitor._execAsync("npx", ["cap", "add", platform], capacitorPath);
    }
  }

  // 4. 플러그인 관리
  private async _managePluginsAsync(capacitorPath: string): Promise<void> {
    const pkgJsonPath = path.resolve(capacitorPath, "package.json");
    const pkgJson = FsUtils.readJson(pkgJsonPath) as INpmConfig;
    const currentDeps = Object.keys(pkgJson.dependencies ?? {});

    const usePlugins = Object.keys(this._opt.config.plugins ?? {});

    // 사용하지 않는 플러그인 제거
    for (const dep of currentDeps) {
      // @capacitor/core, @capacitor/android 등 기본 패키지는 제외
      if (
        dep.startsWith("@capacitor/") &&
        ["core", "android", "ios"].some((p) => dep.endsWith(p))
      ) {
        continue;
      }

      // 플러그인 목록에 없는 패키지는 제거
      if (!usePlugins.includes(dep)) {
        // Capacitor 관련 플러그인만 제거
        if (dep.startsWith("@capacitor/") || dep.includes("capacitor-plugin")) {
          try {
            await SdCliCapacitor._execAsync("yarn", ["remove", dep], capacitorPath);
            SdCliCapacitor._logger.log(`플러그인 제거: ${dep}`);
          } catch {
            SdCliCapacitor._logger.warn(`플러그인 제거 실패: ${dep}`);
          }
        }
      }
    }

    // 새 플러그인 설치
    for (const plugin of usePlugins) {
      if (!currentDeps.includes(plugin)) {
        try {
          await SdCliCapacitor._execAsync("yarn", ["add", plugin], capacitorPath);
          SdCliCapacitor._logger.log(`플러그인 설치: ${plugin}`);
        } catch {
          SdCliCapacitor._logger.warn(`플러그인 설치 실패: ${plugin}`);
        }
      }
    }
  }

  // 5. 안드로이드 서명 설정
  private _setupAndroidSign(capacitorPath: string): void {
    const keystorePath = path.resolve(capacitorPath, this._KEYSTORE_FILE_NAME);

    if (this._opt.config.platform?.android?.sign) {
      FsUtils.copy(
        path.resolve(this._opt.pkgPath, this._opt.config.platform.android.sign.keystore),
        keystorePath,
      );
    } else {
      FsUtils.remove(keystorePath);
    }
  }

  // 6. 아이콘 및 스플래시 스크린 설정
  private async _setupIconAndSplashScreenAsync(capacitorPath: string): Promise<void> {
    const iconDirPath = path.resolve(capacitorPath, this._ICON_DIR_PATH);

    // ICON 파일 복사
    if (this._opt.config.icon != null) {
      FsUtils.mkdirs(iconDirPath);

      const iconSource = path.resolve(this._opt.pkgPath, this._opt.config.icon);

      // icon.png, splash.png 둘 다 같은 파일 사용
      FsUtils.copy(iconSource, path.resolve(iconDirPath, "icon.png"));
      FsUtils.copy(iconSource, path.resolve(iconDirPath, "splash.png"));

      // @capacitor/assets로 아이콘/스플래시 리사이징
      try {
        await SdCliCapacitor._execAsync(
          "npx",
          ["@capacitor/assets", "generate", "--android"],
          capacitorPath,
        );
      } catch {
        SdCliCapacitor._logger.warn("아이콘 리사이징 실패, 기본 아이콘 사용");
      }
    } else {
      FsUtils.remove(iconDirPath);
    }
  }

  // 7. Android 네이티브 설정
  private _configureAndroidNative(capacitorPath: string): void {
    const androidPath = path.resolve(capacitorPath, "android");

    if (!FsUtils.exists(androidPath)) {
      return;
    }

    // AndroidManifest.xml 수정
    this._configureAndroidManifest(androidPath);

    // build.gradle 수정 (필요시)
    this._configureAndroidBuildGradle(androidPath);

    // strings.xml 앱 이름 수정
    this._configureAndroidStrings(androidPath);
  }

  private _configureAndroidManifest(androidPath: string): void {
    const manifestPath = path.resolve(androidPath, "app/src/main/AndroidManifest.xml");

    if (!FsUtils.exists(manifestPath)) {
      return;
    }

    let manifestContent = FsUtils.readFile(manifestPath);

    // usesCleartextTraffic 설정
    if (!manifestContent.includes("android:usesCleartextTraffic")) {
      manifestContent = manifestContent.replace(
        "<application",
        '<application android:usesCleartextTraffic="true"',
      );
    }

    // 추가 권한 설정
    const permissions = this._opt.config.platform?.android?.permissions ?? [];
    for (const perm of permissions) {
      const permTag = `<uses-permission android:name="android.permission.${perm.name}"`;
      if (!manifestContent.includes(permTag)) {
        const maxSdkAttr =
          perm.maxSdkVersion != null ? ` android:maxSdkVersion="${perm.maxSdkVersion}"` : "";
        const ignoreAttr = perm.ignore != null ? ` tools:ignore="${perm.ignore}"` : "";
        const permLine = `    ${permTag}${maxSdkAttr}${ignoreAttr} />\n`;

        // tools 네임스페이스 추가
        if (perm.ignore != null && !manifestContent.includes("xmlns:tools=")) {
          manifestContent = manifestContent.replace(
            "<manifest xmlns:android",
            '<manifest xmlns:tools="http://schemas.android.com/tools" xmlns:android',
          );
        }

        manifestContent = manifestContent.replace("</manifest>", `${permLine}</manifest>`);
      }
    }

    // 추가 application 설정
    const appConfig = this._opt.config.platform?.android?.config;
    if (appConfig) {
      for (const [key, value] of Object.entries(appConfig)) {
        const attr = `android:${key}="${value}"`;
        if (!manifestContent.includes(`android:${key}=`)) {
          manifestContent = manifestContent.replace("<application", `<application ${attr}`);
        }
      }
    }

    FsUtils.writeFile(manifestPath, manifestContent);
  }

  private _configureAndroidBuildGradle(androidPath: string): void {
    const buildGradlePath = path.resolve(androidPath, "app/build.gradle");

    if (!FsUtils.exists(buildGradlePath)) {
      return;
    }

    let gradleContent = FsUtils.readFile(buildGradlePath);

    // versionName, versionCode 설정
    const version = this._npmConfig.version;
    const versionParts = version.split(".");
    const versionCode =
      parseInt(versionParts[0] ?? "0") * 10000 +
      parseInt(versionParts[1] ?? "0") * 100 +
      parseInt(versionParts[2] ?? "0");

    gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${versionCode}`);
    gradleContent = gradleContent.replace(/versionName "[^"]+"/, `versionName "${version}"`);

    // SDK 버전 설정
    if (this._opt.config.platform?.android?.sdkVersion != null) {
      const sdkVersion = this._opt.config.platform.android.sdkVersion;
      gradleContent = gradleContent.replace(/minSdkVersion \d+/, `minSdkVersion ${sdkVersion}`);
      gradleContent = gradleContent.replace(
        /targetSdkVersion \d+/,
        `targetSdkVersion ${sdkVersion}`,
      );
    }

    // Signing 설정
    const signConfig = this._opt.config.platform?.android?.sign;
    if (signConfig) {
      const keystoreRelativePath = `../${this._KEYSTORE_FILE_NAME}`;
      const keystoreType = signConfig.keystoreType ?? "jks";

      // signingConfigs 블록 추가
      if (!gradleContent.includes("signingConfigs")) {
        const signingConfigsBlock = `
    signingConfigs {
        release {
            storeFile file("${keystoreRelativePath}")
            storePassword "${signConfig.storePassword}"
            keyAlias "${signConfig.alias}"
            keyPassword "${signConfig.password}"
            storeType "${keystoreType}"
        }
    }
`;
        // android { 블록 내부에 추가
        gradleContent = gradleContent.replace(/(android\s*\{)/, `$1${signingConfigsBlock}`);
      }

      // buildTypes.release에 signingConfig 추가
      if (!gradleContent.includes("signingConfig signingConfigs.release")) {
        gradleContent = gradleContent.replace(
          /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
          `$1\n            signingConfig signingConfigs.release`,
        );
      }
    }

    FsUtils.writeFile(buildGradlePath, gradleContent);
  }

  private _configureAndroidStrings(androidPath: string): void {
    const stringsPath = path.resolve(androidPath, "app/src/main/res/values/strings.xml");

    if (!FsUtils.exists(stringsPath)) {
      return;
    }

    let stringsContent = FsUtils.readFile(stringsPath);
    stringsContent = stringsContent.replace(
      /<string name="app_name">[^<]+<\/string>/,
      `<string name="app_name">${this._opt.config.appName}</string>`,
    );
    stringsContent = stringsContent.replace(
      /<string name="title_activity_main">[^<]+<\/string>/,
      `<string name="title_activity_main">${this._opt.config.appName}</string>`,
    );
    stringsContent = stringsContent.replace(
      /<string name="package_name">[^<]+<\/string>/,
      `<string name="package_name">${this._opt.config.appId}</string>`,
    );
    stringsContent = stringsContent.replace(
      /<string name="custom_url_scheme">[^<]+<\/string>/,
      `<string name="custom_url_scheme">${this._opt.config.appId}</string>`,
    );

    FsUtils.writeFile(stringsPath, stringsContent);
  }

  async buildAsync(outPath: string): Promise<void> {
    const capacitorPath = path.resolve(this._opt.pkgPath, this._CAPACITOR_DIR_NAME);
    const buildType = this._opt.config.debug ? "debug" : "release";

    // 웹 자산 동기화
    await SdCliCapacitor._execAsync("npx", ["cap", "sync"], capacitorPath);

    // 플랫폼별 빌드
    await Promise.all(
      this._platforms.map((platform) =>
        this._buildPlatformAsync(capacitorPath, outPath, platform, buildType),
      ),
    );
  }

  private async _buildPlatformAsync(
    capacitorPath: string,
    outPath: string,
    platform: string,
    buildType: string,
  ): Promise<void> {
    if (platform === "android") {
      await this._buildAndroidAsync(capacitorPath, outPath, buildType);
    }
    // iOS 지원 시 추가
  }

  private async _buildAndroidAsync(
    capacitorPath: string,
    outPath: string,
    buildType: string,
  ): Promise<void> {
    const androidPath = path.resolve(capacitorPath, "android");
    const targetOutPath = path.resolve(outPath, "android");

    // Gradle wrapper로 빌드
    const isBundle = this._opt.config.platform?.android?.bundle;
    const gradleTask =
      buildType === "release" ? (isBundle ? "bundleRelease" : "assembleRelease") : "assembleDebug";

    // gradlew 실행 권한 부여 (Linux/Mac)
    const gradlewPath = path.resolve(androidPath, "gradlew");
    if (FsUtils.exists(gradlewPath)) {
      try {
        await SdCliCapacitor._execAsync("chmod", ["+x", "gradlew"], androidPath);
      } catch {
        // Windows에서는 무시
      }
    }

    // Gradle 빌드 실행
    const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    await SdCliCapacitor._execAsync(gradleCmd, [gradleTask, "--no-daemon"], androidPath);

    // 빌드 결과물 복사
    this._copyAndroidBuildOutput(androidPath, targetOutPath, buildType);
  }

  private _copyAndroidBuildOutput(
    androidPath: string,
    targetOutPath: string,
    buildType: string,
  ): void {
    const isBundle = this._opt.config.platform?.android?.bundle;
    const isSigned = !!this._opt.config.platform?.android?.sign;

    const ext = isBundle ? "aab" : "apk";
    const outputType = isBundle ? "bundle" : "apk";
    const fileName = isSigned ? `app-${buildType}.${ext}` : `app-${buildType}-unsigned.${ext}`;

    const sourcePath = path.resolve(
      androidPath,
      "app/build/outputs",
      outputType,
      buildType,
      fileName,
    );

    const actualPath = FsUtils.exists(sourcePath)
      ? sourcePath
      : path.resolve(
          androidPath,
          "app/build/outputs",
          outputType,
          buildType,
          `app-${buildType}.${ext}`,
        );

    if (!FsUtils.exists(actualPath)) {
      SdCliCapacitor._logger.warn(`빌드 결과물을 찾을 수 없습니다: ${actualPath}`);
      return;
    }

    const outputFileName = `${this._opt.config.appName}${isSigned ? "" : "-unsigned"}-latest.${ext}`;

    FsUtils.mkdirs(targetOutPath);
    FsUtils.copy(actualPath, path.resolve(targetOutPath, outputFileName));

    const updatesPath = path.resolve(targetOutPath, "updates");
    FsUtils.mkdirs(updatesPath);
    FsUtils.copy(actualPath, path.resolve(updatesPath, `${this._npmConfig.version}.${ext}`));
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

    const capacitorPath = path.resolve(
      allPkgPaths.single((item) => item.endsWith(opt.package))!,
      ".capacitor",
    );

    if (opt.url !== undefined) {
      // capacitor.config.ts의 server.url 설정 업데이트
      const configPath = path.resolve(capacitorPath, "capacitor.config.ts");
      if (FsUtils.exists(configPath)) {
        let configContent = FsUtils.readFile(configPath);
        const serverUrl = `${opt.url.replace(/\/$/, "")}/${opt.package}/capacitor/`;

        // 기존 url 설정이 있으면 교체, 없으면 server 블록 첫 줄에 추가
        if (configContent.includes("url:")) {
          configContent = configContent.replace(/url:\s*"[^"]*"/, `url: "${serverUrl}"`);
        } else if (configContent.includes("server:")) {
          configContent = configContent.replace(
            /server:\s*\{/,
            `server: {\n    url: "${serverUrl}",`,
          );
        }
        FsUtils.writeFile(configPath, configContent);
      }
    }

    // cap sync 후 run
    await this._execAsync("npx", ["cap", "sync", opt.platform], capacitorPath);
    await this._execAsync("npx", ["cap", "run", opt.platform, "--target", "device"], capacitorPath);
  }
}
