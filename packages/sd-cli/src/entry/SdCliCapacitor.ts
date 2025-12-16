import * as path from "path";
import { FsUtils, PathUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import { ISdClientBuilderCapacitorConfig } from "../types/config/ISdProjectConfig";
import { INpmConfig } from "../types/common-config/INpmConfig";
import { StringUtils, typescript } from "@simplysm/sd-core-common";
import sharp from "sharp";

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
    this._platforms = Object.keys(this._opt.config.platform ?? {});
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
    const isNewProject = await this._initializeCapacitorProjectAsync(capacitorPath);

    // 2. Capacitor 설정 파일 생성
    await this._createCapacitorConfigAsync(capacitorPath);

    // 3. 플랫폼 관리
    await this._managePlatformsAsync(capacitorPath);

    // 4. 플러그인 관리
    const pluginsChanged = await this._managePluginsAsync(capacitorPath);

    // 5. 안드로이드 서명 설정
    await this._setupAndroidSignAsync(capacitorPath);

    // 6. 아이콘 및 스플래시 스크린 설정
    await this._setupIconAndSplashScreenAsync(capacitorPath);

    // 7. Android 네이티브 설정 (AndroidManifest.xml, build.gradle 등)
    if (this._platforms.includes("android")) {
      await this._configureAndroidNativeAsync(capacitorPath);
    }

    // 8. 웹 자산 동기화
    if (isNewProject || pluginsChanged) {
      await SdCliCapacitor._execAsync("npx", ["cap", "sync"], capacitorPath);
    } else {
      await SdCliCapacitor._execAsync("npx", ["cap", "copy"], capacitorPath);
    }
  }

  // 1. Capacitor 프로젝트 초기화
  private async _initializeCapacitorProjectAsync(capacitorPath: string): Promise<boolean> {
    if (FsUtils.exists(path.resolve(capacitorPath, "www"))) {
      SdCliCapacitor._logger.log("이미 생성되어있는 '.capacitor'를 사용합니다.");

      // 버전 동기화
      await this._syncVersionAsync(capacitorPath);
      return false;
    }


    await FsUtils.mkdirsAsync(capacitorPath);

    // package.json 생성
    const projNpmConfig = await FsUtils.readJsonAsync(
      path.resolve(this._opt.pkgPath, "../../package.json"),
    );
    const pkgJson = {
      name: this._opt.config.appId,
      version: this._npmConfig.version,
      private: true,
      volta: projNpmConfig.volta,
      dependencies: {
        "@capacitor/core": "^7.0.0",
        "@capacitor/app": "^7.0.0",
      },
      devDependencies: {
        "@capacitor/cli": "^7.0.0",
        "@capacitor/assets": "^3.0.0",
        ...this._platforms.toObject(
          (item) => `@capacitor/${item}`,
          () => "^7.0.0",
        ),
      },
    };
    await FsUtils.writeJsonAsync(path.resolve(capacitorPath, "package.json"), pkgJson, {
      space: 2,
    });

    // .yarnrc.yml 작성
    await FsUtils.writeFileAsync(
      path.resolve(capacitorPath, ".yarnrc.yml"),
      "nodeLinker: node-modules",
    );

    // yarn.lock 작성
    await FsUtils.writeFileAsync(path.resolve(capacitorPath, "yarn.lock"), "");

    // yarn install
    await SdCliCapacitor._execAsync("yarn", ["install"], capacitorPath);

    // capacitor init
    await SdCliCapacitor._execAsync(
      "npx",
      ["cap", "init", this._opt.config.appName, this._opt.config.appId],
      capacitorPath,
    );

    // www/index.html 생성
    const wwwPath = path.resolve(capacitorPath, "www");
    await FsUtils.writeFileAsync(
      path.resolve(wwwPath, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );

    return true;
  }

  // 버전 동기화
  private async _syncVersionAsync(capacitorPath: string) {
    const pkgJsonPath = path.resolve(capacitorPath, "package.json");

    if (FsUtils.exists(pkgJsonPath)) {
      const pkgJson = (await FsUtils.readJsonAsync(pkgJsonPath)) as INpmConfig;

      if (pkgJson.version !== this._npmConfig.version) {
        pkgJson.version = this._npmConfig.version;
        await FsUtils.writeJsonAsync(pkgJsonPath, pkgJson, { space: 2 });
        SdCliCapacitor._logger.debug(`버전 동기화: ${this._npmConfig.version}`);
      }
    }
  }

  // 2. Capacitor 설정 파일 생성
  private async _createCapacitorConfigAsync(capacitorPath: string) {
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
          statusBarOverlaysWebView: false,
        },
        plugins: ${pluginsConfigStr},
      };

      export default config;
    `;

    await FsUtils.writeFileAsync(configFilePath, configContent);
  }

  // 3. 플랫폼 관리
  private async _managePlatformsAsync(capacitorPath: string): Promise<void> {
    for (const platform of this._platforms) {
      if (FsUtils.exists(path.resolve(capacitorPath, platform))) continue;

      await SdCliCapacitor._execAsync("npx", ["cap", "add", platform], capacitorPath);
    }
  }

  private async _managePluginsAsync(capacitorPath: string): Promise<boolean> {
    const pkgJsonPath = path.resolve(capacitorPath, "package.json");
    const pkgJson = (await FsUtils.readJsonAsync(pkgJsonPath)) as INpmConfig;

    const mainDeps = {
      ...this._npmConfig.dependencies,
      ...this._npmConfig.devDependencies,
      ...this._npmConfig.peerDependencies,
    };

    const usePlugins = Object.keys(this._opt.config.plugins ?? {});
    const currentDeps = pkgJson.dependencies ?? {};

    let changed = false;

    // 사용하지 않는 플러그인 제거
    for (const dep of Object.keys(currentDeps)) {
      if (this._isCapacitorPlugin(dep) && !usePlugins.includes(dep)) {
        delete currentDeps[dep];
        changed = true;
        SdCliCapacitor._logger.debug(`플러그인 제거: ${dep}`);
      }
    }

    // 새 플러그인 추가
    for (const plugin of usePlugins) {
      if (!(plugin in currentDeps)) {
        const version = mainDeps[plugin] ?? "^7.0.0";
        currentDeps[plugin] = version;
        changed = true;
        SdCliCapacitor._logger.debug(`플러그인 추가: ${plugin}@${version}`);
      }
    }

    // 변경사항 있을 때만 저장 & install
    if (changed) {
      pkgJson.dependencies = currentDeps;
      await FsUtils.writeJsonAsync(pkgJsonPath, pkgJson, { space: 2 });
      await SdCliCapacitor._execAsync("yarn", ["install"], capacitorPath);
      return true;
    }
    // 변경 없으면 아무것도 안 함 → 오프라인 OK
    return false;
  }

  private _isCapacitorPlugin(dep: string): boolean {
    // 기본 패키지 제외
    const corePackages = [
      "@capacitor/core",
      "@capacitor/android",
      "@capacitor/ios",
      "@capacitor/app",
    ];
    if (corePackages.includes(dep)) return false;

    return dep.startsWith("@capacitor/") || dep.includes("capacitor-plugin");
  }

  // 5. 안드로이드 서명 설정
  private async _setupAndroidSignAsync(capacitorPath: string) {
    const keystorePath = path.resolve(capacitorPath, this._KEYSTORE_FILE_NAME);

    if (this._opt.config.platform?.android?.sign) {
      await FsUtils.copyAsync(
        path.resolve(this._opt.pkgPath, this._opt.config.platform.android.sign.keystore),
        keystorePath,
      );
    } else {
      await FsUtils.removeAsync(keystorePath);
    }
  }

  // 6. 아이콘 및 스플래시 스크린 설정
  private async _setupIconAndSplashScreenAsync(capacitorPath: string): Promise<void> {
    const resourcesDirPath = path.resolve(capacitorPath, this._ICON_DIR_PATH);

    if (this._opt.config.icon != null) {
      await FsUtils.mkdirsAsync(resourcesDirPath);

      const iconSource = path.resolve(this._opt.pkgPath, this._opt.config.icon);

      // logo.png: 1024x1024 (Easy Mode)
      // 로고 크기 약 60% - safe zone(61%) 내에서 최대한 크게
      const logoPath = path.resolve(resourcesDirPath, "logo.png");
      await this._createCenteredImageAsync(iconSource, logoPath, 1024, 0.6);

      // splash.png: 2732x2732
      // 로고 크기 약 35% - 화면 중앙에 적당한 크기로
      const splashPath = path.resolve(resourcesDirPath, "splash.png");
      await this._createCenteredImageAsync(iconSource, splashPath, 2732, 0.35);

      // 기존 아이콘 삭제 (겹침 방지)
      await this._cleanupExistingIconsAsync(capacitorPath);

      try {
        await SdCliCapacitor._execAsync(
          "npx",
          [
            "@capacitor/assets",
            "generate",
            "--android",
            "--iconBackgroundColor",
            "#ffffff",
            "--splashBackgroundColor",
            "#ffffff",
          ],
          capacitorPath,
        );
      } catch {
        SdCliCapacitor._logger.warn("아이콘 생성 실패, 기본 아이콘 사용");
      }
    } else {
      await FsUtils.removeAsync(resourcesDirPath);
    }
  }

  // 중앙에 로고를 배치한 이미지 생성
  private async _createCenteredImageAsync(
    sourcePath: string,
    outputPath: string,
    outputSize: number,
    logoRatio: number, // 0.0 ~ 1.0
  ): Promise<void> {
    const logoSize = Math.floor(outputSize * logoRatio);
    const padding = Math.floor((outputSize - logoSize) / 2);

    await sharp(sourcePath)
      .resize(logoSize, logoSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toFile(outputPath);
  }

  // 기존 아이콘 파일 삭제
  private async _cleanupExistingIconsAsync(capacitorPath: string): Promise<void> {
    const androidResPath = path.resolve(capacitorPath, "android/app/src/main/res");

    if (!FsUtils.exists(androidResPath)) return;

    const mipmapDirs = await FsUtils.globAsync(path.resolve(androidResPath, "mipmap-*"));
    for (const dir of mipmapDirs) {
      const iconFiles = await FsUtils.globAsync(path.resolve(dir, "ic_launcher*.png"));
      for (const file of iconFiles) {
        await FsUtils.removeAsync(file);
      }
    }
  }

  // 7. Android 네이티브 설정
  private async _configureAndroidNativeAsync(capacitorPath: string) {
    const androidPath = path.resolve(capacitorPath, "android");

    if (!FsUtils.exists(androidPath)) {
      return;
    }

    // JAVA_HOME 찾기
    await this._configureAndroidGradlePropertiesAsync(androidPath);

    // local.properties 생성
    await this._configureSdkPathAsync(androidPath);

    // AndroidManifest.xml 수정
    await this._configureAndroidManifestAsync(androidPath);

    // build.gradle 수정 (필요시)
    await this._configureAndroidBuildGradleAsync(androidPath);

    // strings.xml 앱 이름 수정
    await this._configureAndroidStringsAsync(androidPath);

    // styles.xml 수정
    await this._configureAndroidStylesAsync(androidPath);
  }

  private async _configureAndroidStylesAsync(androidPath: string) {
    const stylesPath = path.resolve(androidPath, "app/src/main/res/values/styles.xml");

    if (!FsUtils.exists(stylesPath)) {
      return;
    }

    let stylesContent = await FsUtils.readFileAsync(stylesPath);

    // Edge-to-Edge 비활성화
    if (!stylesContent.includes("android:windowOptOutEdgeToEdgeEnforcement")) {
      stylesContent = stylesContent.replace(
        /(<style[^>]*AppTheme[^>]*>)/,
        `$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>`,
      );
    }

    await FsUtils.writeFileAsync(stylesPath, stylesContent);
  }

  private async _configureAndroidGradlePropertiesAsync(androidPath: string) {
    const gradlePropsPath = path.resolve(androidPath, "gradle.properties");

    if (!FsUtils.exists(gradlePropsPath)) {
      return;
    }

    let content = await FsUtils.readFileAsync(gradlePropsPath);

    // Java 21 경로 자동 탐색
    const java21Path = this._findJava21();
    if (java21Path != null && !content.includes("org.gradle.java.home")) {
      content += `\norg.gradle.java.home=${java21Path.replace(/\\/g, "\\\\")}\n`;
      FsUtils.writeFile(gradlePropsPath, content);
    }
  }

  private _findJava21(): string | undefined {
    const patterns = [
      "C:/Program Files/Amazon Corretto/jdk21*",
      "C:/Program Files/Eclipse Adoptium/jdk-21*",
      "C:/Program Files/Java/jdk-21*",
      "C:/Program Files/Microsoft/jdk-21*",
    ];

    for (const pattern of patterns) {
      const matches = FsUtils.glob(pattern);
      if (matches.length > 0) {
        // 가장 최신 버전 선택 (정렬 후 마지막)
        return matches.sort().at(-1);
      }
    }

    return undefined;
  }

  private async _configureSdkPathAsync(androidPath: string) {
    // local.properties 생성
    const localPropsPath = path.resolve(androidPath, "local.properties");

    if (FsUtils.exists(localPropsPath)) {
      return;
    }

    // SDK 경로 탐색 (Cordova 방식과 유사)
    const sdkPath = this._findAndroidSdk();
    if (sdkPath != null) {
      await FsUtils.writeFileAsync(localPropsPath, `sdk.dir=${sdkPath.replace(/\\/g, "/")}\n`);
    }
  }

  private async _configureAndroidManifestAsync(androidPath: string) {
    const manifestPath = path.resolve(androidPath, "app/src/main/AndroidManifest.xml");

    if (!FsUtils.exists(manifestPath)) {
      return;
    }

    let manifestContent = await FsUtils.readFileAsync(manifestPath);

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

    // intentFilters 설정
    const intentFilters = this._opt.config.platform?.android?.intentFilters ?? [];
    for (const filter of intentFilters) {
      const filterKey = filter.action ?? filter.category ?? "";
      if (filterKey && !manifestContent.includes(filterKey)) {
        const actionLine = filter.action != null ? `<action android:name="${filter.action}"/>` : "";
        const categoryLine =
          filter.category != null ? `<category android:name="${filter.category}"/>` : "";

        manifestContent = manifestContent.replace(
          /(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?>)/,
          `$1
            <intent-filter>
                ${actionLine}
                ${categoryLine}
            </intent-filter>`,
        );
      }
    }

    await FsUtils.writeFileAsync(manifestPath, manifestContent);
  }

  private async _configureAndroidBuildGradleAsync(androidPath: string) {
    const buildGradlePath = path.resolve(androidPath, "app/build.gradle");

    if (!FsUtils.exists(buildGradlePath)) {
      return;
    }

    let gradleContent = await FsUtils.readFileAsync(buildGradlePath);

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

    await FsUtils.writeFileAsync(buildGradlePath, gradleContent);
  }

  private async _configureAndroidStringsAsync(androidPath: string) {
    const stringsPath = path.resolve(androidPath, "app/src/main/res/values/strings.xml");

    if (!FsUtils.exists(stringsPath)) {
      return;
    }

    let stringsContent = await FsUtils.readFileAsync(stringsPath);
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

    await FsUtils.writeFileAsync(stringsPath, stringsContent);
  }

  async buildAsync(outPath: string): Promise<void> {
    const capacitorPath = path.resolve(this._opt.pkgPath, this._CAPACITOR_DIR_NAME);
    const buildType = this._opt.config.debug ? "debug" : "release";

    // 플랫폼별 빌드
    await Promise.all(
      this._platforms.map(async (platform) => {
        // 해당 플랫폼만 copy
        await SdCliCapacitor._execAsync("npx", ["cap", "copy", platform], capacitorPath);
        await this._buildPlatformAsync(capacitorPath, outPath, platform, buildType);
      }),
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
    await this._copyAndroidBuildOutputAsync(androidPath, targetOutPath, buildType);
  }

  private async _copyAndroidBuildOutputAsync(
    androidPath: string,
    targetOutPath: string,
    buildType: string,
  ) {
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

    await FsUtils.mkdirsAsync(targetOutPath);
    await FsUtils.copyAsync(actualPath, path.resolve(targetOutPath, outputFileName));

    const updatesPath = path.resolve(targetOutPath, "updates");
    await FsUtils.mkdirsAsync(updatesPath);
    await FsUtils.copyAsync(
      actualPath,
      path.resolve(updatesPath, `${this._npmConfig.version}.${ext}`),
    );
  }

  private _findAndroidSdk(): string | undefined {
    // 1. 환경변수 확인
    const fromEnv = process.env["ANDROID_HOME"] ?? process.env["ANDROID_SDK_ROOT"];
    if (fromEnv != null && FsUtils.exists(fromEnv)) {
      return fromEnv;
    }

    // 2. 일반적인 설치 경로 탐색
    const candidates = [
      path.resolve(process.env["LOCALAPPDATA"] ?? "", "Android/Sdk"),
      path.resolve(process.env["HOME"] ?? "", "Android/Sdk"),
      "C:/Program Files/Android/Sdk",
      "C:/Android/Sdk",
    ];

    for (const candidate of candidates) {
      if (FsUtils.exists(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  static async runWebviewOnDeviceAsync(opt: {
    platform: string;
    package: string;
    url?: string;
  }): Promise<void> {
    const projNpmConf = (await FsUtils.readJsonAsync(
      path.resolve(process.cwd(), "package.json"),
    )) as INpmConfig;
    const allPkgPaths = await projNpmConf.workspaces!.mapManyAsync(
      async (item) => await FsUtils.globAsync(PathUtils.posix(process.cwd(), item)),
    );

    const capacitorPath = path.resolve(
      allPkgPaths.single((item) => item.endsWith(opt.package))!,
      ".capacitor",
    );

    if (opt.url !== undefined) {
      // capacitor.config.ts의 server.url 설정 업데이트
      const configPath = path.resolve(capacitorPath, "capacitor.config.ts");
      if (FsUtils.exists(configPath)) {
        let configContent = await FsUtils.readFileAsync(configPath);
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
        await FsUtils.writeFileAsync(configPath, configContent);
      }
    }

    // cap sync 후 run
    await SdCliCapacitor._execAsync("npx", ["cap", "copy", opt.platform], capacitorPath);

    try {
      await this._execAsync("npx", ["cap", "run", opt.platform], capacitorPath);
    } catch (err) {
      await SdProcess.spawnAsync("adb", ["kill-server"]);
      throw err;
    }
  }
}
