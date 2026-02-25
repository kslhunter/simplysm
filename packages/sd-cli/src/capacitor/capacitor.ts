import path from "path";
import {
  fsExists,
  fsMkdir,
  fsRead,
  fsReadJson,
  fsWrite,
  fsWriteJson,
  fsGlob,
  fsCopy,
  fsRm,
} from "@simplysm/core-node";
import { env } from "@simplysm/core-common";
import { consola } from "consola";
import sharp from "sharp";
import type { SdCapacitorConfig } from "../sd-config.types";
import { execa } from "execa";

/**
 * package.json type
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
 * Configuration validation error
 */
class CapacitorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapacitorConfigError";
  }
}

/**
 * Capacitor project management class
 *
 * - Initialize Capacitor project
 * - Build Android APK/AAB
 * - Run app on device
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
   * Create Capacitor instance (with configuration validation)
   */
  static async create(pkgPath: string, config: SdCapacitorConfig): Promise<Capacitor> {
    // F5: validate runtime configuration
    Capacitor._validateConfig(config);

    const npmConfig = await fsReadJson<NpmConfig>(path.resolve(pkgPath, "package.json"));
    return new Capacitor(pkgPath, config, npmConfig);
  }

  /**
   * F5: Validate configuration
   */
  private static _validateConfig(config: SdCapacitorConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new CapacitorConfigError("capacitor.appId is required.");
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(config.appId)) {
      throw new CapacitorConfigError(`capacitor.appId format is invalid: ${config.appId}`);
    }
    if (typeof config.appName !== "string" || config.appName.trim() === "") {
      throw new CapacitorConfigError("capacitor.appName is required.");
    }
    if (config.platform != null) {
      const platforms = Object.keys(config.platform);
      for (const p of platforms) {
        if (p !== "android") {
          throw new CapacitorConfigError(`unsupported platform: ${p} (currently only android is supported)`);
        }
      }
    }
  }

  /**
   * Execute command (with logging)
   */
  private async _exec(cmd: string, args: string[], cwd: string): Promise<string> {
    Capacitor._logger.debug(`executed command: ${cmd} ${args.join(" ")}`);
    const { stdout: result } = await execa(cmd, args, { cwd });
    Capacitor._logger.debug(`execution result: ${result}`);
    return result;
  }

  /**
   * F10: Acquire lock to prevent concurrent execution
   */
  private async _acquireLock(): Promise<void> {
    const lockPath = path.resolve(this._capPath, Capacitor._LOCK_FILE_NAME);
    if (await fsExists(lockPath)) {
      const lockContent = await fsRead(lockPath);
      throw new Error(
        `Another Capacitor operation is in progress (PID: ${lockContent}). ` +
          `If there's an issue, delete the ${lockPath} file.`,
      );
    }
    await fsMkdir(this._capPath);
    await fsWrite(lockPath, String(process.pid));
  }

  /**
   * F10: Release lock
   */
  private async _releaseLock(): Promise<void> {
    const lockPath = path.resolve(this._capPath, Capacitor._LOCK_FILE_NAME);
    await fsRm(lockPath);
  }

  /**
   * F4: Validate external tools
   */
  private async _validateTools(): Promise<void> {
    // Check Android SDK
    const sdkPath = await this._findAndroidSdk();
    if (sdkPath == null) {
      throw new Error(
        "Android SDK not found.\n" +
          "1. Install Android Studio or\n" +
          "2. Set ANDROID_HOME or ANDROID_SDK_ROOT environment variable.",
      );
    }

    // Check Java (only for android platform)
    if (this._platforms.includes("android")) {
      const javaPath = await this._findJava21();
      if (javaPath == null) {
        Capacitor._logger.warn(
          "Java 21 not found. Gradle may use embedded JDK or the build may fail.",
        );
      }
    }
  }

  /**
   * Initialize Capacitor project
   *
   * 1. Create package.json and install dependencies
   * 2. Create capacitor.config.ts
   * 3. Add platform (android)
   * 4. Set up icon
   * 5. Configure Android native settings
   * 6. Run cap sync or cap copy
   */
  async initialize(): Promise<void> {
    await this._acquireLock();

    try {
      // F4: Validate external tools
      await this._validateTools();

      // 1. Initialize Capacitor project
      const changed = await this._initCap();

      // 2. Create Capacitor config file
      await this._writeCapConf();

      // 3. Manage platform (F12: idempotent - skip if already exists)
      await this._addPlatforms();

      // 4. Set up icon (F6: error recovery)
      await this._setupIcon();

      // 5. Configure Android native settings
      if (this._platforms.includes("android")) {
        await this._configureAndroid();
      }

      // 6. Synchronize web assets
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
   * Build Android APK/AAB
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
          throw new Error(`unsupported platform: ${platform}`);
        }
      }
    } finally {
      await this._releaseLock();
    }
  }

  /**
   * Run app on device (connect WebView to development server)
   */
  async runOnDevice(url?: string): Promise<void> {
    // F11: Validate URL
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
            // adb kill-server failure is ignored
          }
        }
        throw err;
      }
    }
  }

  /**
   * F11: Validate URL
   */
  private _validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error(`unsupported protocol: ${parsed.protocol}`);
      }
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(`invalid URL: ${url}`);
      }
      throw err;
    }
  }

  //#region Private - Initialization

  /**
   * Basic Capacitor project initialization (package.json, npm install, cap init)
   */
  private async _initCap(): Promise<boolean> {
    const depChanged = await this._setupNpmConf();
    if (!depChanged) return false;

    // pnpm install
    const installResult = await this._exec("pnpm", ["install"], this._capPath);
    Capacitor._logger.debug(`pnpm install completed: ${installResult}`);

    // F12: cap init idempotency - execute only when capacitor.config.ts does not exist
    const configPath = path.resolve(this._capPath, "capacitor.config.ts");
    if (!(await fsExists(configPath))) {
      await this._exec(
        "npx",
        ["cap", "init", this._config.appName, this._config.appId],
        this._capPath,
      );
    }

    // Create default www/index.html
    const wwwPath = path.resolve(this._capPath, "www");
    await fsMkdir(wwwPath);
    await fsWrite(
      path.resolve(wwwPath, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );

    return true;
  }

  /**
   * Configure package.json
   */
  private async _setupNpmConf(): Promise<boolean> {
    const projNpmConfigPath = path.resolve(this._pkgPath, "../../package.json");

    // F3: Check if file exists
    if (!(await fsExists(projNpmConfigPath))) {
      throw new Error(`root package.json not found: ${projNpmConfigPath}`);
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

    // Default dependencies
    capNpmConf.dependencies = capNpmConf.dependencies ?? {};
    capNpmConf.dependencies["@capacitor/core"] = "^7.0.0";
    capNpmConf.dependencies["@capacitor/app"] = "^7.0.0";
    for (const platform of this._platforms) {
      capNpmConf.dependencies[`@capacitor/${platform}`] = "^7.0.0";
    }

    capNpmConf.devDependencies = capNpmConf.devDependencies ?? {};
    capNpmConf.devDependencies["@capacitor/cli"] = "^7.0.0";
    capNpmConf.devDependencies["@capacitor/assets"] = "^3.0.0";

    // Configure plugin packages
    const mainDeps = {
      ...this._npmConfig.dependencies,
      ...this._npmConfig.devDependencies,
      ...this._npmConfig.peerDependencies,
    };

    const usePlugins = Object.keys(this._config.plugins ?? {});

    const prevPlugins = Object.keys(capNpmConf.dependencies).filter(
      (item) =>
        !["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/app"].includes(
          item,
        ),
    );

    // Remove unused plugins
    for (const prevPlugin of prevPlugins) {
      if (!usePlugins.includes(prevPlugin)) {
        delete capNpmConf.dependencies[prevPlugin];
        Capacitor._logger.debug(`plugin removed: ${prevPlugin}`);
      }
    }

    // Add new plugins
    for (const plugin of usePlugins) {
      if (!(plugin in capNpmConf.dependencies)) {
        const version = mainDeps[plugin] ?? "*";
        capNpmConf.dependencies[plugin] = version;
        Capacitor._logger.debug(`plugin added: ${plugin}@${version}`);
      }
    }

    // Save
    await fsMkdir(this._capPath);
    await fsWriteJson(capNpmConfPath, capNpmConf, { space: 2 });

    // Check if dependencies changed
    const isChanged =
      orgCapNpmConf.volta !== capNpmConf.volta ||
      JSON.stringify(orgCapNpmConf.dependencies) !== JSON.stringify(capNpmConf.dependencies) ||
      JSON.stringify(orgCapNpmConf.devDependencies) !== JSON.stringify(capNpmConf.devDependencies);

    return isChanged;
  }

  /**
   * Create capacitor.config.ts
   */
  private async _writeCapConf(): Promise<void> {
    const confPath = path.resolve(this._capPath, "capacitor.config.ts");

    // Create plugin options
    const pluginOptions: Record<string, Record<string, unknown>> = {};
    for (const [pluginName, options] of Object.entries(this._config.plugins ?? {})) {
      if (options !== true) {
        const configKey = this._toPascalCase(pluginName.split("/").at(-1)!);
        pluginOptions[configKey] = options;
      }
    }

    const pluginsConfigStr =
      Object.keys(pluginOptions).length > 0
        ? JSON.stringify(pluginOptions, null, 2).replace(/^/gm, "  ").trim()
        : "{}";

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
   * Add platform (F12: ensure idempotency)
   */
  private async _addPlatforms(): Promise<void> {
    for (const platform of this._platforms) {
      const platformPath = path.resolve(this._capPath, platform);
      if (await fsExists(platformPath)) {
        Capacitor._logger.debug(`platform already exists: ${platform}`);
        continue;
      }

      await this._exec("npx", ["cap", "add", platform], this._capPath);
    }
  }

  /**
   * Set up icon (F6: error recovery)
   */
  private async _setupIcon(): Promise<void> {
    const assetsDirPath = path.resolve(this._capPath, "assets");

    if (this._config.icon != null) {
      const iconSource = path.resolve(this._pkgPath, this._config.icon);

      // F6: Check if source icon exists
      if (!(await fsExists(iconSource))) {
        Capacitor._logger.warn(
          `icon file not found: ${iconSource}. Using default icon.`,
        );
        return;
      }

      try {
        await fsMkdir(assetsDirPath);

        // Create icon
        const logoPath = path.resolve(assetsDirPath, "logo.png");

        const logoSize = Math.floor(1024 * 0.6);
        const padding = Math.floor((1024 - logoSize) / 2);

        // F6: Handle sharp errors
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
      } catch (err) {
        Capacitor._logger.warn(
          `icon generation failed: ${err instanceof Error ? err.message : err}. Using default icon.`,
        );
        // F6: Continue even if it fails (use default icon)
      }
    } else {
      await fsRm(assetsDirPath);
    }
  }

  //#endregion

  //#region Private - Android Configuration

  /**
   * Configure Android native settings
   */
  private async _configureAndroid(): Promise<void> {
    const androidPath = path.resolve(this._capPath, "android");

    // F3: Check if Android directory exists
    if (!(await fsExists(androidPath))) {
      throw new Error(`Android project directory not found: ${androidPath}`);
    }

    await this._configureAndroidJavaHomePath(androidPath);
    await this._configureAndroidSdkPath(androidPath);
    await this._configureAndroidManifest(androidPath);
    await this._configureAndroidBuildGradle(androidPath);
  }

  /**
   * Set up JAVA_HOME path (gradle.properties)
   */
  private async _configureAndroidJavaHomePath(androidPath: string): Promise<void> {
    const gradlePropsPath = path.resolve(androidPath, "gradle.properties");

    // F3: Check if file exists
    if (!(await fsExists(gradlePropsPath))) {
      Capacitor._logger.warn(`gradle.properties file not found: ${gradlePropsPath}`);
      return;
    }

    let content = await fsRead(gradlePropsPath);

    const java21Path = await this._findJava21();
    if (java21Path != null && !content.includes("org.gradle.java.home")) {
      // F9: Improved Windows path escaping
      const escapedPath = java21Path.replace(/\\/g, "\\\\");
      content += `\norg.gradle.java.home=${escapedPath}\n`;
      await fsWrite(gradlePropsPath, content);
    }
  }

  /**
   * Auto-detect Java 21 path
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
   * Set up Android SDK path (local.properties)
   */
  private async _configureAndroidSdkPath(androidPath: string): Promise<void> {
    const localPropsPath = path.resolve(androidPath, "local.properties");

    const sdkPath = await this._findAndroidSdk();
    if (sdkPath != null) {
      // F9: Always use forward slash (Gradle compatible)
      await fsWrite(localPropsPath, `sdk.dir=${sdkPath.replace(/\\/g, "/")}\n`);
    } else {
      throw new Error(
        "Android SDK not found.\n" +
          "1. Install Android Studio or\n" +
          "2. Set ANDROID_HOME or ANDROID_SDK_ROOT environment variable.",
      );
    }
  }

  /**
   * Search for Android SDK path
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
   * Modify AndroidManifest.xml (F3: add error handling)
   */
  private async _configureAndroidManifest(androidPath: string): Promise<void> {
    const manifestPath = path.resolve(androidPath, "app/src/main/AndroidManifest.xml");

    // F3: Check if file exists
    if (!(await fsExists(manifestPath))) {
      throw new Error(`AndroidManifest.xml file not found: ${manifestPath}`);
    }

    let content = await fsRead(manifestPath);

    // Configure usesCleartextTraffic
    if (!content.includes("android:usesCleartextTraffic")) {
      content = content.replace("<application", '<application android:usesCleartextTraffic="true"');
    }

    // Configure additional permissions
    const permissions = this._config.platform?.android?.permissions ?? [];
    for (const perm of permissions) {
      const permTag = `<uses-permission android:name="android.permission.${perm.name}"`;
      if (!content.includes(permTag)) {
        const maxSdkAttr =
          perm.maxSdkVersion != null ? ` android:maxSdkVersion="${perm.maxSdkVersion}"` : "";
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

    // Configure additional application settings
    const appConfig = this._config.platform?.android?.config;
    if (appConfig) {
      for (const [key, value] of Object.entries(appConfig)) {
        const attr = `android:${key}="${value}"`;
        if (!content.includes(`android:${key}=`)) {
          content = content.replace("<application", `<application ${attr}`);
        }
      }
    }

    // Configure intentFilters
    const intentFilters = this._config.platform?.android?.intentFilters ?? [];
    for (const filter of intentFilters) {
      const filterKey = filter.action ?? filter.category ?? "";
      if (filterKey && !content.includes(filterKey)) {
        const actionLine = filter.action != null ? `<action android:name="${filter.action}"/>` : "";
        const categoryLine =
          filter.category != null ? `<category android:name="${filter.category}"/>` : "";

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
   * Modify build.gradle (F3: add error handling)
   */
  private async _configureAndroidBuildGradle(androidPath: string): Promise<void> {
    const buildGradlePath = path.resolve(androidPath, "app/build.gradle");

    // F3: Check if file exists
    if (!(await fsExists(buildGradlePath))) {
      throw new Error(`build.gradle file not found: ${buildGradlePath}`);
    }

    let content = await fsRead(buildGradlePath);

    // Configure versionName and versionCode
    const version = this._npmConfig.version;
    const cleanVersion = version.replace(/-.*$/, "");
    const versionParts = cleanVersion.split(".");
    const versionCode =
      parseInt(versionParts[0] ?? "0") * 10000 +
      parseInt(versionParts[1] ?? "0") * 100 +
      parseInt(versionParts[2] ?? "0");

    content = content.replace(/versionCode \d+/, `versionCode ${versionCode}`);
    content = content.replace(/versionName "[^"]+"/, `versionName "${version}"`);

    // Configure SDK version
    if (this._config.platform?.android?.sdkVersion != null) {
      const sdkVersion = this._config.platform.android.sdkVersion;
      content = content.replace(/minSdkVersion .+/, `minSdkVersion ${sdkVersion}`);
      content = content.replace(/targetSdkVersion .+/, `targetSdkVersion ${sdkVersion}`);
    } else {
      content = content.replace(/minSdkVersion .+/, `minSdkVersion rootProject.ext.minSdkVersion`);
      content = content.replace(
        /targetSdkVersion .+/,
        `targetSdkVersion rootProject.ext.targetSdkVersion`,
      );
    }

    // Configure signing
    const keystorePath = path.resolve(this._capPath, Capacitor._ANDROID_KEYSTORE_FILE_NAME);
    const signConfig = this._config.platform?.android?.sign;
    if (signConfig) {
      const keystoreSource = path.resolve(this._pkgPath, signConfig.keystore);
      // F3: Check if keystore file exists
      if (!(await fsExists(keystoreSource))) {
        throw new Error(`keystore file not found: ${keystoreSource}`);
      }
      await fsCopy(keystoreSource, keystorePath);

      // F9: Convert relative path to forward slash
      const keystoreRelativePath = path
        .relative(path.dirname(buildGradlePath), keystorePath)
        .replace(/\\/g, "/");
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

  //#region Private - Build

  /**
   * Build Android
   */
  private async _buildAndroid(outPath: string, buildType: string): Promise<void> {
    const androidPath = path.resolve(this._capPath, "android");
    const targetOutPath = path.resolve(outPath, "android");

    const isBundle = this._config.platform?.android?.bundle;
    const gradleTask =
      buildType === "release" ? (isBundle ? "bundleRelease" : "assembleRelease") : "assembleDebug";

    // Execute Gradle build (cross-platform)
    // F9: Run via cmd.exe on Windows (because shell: false)
    if (process.platform === "win32") {
      await this._exec("cmd", ["/c", "gradlew.bat", gradleTask, "--no-daemon"], androidPath);
    } else {
      await this._exec("sh", ["./gradlew", gradleTask, "--no-daemon"], androidPath);
    }

    // Copy build output
    await this._copyAndroidBuildOutput(androidPath, targetOutPath, buildType);
  }

  /**
   * Copy Android build output
   */
  private async _copyAndroidBuildOutput(
    androidPath: string,
    targetOutPath: string,
    buildType: string,
  ): Promise<void> {
    const isBundle = this._config.platform?.android?.bundle;
    const isSigned = Boolean(this._config.platform?.android?.sign);

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

    const actualPath = (await fsExists(sourcePath))
      ? sourcePath
      : path.resolve(
          androidPath,
          "app/build/outputs",
          outputType,
          buildType,
          `app-${buildType}.${ext}`,
        );

    if (!(await fsExists(actualPath))) {
      Capacitor._logger.warn(`build output not found: ${actualPath}`);
      return;
    }

    const outputFileName = `${this._config.appName}${isSigned ? "" : "-unsigned"}-latest.${ext}`;

    await fsMkdir(targetOutPath);
    await fsCopy(actualPath, path.resolve(targetOutPath, outputFileName));

    // Save per-version
    const updatesPath = path.resolve(targetOutPath, "updates");
    await fsMkdir(updatesPath);
    await fsCopy(actualPath, path.resolve(updatesPath, `${this._npmConfig.version}.${ext}`));
  }

  //#endregion

  //#region Private - Device Execution

  /**
   * Update server.url in capacitor.config.ts
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

  //#region Private - Utilities

  /**
   * Convert string to PascalCase
   */
  private _toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^./, (c) => c.toUpperCase());
  }

  //#endregion
}
