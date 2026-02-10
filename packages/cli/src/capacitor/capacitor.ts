import path from "path";
import { fsExists, fsMkdir, fsRead, fsReadJson, fsWrite, fsWriteJson, fsGlob, fsCopy, fsRm } from "@simplysm/core-node";
import { env } from "@simplysm/core-common";
import { consola } from "consola";
import sharp from "sharp";
import type { SdCapacitorConfig } from "../sd-config.types";
import { spawn } from "../utils/spawn";

/**
 * package.json 타입
 */
interface NpmConfig {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  volta?: unknown;
}

/**
 * 설정 검증 에러
 */
class CapacitorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapacitorConfigError";
  }
}

/**
 * Capacitor 프로젝트 관리 클래스
 *
 * - Capacitor 프로젝트 초기화
 * - Android APK/AAB 빌드
 * - 디바이스에서 앱 실행
 */
export class Capacitor {
  private static readonly _ANDROID_KEYSTORE_FILE_NAME = "android.keystore";
  private static readonly _LOCK_FILE_NAME = ".capacitor.lock";
  private static readonly _logger = consola.withTag("sd:cli:capacitor");

  private readonly _capPath: string;
  private readonly _platforms: string[];
  private readonly _npmConfig: NpmConfig;

  private constructor(
    private readonly _pkgPath: string,
    private readonly _config: SdCapacitorConfig,
    npmConfig: NpmConfig,
  ) {
    this._platforms = Object.keys(this._config.platform ?? {});
    this._npmConfig = npmConfig;
    this._capPath = path.resolve(this._pkgPath, ".capacitor");
  }

  /**
   * Capacitor 인스턴스 생성 (설정 검증 포함)
   */
  static async create(pkgPath: string, config: SdCapacitorConfig): Promise<Capacitor> {
    // F5: 런타임 설정 검증
    Capacitor._validateConfig(config);

    const npmConfig = await fsReadJson<NpmConfig>(path.resolve(pkgPath, "package.json"));
    return new Capacitor(pkgPath, config, npmConfig);
  }

