import * as path from "path";
import { FsUtils, PathUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import type { ISdClientBuilderCapacitorConfig } from "../types/config/ISdProjectConfig";
import type { INpmConfig } from "../types/common-config/INpmConfig";
import { NotImplementError, ObjectUtils, StringUtils, typescript } from "@simplysm/sd-core-common";
import sharp from "sharp";

export class SdCliCapacitor {
  // 상수 정의
  private readonly _ANDROID_KEYSTORE_FILE_NAME = "android.keystore";

  private readonly _capPath: string;

  private readonly _platforms: string[];
  private readonly _npmConfig: INpmConfig;

  constructor(private readonly _opt: { pkgPath: string; config: ISdClientBuilderCapacitorConfig }) {
    this._platforms = Object.keys(this._opt.config.platform ?? {});
    this._npmConfig = FsUtils.readJson(path.resolve(this._opt.pkgPath, "package.json"));
    this._capPath = path.resolve(this._opt.pkgPath, ".capacitor");
  }

  private static readonly _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliCapacitor"]);

  private static async _execAsync(cmd: string, args: string[], cwd: string): Promise<string> {
    this._logger.debug(`실행 명령: ${cmd + " " + args.join(" ")}`);
    const msg = await SdProcess.spawnAsync(cmd, args, {
      cwd,
      env: {
        FORCE_COLOR: "1", // chalk, supports-color 계열
        CLICOLOR_FORCE: "1", // 일부 Unix 도구
        COLORTERM: "truecolor", // 추가 힌트
      },
    });
    this._logger.debug(`실행 결과: ${msg}`);
    return msg;
  }

  async initializeAsync(): Promise<void> {
    // 1. Capacitor 프로젝트 초기화
    const changed = await this._initCapAsync();

    // 2. Capacitor 설정 파일 생성
    await this._writeCapConfAsync();

    // 3. 플랫폼 관리
    await this._addPlatformsAsync();

    // 4. 아이콘 설정
    await this._setupIconAsync();

    // 5. Android 네이티브 설정
    if (this._platforms.includes("android")) {
      await this._configureAndroidAsync();
    }

    // 6. 웹 자산 동기화
    if (changed) {
      await SdCliCapacitor._execAsync("npx", ["cap", "sync"], this._capPath);
    } else {
      await SdCliCapacitor._execAsync("npx", ["cap", "copy"], this._capPath);
    }
  }

  // 1. Capacitor 프로젝트 초기화
  private async _initCapAsync(): Promise<boolean> {
    // package.json 파일 구성
    const depChanged = await this._setupNpmConfAsync();
    if (!depChanged) return false;

    // .yarnrc.yml 작성
    await FsUtils.writeFileAsync(
      path.resolve(this._capPath, ".yarnrc.yml"),
      "nodeLinker: node-modules",
    );

    // 빈 yarn.lock 작성
    await FsUtils.writeFileAsync(path.resolve(this._capPath, "yarn.lock"), "");

    // yarn install
    const installResult = await SdCliCapacitor._execAsync("yarn", ["install"], this._capPath);
    const errorLines = installResult.split("\n").filter((item) => item.includes("YN0002"));
    // peer dependency 경고 감지
    if (errorLines.length > 0) {
      throw new Error(errorLines.join("\n"));
    }

    // cap init
    await SdCliCapacitor._execAsync(
      "npx",
      ["cap", "init", this._opt.config.appName, this._opt.config.appId],
      this._capPath,
    );

    // 기본 www/index.html 생성
    const wwwPath = path.resolve(this._capPath, "www");
    await FsUtils.writeFileAsync(
      path.resolve(wwwPath, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );

    return true;
  }

  private async _setupNpmConfAsync() {
    const projNpmConfig = await FsUtils.readJsonAsync(
      path.resolve(this._opt.pkgPath, "../../package.json"),
    );

    // -----------------------------
    // 기본설정
    // -----------------------------

    const capNpmConfPath = path.resolve(this._capPath, "package.json");
    const orgCapNpmConf = FsUtils.exists(capNpmConfPath)
      ? await FsUtils.readJsonAsync(path.resolve(this._capPath, "package.json"))
      : {};

    const capNpmConf = ObjectUtils.clone(orgCapNpmConf);
    capNpmConf.name = this._opt.config.appId;
    capNpmConf.version = this._npmConfig.version;
    capNpmConf.volta = projNpmConfig.volta;
    capNpmConf.dependencies = capNpmConf.dependencies ?? {};
    capNpmConf.dependencies["@capacitor/core"] = "^7.0.0";
    capNpmConf.dependencies["@capacitor/app"] = "^7.0.0";
    for (const platform of this._platforms) {
      capNpmConf.dependencies[`@capacitor/${platform}`] = "^7.0.0";
    }
    capNpmConf.devDependencies = capNpmConf.devDependencies ?? {};
    capNpmConf.devDependencies["@capacitor/cli"] = "^7.0.0";
    capNpmConf.devDependencies["@capacitor/assets"] = "^3.0.0";

    // -----------------------------
    // 플러그인 패키지 설정
    // -----------------------------

    const mainDeps = {
      ...this._npmConfig.dependencies,
      ...this._npmConfig.devDependencies,
      ...this._npmConfig.peerDependencies,
    };

    const usePlugins = Object.keys(this._opt.config.plugins ?? {});

    const prevPlugins = Object.keys(capNpmConf.dependencies).filter(
      (item) =>
        !["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/app"].includes(
          item,
        ),
    );

    // 사용하지 않는 플러그인 제거
    for (const prevPlugin of prevPlugins) {
      if (!usePlugins.includes(prevPlugin)) {
        delete capNpmConf.dependencies[prevPlugin];
        SdCliCapacitor._logger.debug(`플러그인 제거: ${prevPlugin}`);
      }
    }

    // 새 플러그인 추가
    for (const plugin of usePlugins) {
      if (!(plugin in capNpmConf.dependencies)) {
        const version = mainDeps[plugin] ?? "*";
        capNpmConf.dependencies[plugin] = version;
        SdCliCapacitor._logger.debug(`플러그인 추가: ${plugin}@${version}`);
      }
    }

    // -----------------------------
    // 저장
    // -----------------------------

    await FsUtils.writeJsonAsync(capNpmConfPath, capNpmConf, { space: 2 });

    return (
      !ObjectUtils.equal(orgCapNpmConf.volta, capNpmConf.volta) ||
      !ObjectUtils.equal(orgCapNpmConf.dependencies, capNpmConf.dependencies) ||
      !ObjectUtils.equal(orgCapNpmConf.devDependencies, capNpmConf.devDependencies)
    );

    /*// volta, dep, devDep 이 변한 경우에만, yarn install
    if (
      !ObjectUtils.equal(orgCapNpmConf.volta, capNpmConf.volta) ||
      !ObjectUtils.equal(orgCapNpmConf.dependencies, capNpmConf.dependencies) ||
      !ObjectUtils.equal(orgCapNpmConf.devDependencies, capNpmConf.devDependencies)
    ) {
      const installResult = await SdCliCapacitor._execAsync("yarn", ["install"], this._capPath);

      const errorLines = installResult.split("\n").filter((item) => item.includes("YN0002"));

      // peer dependency 경고 감지
      if (errorLines.length > 0) {
        throw new Error(errorLines.join("\n"));
      }

      return true;
    }
    // 변경 없으면 아무것도 안 함 → 오프라인 OK
    return false;*/
  }

  // 2. Capacitor 설정 파일 생성
  private async _writeCapConfAsync() {
    const confPath = path.resolve(this._capPath, "capacitor.config.ts");

    // 플러그인 옵션 생성
    const pluginOptions: Record<string, Record<string, unknown>> = {};
    for (const [pluginName, options] of Object.entries(this._opt.config.plugins ?? {})) {
      if (options !== true) {
        const configKey = StringUtils.toPascalCase(pluginName.split("/").last()!);
        pluginOptions[configKey] = options;
      }
    }

    const pluginsConfigStr =
      Object.keys(pluginOptions).length > 0
        ? JSON.stringify(pluginOptions, null, 2).replace(/^/gm, "  ").trim()
        : "{}";

    const configContent = typescript`
      import type { CapacitorConfig } from "@capacitor/cli";

      const config: CapacitorConfig = {
        appId: "${this._opt.config.appId}",
        appName: "${this._opt.config.appName}",
        server: {
          androidScheme: "http",
          cleartext: true
        },
        android: {},
        plugins: ${pluginsConfigStr},
      };

      export default config;
    `;

    await FsUtils.writeFileAsync(confPath, configContent);
  }

  // 3. 플랫폼 추가
  private async _addPlatformsAsync(): Promise<void> {
    for (const platform of this._platforms) {
      if (FsUtils.exists(path.resolve(this._capPath, platform))) continue;

      await SdCliCapacitor._execAsync("npx", ["cap", "add", platform], this._capPath);
    }
  }

  // 4. 아이콘 설정
  private async _setupIconAsync(): Promise<void> {
    const assetsDirPath = path.resolve(this._capPath, "assets");

    if (this._opt.config.icon != null) {
      await FsUtils.mkdirsAsync(assetsDirPath);

      const iconSource = path.resolve(this._opt.pkgPath, this._opt.config.icon);

      // 아이콘 생성
      const logoPath = path.resolve(assetsDirPath, "logo.png");

      const logoSize = Math.floor(1024 * 0.6);
      const padding = Math.floor((1024 - logoSize) / 2);

      await sharp(iconSource)
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
        .toFile(logoPath);

      // await this._cleanupExistingIconsAsync();

      await SdCliCapacitor._execAsync(
        "npx",
        [
          "@capacitor/assets",
          "generate",
          "--iconBackgroundColor",
          "#ffffff",
          "--splashBackgroundColor",
          "#ffffff",
        ],
        this._capPath,
      );
    } else {
      await FsUtils.removeAsync(assetsDirPath);
    }
  }

  // 기존 아이콘 파일 삭제
  // private async _cleanupExistingIconsAsync(): Promise<void> {
  //   const androidResPath = path.resolve(capacitorPath, "android/app/src/main/res");
  //
  //   if (!FsUtils.exists(androidResPath)) return;
  //
  //   // mipmap 폴더의 모든 ic_launcher 관련 파일 삭제 (png + xml)
  //   const mipmapDirs = await FsUtils.globAsync(path.resolve(androidResPath, "mipmap-*"));
  //   for (const dir of mipmapDirs) {
  //     const iconFiles = await FsUtils.globAsync(path.resolve(dir, "ic_launcher*")); // 확장자 제거
  //     for (const file of iconFiles) {
  //       await FsUtils.removeAsync(file);
  //     }
  //   }
  //
  //   // drawable 폴더의 splash/icon 관련 파일도 삭제
  //   const drawableDirs = await FsUtils.globAsync(path.resolve(androidResPath, "drawable*"));
  //   for (const dir of drawableDirs) {
  //     const splashFiles = await FsUtils.globAsync(path.resolve(dir, "splash*"));
  //     const iconFiles = await FsUtils.globAsync(path.resolve(dir, "ic_launcher*"));
  //     for (const file of [...splashFiles, ...iconFiles]) {
  //       await FsUtils.removeAsync(file);
  //     }
  //   }
  // }

  // 5. Android 네이티브 설정
  private async _configureAndroidAsync() {
    const androidPath = path.resolve(this._capPath, "android");

    // JAVA_HOME 경로 설정
    await this._configureAndroidJavaHomePathAsync(androidPath);

    // SDK 경로 설정
    await this._configureAndroidSdkPathAsync(androidPath);

    // AndroidManifest.xml 수정
    await this._configureAndroidManifestAsync(androidPath);

    // build.gradle 수정 (필요시)
    await this._configureAndroidBuildGradleAsync(androidPath);

    // TODO: strings.xml 앱 이름 수정?? WHY?
    // await this._configureAndroidStringsAsync(androidPath);

    // TODO: styles.xml 수정?? WHY?
    // await this._configureAndroidStylesAsync(androidPath);
  }

  // JAVA_HOME 경로 설정
  private async _configureAndroidJavaHomePathAsync(androidPath: string) {
    const gradlePropsPath = path.resolve(androidPath, "gradle.properties");

    let content = await FsUtils.readFileAsync(gradlePropsPath);

    // Java 21 경로 자동 탐색
    const java21Path = await this._findJava21Async();
    if (java21Path != null && !content.includes("org.gradle.java.home")) {
      content += `\norg.gradle.java.home=${java21Path.replace(/\\/g, "\\\\")}\n`;
      FsUtils.writeFile(gradlePropsPath, content);
    }
  }

  private async _findJava21Async(): Promise<string | undefined> {
    const patterns = [
      "C:/Program Files/Amazon Corretto/jdk21*",
      "C:/Program Files/Eclipse Adoptium/jdk-21*",
      "C:/Program Files/Java/jdk-21*",
      "C:/Program Files/Microsoft/jdk-21*",
    ];

    for (const pattern of patterns) {
      const matches = await FsUtils.globAsync(pattern);
      if (matches.length > 0) {
        // 가장 최신 버전 선택 (정렬 후 마지막)
        return matches.sort().at(-1);
      }
    }

    return undefined;
  }

  // SDK 경로 설정
  private async _configureAndroidSdkPathAsync(androidPath: string) {
    const localPropsPath = path.resolve(androidPath, "local.properties");

    // SDK 경로 탐색 (Cordova 방식과 유사)
    const sdkPath = this._findAndroidSdk();
    if (sdkPath != null) {
      await FsUtils.writeFileAsync(localPropsPath, `sdk.dir=${sdkPath.replace(/\\/g, "/")}\n`);
    }
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

  // AndroidManifest.xml 수정
  private async _configureAndroidManifestAsync(androidPath: string) {
    const manifestPath = path.resolve(androidPath, "app/src/main/AndroidManifest.xml");

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

  // build.gradle 수정 (필요시)
  private async _configureAndroidBuildGradleAsync(androidPath: string) {
    const buildGradlePath = path.resolve(androidPath, "app/build.gradle");

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
      gradleContent = gradleContent.replace(/minSdkVersion .+/, `minSdkVersion ${sdkVersion}`);
      gradleContent = gradleContent.replace(
        /targetSdkVersion .+/,
        `targetSdkVersion ${sdkVersion}`,
      );
    } else {
      gradleContent = gradleContent.replace(
        /minSdkVersion .+/,
        `minSdkVersion rootProject.ext.minSdkVersion`,
      );
      gradleContent = gradleContent.replace(
        /targetSdkVersion .+/,
        `targetSdkVersion rootProject.ext.targetSdkVersion`,
      );
    }

    // Signing 설정
    const keystorePath = path.resolve(this._capPath, this._ANDROID_KEYSTORE_FILE_NAME);
    const signConfig = this._opt.config.platform?.android?.sign;
    if (signConfig) {
      await FsUtils.copyAsync(path.resolve(this._opt.pkgPath, signConfig.keystore), keystorePath);

      const keystoreRelativePath = path
        .relative(path.dirname(buildGradlePath), keystorePath)
        .replace(/\\/g, "/");
      const keystoreType = signConfig.keystoreType ?? "jks";

      // signingConfigs 블록 추가
      if (!gradleContent.includes("signingConfigs")) {
        const signingConfigsBlock = `
    signingConfigs {
        release {
            storeFile file("${keystoreRelativePath}")
            storePassword '${signConfig.storePassword}'
            keyAlias '${signConfig.alias}'
            keyPassword '${signConfig.password}'
            storeType "${keystoreType}"
        }
    }
`;
        // android { 블록 내부에 추가
        gradleContent = gradleContent.replace(
          /(android\s*\{)/,
          (match) => `${match}${signingConfigsBlock}`,
        );
      }

      // buildTypes.release에 signingConfig 추가
      if (!gradleContent.includes("signingConfig signingConfigs.release")) {
        gradleContent = gradleContent.replace(
          /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
          `$1\n            signingConfig signingConfigs.release`,
        );
      }
    } else {
      //TODO: gradleContent에서 signingConfigs 관련 부분 삭제
      await FsUtils.removeAsync(keystorePath);
    }

    await FsUtils.writeFileAsync(buildGradlePath, gradleContent);
  }

  /*private async _configureAndroidStringsAsync(androidPath: string) {
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
  }*/

  /*private async _configureAndroidStylesAsync(androidPath: string) {
    const stylesPath = path.resolve(androidPath, "app/src/main/res/values/styles.xml");

    if (!FsUtils.exists(stylesPath)) {
      return;
    }

    let stylesContent = await FsUtils.readFileAsync(stylesPath);

    // Edge-to-Edge 비활성화만
    if (!stylesContent.includes("android:windowOptOutEdgeToEdgeEnforcement")) {
      stylesContent = stylesContent.replace(
        /(<style[^>]*name="AppTheme"[^>]*>)/,
        `$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>`,
      );
    }

    // NoActionBarLaunch를 단순 NoActionBar로
    stylesContent = stylesContent.replace(
      /(<style\s+name="AppTheme\.NoActionBarLaunch"\s+parent=")[^"]+(")/,
      `$1Theme.AppCompat.Light.NoActionBar$2`,
    );

    // splash 관련 전부 제거
    stylesContent = stylesContent.replace(
      /\s*<item name="android:background">@drawable\/splash<\/item>/g,
      "",
    );
    stylesContent = stylesContent.replace(
      /\s*<item name="android:windowSplashScreen[^"]*">[^<]*<\/item>/g,
      "",
    );

    await FsUtils.writeFileAsync(stylesPath, stylesContent);
  }*/

  async buildAsync(outPath: string): Promise<void> {
    const buildType = this._opt.config.debug ? "debug" : "release";

    // 플랫폼별 빌드
    for (const platform of this._platforms) {
      // 해당 플랫폼만 copy
      await SdCliCapacitor._execAsync("npx", ["cap", "copy", platform], this._capPath);

      if (platform === "android") {
        await this._buildAndroidAsync(outPath, buildType);
      } else {
        throw new NotImplementError();
      }
    }
  }

  private async _buildAndroidAsync(outPath: string, buildType: string): Promise<void> {
    const androidPath = path.resolve(this._capPath, "android");
    const targetOutPath = path.resolve(outPath, "android");

    const isBundle = this._opt.config.platform?.android?.bundle;
    const gradleTask =
      buildType === "release" ? (isBundle ? "bundleRelease" : "assembleRelease") : "assembleDebug";

    // Gradle 빌드 실행
    await SdCliCapacitor._execAsync(
      "cmd",
      ["/c", "gradlew.bat", gradleTask, "--no-daemon"],
      androidPath,
    );

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
      await this._execAsync("adb", ["kill-server"], capacitorPath);
      throw err;
    }
  }
}