  /**
   * F5: 설정 검증
   */
  private static _validateConfig(config: SdCapacitorConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new CapacitorConfigError("capacitor.appId는 필수입니다.");
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(config.appId)) {
      throw new CapacitorConfigError(`capacitor.appId 형식이 올바르지 않습니다: ${config.appId}`);
    }
    if (typeof config.appName !== "string" || config.appName.trim() === "") {
      throw new CapacitorConfigError("capacitor.appName은 필수입니다.");
    }
    if (config.platform != null) {
      const platforms = Object.keys(config.platform);
      for (const p of platforms) {
        if (p !== "android") {
          throw new CapacitorConfigError(`지원하지 않는 플랫폼: ${p} (현재 android만 지원)`);
        }
      }
    }
  }

  /**
   * 명령어 실행 (로깅 포함)
   */
  private async _exec(cmd: string, args: string[], cwd: string): Promise<string> {
    Capacitor._logger.debug(`실행 명령: ${cmd} ${args.join(" ")}`);
    const result = await spawn(cmd, args, { cwd });
    Capacitor._logger.debug(`실행 결과: ${result}`);
    return result;
  }

  /**
   * F10: 동시 실행 방지를 위한 잠금 획득
   */
  private async _acquireLock(): Promise<void> {
    const lockPath = path.resolve(this._capPath, Capacitor._LOCK_FILE_NAME);
    if (await fsExists(lockPath)) {
      const lockContent = await fsRead(lockPath);
      throw new Error(
        `다른 Capacitor 작업이 진행 중입니다 (PID: ${lockContent}). ` + `문제가 있다면 ${lockPath} 파일을 삭제하세요.`,
      );
    }
    await fsMkdir(this._capPath);
    await fsWrite(lockPath, String(process.pid));
  }

  /**
   * F10: 잠금 해제
   */
  private async _releaseLock(): Promise<void> {
    const lockPath = path.resolve(this._capPath, Capacitor._LOCK_FILE_NAME);
    await fsRm(lockPath);
  }

  /**
   * F4: 외부 도구 검증
   */
  private async _validateTools(): Promise<void> {
    // Android SDK 확인
    const sdkPath = await this._findAndroidSdk();
    if (sdkPath == null) {
      throw new Error(
        "Android SDK를 찾을 수 없습니다.\n" +
          "1. Android Studio를 설치하거나\n" +
          "2. ANDROID_HOME 또는 ANDROID_SDK_ROOT 환경변수를 설정하세요.",
      );
    }

    // Java 확인 (android 플랫폼일 때만)
    if (this._platforms.includes("android")) {
      const javaPath = await this._findJava21();
      if (javaPath == null) {
        Capacitor._logger.warn("Java 21을 찾을 수 없습니다. Gradle이 내장 JDK를 사용하거나 빌드가 실패할 수 있습니다.");
      }
    }
  }

  /**
   * Capacitor 프로젝트 초기화
   *
   * 1. package.json 생성 및 의존성 설치
   * 2. capacitor.config.ts 생성
   * 3. 플랫폼 추가 (android)
   * 4. 아이콘 설정
   * 5. Android 네이티브 설정
   * 6. cap sync 또는 cap copy 실행
   */
  async initialize(): Promise<void> {
    await this._acquireLock();

    try {
      // F4: 외부 도구 검증
      await this._validateTools();

      // 1. Capacitor 프로젝트 초기화
      const changed = await this._initCap();

      // 2. Capacitor 설정 파일 생성
      await this._writeCapConf();

      // 3. 플랫폼 관리 (F12: 멱등성 - 이미 존재하면 스킵)
      await this._addPlatforms();

      // 4. 아이콘 설정 (F6: 에러 복구)
      await this._setupIcon();

      // 5. Android 네이티브 설정
      if (this._platforms.includes("android")) {
        await this._configureAndroid();
      }

      // 6. 웹 자산 동기화
      if (changed) {
        await this._exec("npx", ["cap", "sync"], this._capPath);
      } else {
        await this._exec("npx", ["cap", "copy"], this._capPath);
      }
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Android APK/AAB 빌드
   */
  async build(outPath: string): Promise<void> {
    await this._acquireLock();

    try {
      const buildType = this._config.debug ? "debug" : "release";

      for (const platform of this._platforms) {
        await this._exec("npx", ["cap", "copy", platform], this._capPath);

        if (platform === "android") {
          await this._buildAndroid(outPath, buildType);
        } else {
          throw new Error(`지원하지 않는 플랫폼: ${platform}`);
        }
      }
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * 디바이스에서 앱 실행 (WebView를 개발 서버로 연결)
   */
  async runOnDevice(url?: string): Promise<void> {
    // F11: URL 검증
    if (url != null) {
      this._validateUrl(url);
      await this._updateServerUrl(url);
    }

    for (const platform of this._platforms) {
      await this._exec("npx", ["cap", "copy", platform], this._capPath);

      try {
        await this._exec("npx", ["cap", "run", platform], this._capPath);
      } catch (err) {
        if (platform === "android") {
          try {
            await this._exec("adb", ["kill-server"], this._capPath);
          } catch {
            // adb kill-server 실패는 무시
          }
        }
        throw err;
      }
    }
  }

  /**
   * F11: URL 검증
   */
  private _validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(`지원하지 않는 프로토콜: ${parsed.protocol}`);
      }
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(`유효하지 않은 URL: ${url}`);
      }
      throw err;
    }
  }

  //#region Private - 초기화

  /**
   * Capacitor 프로젝트 기본 초기화 (package.json, npm install, cap init)
   */
  private async _initCap(): Promise<boolean> {
    const depChanged = await this._setupNpmConf();
    if (!depChanged) return false;

    // pnpm install
    const installResult = await this._exec("pnpm", ["install"], this._capPath);
    Capacitor._logger.debug(`pnpm install 완료: ${installResult}`);

    // F12: cap init 멱등성 - capacitor.config.ts가 없을 때만 실행
    const configPath = path.resolve(this._capPath, "capacitor.config.ts");
    if (!(await fsExists(configPath))) {
      await this._exec("npx", ["cap", "init", this._config.appName, this._config.appId], this._capPath);
    }

    // 기본 www/index.html 생성
    const wwwPath = path.resolve(this._capPath, "www");
    await fsMkdir(wwwPath);
    await fsWrite(path.resolve(wwwPath, "index.html"), "<!DOCTYPE html><html><head></head><body></body></html>");

    return true;
  }

  /**
   * package.json 설정
   */
  private async _setupNpmConf(): Promise<boolean> {
    const projNpmConfigPath = path.resolve(this._pkgPath, "../../package.json");

    // F3: 파일 존재 확인
    if (!(await fsExists(projNpmConfigPath))) {
      throw new Error(`루트 package.json을 찾을 수 없습니다: ${projNpmConfigPath}`);
    }

    const projNpmConfig = await fsReadJson<NpmConfig>(projNpmConfigPath);

    const capNpmConfPath = path.resolve(this._capPath, "package.json");
    const orgCapNpmConf: NpmConfig = (await fsExists(capNpmConfPath))
      ? await fsReadJson<NpmConfig>(capNpmConfPath)
      : { name: "", version: "" };

    const capNpmConf: NpmConfig = { ...orgCapNpmConf };
    capNpmConf.name = this._config.appId;
    capNpmConf.version = this._npmConfig.version;
    if (projNpmConfig.volta != null) {
      capNpmConf.volta = projNpmConfig.volta;
    }

    // 기본 의존성
    capNpmConf.dependencies = capNpmConf.dependencies ?? {};
    capNpmConf.dependencies["@capacitor/core"] = "^7.0.0";
    capNpmConf.dependencies["@capacitor/app"] = "^7.0.0";
    for (const platform of this._platforms) {
      capNpmConf.dependencies[`@capacitor/${platform}`] = "^7.0.0";
    }

    capNpmConf.devDependencies = capNpmConf.devDependencies ?? {};
    capNpmConf.devDependencies["@capacitor/cli"] = "^7.0.0";
    capNpmConf.devDependencies["@capacitor/assets"] = "^3.0.0";

    // 플러그인 패키지 설정
    const mainDeps = {
      ...this._npmConfig.dependencies,
      ...this._npmConfig.devDependencies,
      ...this._npmConfig.peerDependencies,
    };

    const usePlugins = Object.keys(this._config.plugins ?? {});

    const prevPlugins = Object.keys(capNpmConf.dependencies).filter(
      (item) => !["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/app"].includes(item),
    );

    // 사용하지 않는 플러그인 제거
    for (const prevPlugin of prevPlugins) {
      if (!usePlugins.includes(prevPlugin)) {
        delete capNpmConf.dependencies[prevPlugin];
        Capacitor._logger.debug(`플러그인 제거: ${prevPlugin}`);
      }
    }

    // 새 플러그인 추가
    for (const plugin of usePlugins) {
      if (!(plugin in capNpmConf.dependencies)) {
        const version = mainDeps[plugin] ?? "*";
        capNpmConf.dependencies[plugin] = version;
        Capacitor._logger.debug(`플러그인 추가: ${plugin}@${version}`);
      }
    }

    // 저장
    await fsMkdir(this._capPath);
    await fsWriteJson(capNpmConfPath, capNpmConf, { space: 2 });

    // 의존성 변경 여부 확인
    const isChanged =
      orgCapNpmConf.volta !== capNpmConf.volta ||
      JSON.stringify(orgCapNpmConf.dependencies) !== JSON.stringify(capNpmConf.dependencies) ||
      JSON.stringify(orgCapNpmConf.devDependencies) !== JSON.stringify(capNpmConf.devDependencies);

    return isChanged;
  }

  /**
   * capacitor.config.ts 생성
   */
  private async _writeCapConf(): Promise<void> {
    const confPath = path.resolve(this._capPath, "capacitor.config.ts");

    // 플러그인 옵션 생성
    const pluginOptions: Record<string, Record<string, unknown>> = {};
    for (const [pluginName, options] of Object.entries(this._config.plugins ?? {})) {
      if (options !== true) {
        const configKey = this._toPascalCase(pluginName.split("/").at(-1)!);
        pluginOptions[configKey] = options;
      }
    }

    const pluginsConfigStr =
      Object.keys(pluginOptions).length > 0 ? JSON.stringify(pluginOptions, null, 2).replace(/^/gm, "  ").trim() : "{}";

    const configContent = `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "${this._config.appId}",
  appName: "${this._config.appName}",
  server: {
    androidScheme: "http",
    cleartext: true
  },
  android: {},
  plugins: ${pluginsConfigStr},
};

export default config;
`;

    await fsWrite(confPath, configContent);
  }

  /**
   * 플랫폼 추가 (F12: 멱등성 보장)
   */
  private async _addPlatforms(): Promise<void> {
    for (const platform of this._platforms) {
      const platformPath = path.resolve(this._capPath, platform);
      if (await fsExists(platformPath)) {
        Capacitor._logger.debug(`플랫폼 이미 존재: ${platform}`);
        continue;
      }

      await this._exec("npx", ["cap", "add", platform], this._capPath);
    }
  }

  /**
   * 아이콘 설정 (F6: 에러 복구)
   */
  private async _setupIcon(): Promise<void> {
    const assetsDirPath = path.resolve(this._capPath, "assets");

    if (this._config.icon != null) {
      const iconSource = path.resolve(this._pkgPath, this._config.icon);

      // F6: 소스 아이콘 존재 확인
      if (!(await fsExists(iconSource))) {
        Capacitor._logger.warn(`아이콘 파일을 찾을 수 없습니다: ${iconSource}. 기본 아이콘을 사용합니다.`);
        return;
      }

      try {
        await fsMkdir(assetsDirPath);

        // 아이콘 생성
        const logoPath = path.resolve(assetsDirPath, "logo.png");

        const logoSize = Math.floor(1024 * 0.6);
        const padding = Math.floor((1024 - logoSize) / 2);

        // F6: sharp 에러 처리
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

        await this._exec(
          "npx",
          ["@capacitor/assets", "generate", "--iconBackgroundColor", "#ffffff", "--splashBackgroundColor", "#ffffff"],
          this._capPath,
        );
      } catch (err) {
        Capacitor._logger.warn(
          `아이콘 생성 실패: ${err instanceof Error ? err.message : err}. 기본 아이콘을 사용합니다.`,
        );
        // F6: 실패해도 계속 진행 (기본 아이콘 사용)
      }
    } else {
      await fsRm(assetsDirPath);
    }
  }

  //#endregion

  //#region Private - Android 설정

  /**
   * Android 네이티브 설정
   */
  private async _configureAndroid(): Promise<void> {
    const androidPath = path.resolve(this._capPath, "android");

    // F3: Android 디렉토리 존재 확인
    if (!(await fsExists(androidPath))) {
      throw new Error(`Android 프로젝트 디렉토리가 없습니다: ${androidPath}`);
    }

    await this._configureAndroidJavaHomePath(androidPath);
    await this._configureAndroidSdkPath(androidPath);
    await this._configureAndroidManifest(androidPath);
    await this._configureAndroidBuildGradle(androidPath);
  }

  /**
   * JAVA_HOME 경로 설정 (gradle.properties)
   */
  private async _configureAndroidJavaHomePath(androidPath: string): Promise<void> {
    const gradlePropsPath = path.resolve(androidPath, "gradle.properties");

    // F3: 파일 존재 확인
    if (!(await fsExists(gradlePropsPath))) {
      Capacitor._logger.warn(`gradle.properties 파일이 없습니다: ${gradlePropsPath}`);
      return;
    }

    let content = await fsRead(gradlePropsPath);

    const java21Path = await this._findJava21();
    if (java21Path != null && !content.includes("org.gradle.java.home")) {
      // F9: Windows 경로 이스케이프 개선
      const escapedPath = java21Path.replace(/\\/g, "\\\\");
      content += `\norg.gradle.java.home=${escapedPath}\n`;
      await fsWrite(gradlePropsPath, content);
    }
  }

  /**
   * Java 21 경로 자동 탐색
   */
  private async _findJava21(): Promise<string | undefined> {
    const patterns = [
      "C:/Program Files/Amazon Corretto/jdk21*",
      "C:/Program Files/Eclipse Adoptium/jdk-21*",
      "C:/Program Files/Java/jdk-21*",
      "C:/Program Files/Microsoft/jdk-21*",
      "/usr/lib/jvm/java-21*",
      "/usr/lib/jvm/temurin-21*",
    ];

    for (const pattern of patterns) {
      const matches = await fsGlob(pattern);
      if (matches.length > 0) {
        return matches.sort().at(-1);
      }
    }

    return undefined;
  }

  /**
   * Android SDK 경로 설정 (local.properties)
   */
  private async _configureAndroidSdkPath(androidPath: string): Promise<void> {
    const localPropsPath = path.resolve(androidPath, "local.properties");

    const sdkPath = await this._findAndroidSdk();
    if (sdkPath != null) {
      // F9: 항상 forward slash 사용 (Gradle 호환)
      await fsWrite(localPropsPath, `sdk.dir=${sdkPath.replace(/\\/g, "/")}\n`);
    } else {
      throw new Error(
        "Android SDK를 찾을 수 없습니다.\n" +
          "1. Android Studio를 설치하거나\n" +
          "2. ANDROID_HOME 또는 ANDROID_SDK_ROOT 환경변수를 설정하세요.",
      );
    }
  }

  /**
   * Android SDK 경로 탐색
   */
  private async _findAndroidSdk(): Promise<string | undefined> {
    const fromEnv = (env["ANDROID_HOME"] ?? env["ANDROID_SDK_ROOT"]) as string | undefined;
    if (fromEnv != null && (await fsExists(fromEnv))) {
      return fromEnv;
    }

    const candidates = [
      path.resolve((env["LOCALAPPDATA"] as string | undefined) ?? "", "Android/Sdk"),
      path.resolve((env["HOME"] as string | undefined) ?? "", "Android/Sdk"),
      "C:/Program Files/Android/Sdk",
      "C:/Android/Sdk",
    ];

    for (const candidate of candidates) {
      if (await fsExists(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * AndroidManifest.xml 수정 (F3: 에러 처리 추가)
   */
  private async _configureAndroidManifest(androidPath: string): Promise<void> {
    const manifestPath = path.resolve(androidPath, "app/src/main/AndroidManifest.xml");

    // F3: 파일 존재 확인
    if (!(await fsExists(manifestPath))) {
      throw new Error(`AndroidManifest.xml 파일이 없습니다: ${manifestPath}`);
    }

    let content = await fsRead(manifestPath);

    // usesCleartextTraffic 설정
    if (!content.includes("android:usesCleartextTraffic")) {
      content = content.replace("<application", '<application android:usesCleartextTraffic="true"');
    }

    // 추가 권한 설정
    const permissions = this._config.platform?.android?.permissions ?? [];
    for (const perm of permissions) {
      const permTag = `<uses-permission android:name="android.permission.${perm.name}"`;
      if (!content.includes(permTag)) {
        const maxSdkAttr = perm.maxSdkVersion != null ? ` android:maxSdkVersion="${perm.maxSdkVersion}"` : "";
        const ignoreAttr = perm.ignore != null ? ` tools:ignore="${perm.ignore}"` : "";
        const permLine = `    ${permTag}${maxSdkAttr}${ignoreAttr} />\n`;

        if (perm.ignore != null && !content.includes("xmlns:tools=")) {
          content = content.replace(
            "<manifest xmlns:android",
            '<manifest xmlns:tools="http://schemas.android.com/tools" xmlns:android',
          );
        }

        content = content.replace("</manifest>", `${permLine}</manifest>`);
      }
    }

    // 추가 application 설정
    const appConfig = this._config.platform?.android?.config;
    if (appConfig) {
      for (const [key, value] of Object.entries(appConfig)) {
        const attr = `android:${key}="${value}"`;
        if (!content.includes(`android:${key}=`)) {
          content = content.replace("<application", `<application ${attr}`);
        }
      }
    }

    // intentFilters 설정
    const intentFilters = this._config.platform?.android?.intentFilters ?? [];
    for (const filter of intentFilters) {
      const filterKey = filter.action ?? filter.category ?? "";
      if (filterKey && !content.includes(filterKey)) {
        const actionLine = filter.action != null ? `<action android:name="${filter.action}"/>` : "";
        const categoryLine = filter.category != null ? `<category android:name="${filter.category}"/>` : "";

        content = content.replace(
          /(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?>)/,
          `$1
            <intent-filter>
                ${actionLine}
                ${categoryLine}
            </intent-filter>`,
        );
      }
    }

    await fsWrite(manifestPath, content);
  }

  /**
   * build.gradle 수정 (F3: 에러 처리 추가)
   */
  private async _configureAndroidBuildGradle(androidPath: string): Promise<void> {
    const buildGradlePath = path.resolve(androidPath, "app/build.gradle");

    // F3: 파일 존재 확인
    if (!(await fsExists(buildGradlePath))) {
      throw new Error(`build.gradle 파일이 없습니다: ${buildGradlePath}`);
    }

    let content = await fsRead(buildGradlePath);

    // versionName, versionCode 설정
    const version = this._npmConfig.version;
    const versionParts = version.split(".");
    const versionCode =
      parseInt(versionParts[0] ?? "0") * 10000 +
      parseInt(versionParts[1] ?? "0") * 100 +
      parseInt(versionParts[2] ?? "0");

    content = content.replace(/versionCode \d+/, `versionCode ${versionCode}`);
    content = content.replace(/versionName "[^"]+"/, `versionName "${version}"`);

    // SDK 버전 설정
    if (this._config.platform?.android?.sdkVersion != null) {
      const sdkVersion = this._config.platform.android.sdkVersion;
      content = content.replace(/minSdkVersion .+/, `minSdkVersion ${sdkVersion}`);
      content = content.replace(/targetSdkVersion .+/, `targetSdkVersion ${sdkVersion}`);
    } else {
      content = content.replace(/minSdkVersion .+/, `minSdkVersion rootProject.ext.minSdkVersion`);
      content = content.replace(/targetSdkVersion .+/, `targetSdkVersion rootProject.ext.targetSdkVersion`);
    }

    // Signing 설정
    const keystorePath = path.resolve(this._capPath, Capacitor._ANDROID_KEYSTORE_FILE_NAME);
    const signConfig = this._config.platform?.android?.sign;
    if (signConfig) {
      const keystoreSource = path.resolve(this._pkgPath, signConfig.keystore);
      // F3: keystore 파일 존재 확인
      if (!(await fsExists(keystoreSource))) {
        throw new Error(`keystore 파일을 찾을 수 없습니다: ${keystoreSource}`);
      }
      await fsCopy(keystoreSource, keystorePath);

      // F9: 상대 경로를 forward slash로 변환
      const keystoreRelativePath = path.relative(path.dirname(buildGradlePath), keystorePath).replace(/\\/g, "/");
      const keystoreType = signConfig.keystoreType ?? "jks";

      if (!content.includes("signingConfigs")) {
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
        content = content.replace(/(android\s*\{)/, (match) => `${match}${signingConfigsBlock}`);
      }

      if (!content.includes("signingConfig signingConfigs.release")) {
        content = content.replace(
          /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
          `$1\n            signingConfig signingConfigs.release`,
        );
      }
    } else {
      await fsRm(keystorePath);
    }

    await fsWrite(buildGradlePath, content);
  }

  //#endregion

  //#region Private - 빌드

  /**
   * Android 빌드
   */
  private async _buildAndroid(outPath: string, buildType: string): Promise<void> {
    const androidPath = path.resolve(this._capPath, "android");
    const targetOutPath = path.resolve(outPath, "android");

    const isBundle = this._config.platform?.android?.bundle;
    const gradleTask = buildType === "release" ? (isBundle ? "bundleRelease" : "assembleRelease") : "assembleDebug";

    // Gradle 빌드 실행 (크로스 플랫폼)
    // F9: Windows에서 cmd.exe를 통해 실행 (shell: false 이므로)
    if (process.platform === "win32") {
      await this._exec("cmd", ["/c", "gradlew.bat", gradleTask, "--no-daemon"], androidPath);
    } else {
      await this._exec("sh", ["./gradlew", gradleTask, "--no-daemon"], androidPath);
    }

    // 빌드 결과물 복사
    await this._copyAndroidBuildOutput(androidPath, targetOutPath, buildType);
  }

  /**
   * Android 빌드 결과물 복사
   */
  private async _copyAndroidBuildOutput(androidPath: string, targetOutPath: string, buildType: string): Promise<void> {
    const isBundle = this._config.platform?.android?.bundle;
    const isSigned = Boolean(this._config.platform?.android?.sign);

    const ext = isBundle ? "aab" : "apk";
    const outputType = isBundle ? "bundle" : "apk";
    const fileName = isSigned ? `app-${buildType}.${ext}` : `app-${buildType}-unsigned.${ext}`;

    const sourcePath = path.resolve(androidPath, "app/build/outputs", outputType, buildType, fileName);

    const actualPath = (await fsExists(sourcePath))
      ? sourcePath
      : path.resolve(androidPath, "app/build/outputs", outputType, buildType, `app-${buildType}.${ext}`);

    if (!(await fsExists(actualPath))) {
      Capacitor._logger.warn(`빌드 결과물을 찾을 수 없습니다: ${actualPath}`);
      return;
    }

    const outputFileName = `${this._config.appName}${isSigned ? "" : "-unsigned"}-latest.${ext}`;

    await fsMkdir(targetOutPath);
    await fsCopy(actualPath, path.resolve(targetOutPath, outputFileName));

    // 버전별 저장
    const updatesPath = path.resolve(targetOutPath, "updates");
    await fsMkdir(updatesPath);
    await fsCopy(actualPath, path.resolve(updatesPath, `${this._npmConfig.version}.${ext}`));
  }

  //#endregion

  //#region Private - 디바이스 실행

  /**
   * capacitor.config.ts의 server.url 업데이트
   */
  private async _updateServerUrl(url: string): Promise<void> {
    const configPath = path.resolve(this._capPath, "capacitor.config.ts");

    if (!(await fsExists(configPath))) return;

    let content = await fsRead(configPath);

    if (content.includes("url:")) {
      content = content.replace(/url:\s*"[^"]*"/, `url: "${url}"`);
    } else if (content.includes("server:")) {
      content = content.replace(/server:\s*\{/, `server: {\n    url: "${url}",`);
    }

    await fsWrite(configPath, content);
  }

  //#endregion

  //#region Private - 유틸리티

  /**
   * 문자열을 PascalCase로 변환
   */
  private _toPascalCase(str: string): string {
    return str.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
  }

  //#endregion
}
