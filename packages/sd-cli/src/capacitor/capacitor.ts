import fs from "node:fs";
import { existsSync } from "node:fs";
import path from "path";
import { symlink } from "fs/promises";
import { createRequire } from "module";
import { cpx, fsx, pathx } from "@simplysm/core-node";
import { env } from "@simplysm/core-common";
import { consola, LogLevels } from "consola";
import type { SdCapacitorConfig } from "../sd-config.types.js";

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
 * - Android 네이티브 설정 구성
 */
export class Capacitor {
  private static readonly _LOCK_FILE_NAME = ".capacitor.lock";
  private static readonly _logger = consola.withTag("sd:cli:capacitor");

  private readonly _capPath: string;
  private readonly _platforms: string[];
  private readonly _npmConfig: NpmConfig;

  private constructor(
    private readonly _pkgPath: string,
    private readonly _config: SdCapacitorConfig,
    npmConfig: NpmConfig,
    private readonly _exclude: string[],
  ) {
    this._platforms = Object.keys(this._config.platform ?? {});
    this._npmConfig = npmConfig;
    this._capPath = pathx.posixResolve(this._pkgPath, ".capacitor");
  }

  /**
   * Capacitor 인스턴스 생성 (설정 검증 포함)
   */
  static async create(
    pkgPath: string,
    config: SdCapacitorConfig,
    exclude?: string[],
  ): Promise<Capacitor> {
    Capacitor._validateConfig(config);

    const npmConfig = await fsx.readJson<NpmConfig>(pathx.posixResolve(pkgPath, "package.json"));
    return new Capacitor(pkgPath, config, npmConfig, exclude ?? []);
  }

  /**
   * 설정 검증
   */
  private static _validateConfig(config: SdCapacitorConfig): void {
    if (typeof config.appId !== "string" || config.appId.trim() === "") {
      throw new CapacitorConfigError("capacitor.appId가 필요합니다.");
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(config.appId)) {
      throw new CapacitorConfigError(`capacitor.appId 형식이 올바르지 않습니다: ${config.appId}`);
    }
    if (typeof config.appName !== "string" || config.appName.trim() === "") {
      throw new CapacitorConfigError("capacitor.appName이 필요합니다.");
    }
    if (!/^[\p{L}\p{N} \-]+$/u.test(config.appName)) {
      throw new CapacitorConfigError(
        `capacitor.appName에 허용되지 않는 문자가 포함되어 있습니다: ${config.appName}`,
      );
    }
    if (config.platform != null) {
      const platforms = Object.keys(config.platform);
      for (const p of platforms) {
        if (p !== "android") {
          throw new CapacitorConfigError(`지원하지 않는 플랫폼입니다: ${p} (현재 android만 지원)`);
        }
      }
    }
  }

  /**
   * Capacitor 프로젝트 초기화
   *
   * 1. package.json 생성 및 의존성 설치
   * 2. capacitor.config.ts 생성
   * 3. 플랫폼 추가 (android)
   * 4. Android 네이티브 설정 구성
   * 5. cap sync 또는 cap copy 실행
   */
  async initialize(): Promise<void> {
    Capacitor._logger.debug("initialize 시작");
    await this._acquireLock();

    try {
      // 외부 도구 검증
      Capacitor._logger.debug("외부 도구 검증 시작");
      await this._validateTools();
      Capacitor._logger.debug("외부 도구 검증 완료");

      // 1. Capacitor 프로젝트 초기화
      Capacitor._logger.debug("Capacitor 프로젝트 초기화 시작");
      const changed = await this._initCap();
      Capacitor._logger.debug(`Capacitor 프로젝트 초기화 완료 (changed: ${changed})`);

      // 2. Capacitor 설정 파일 생성
      Capacitor._logger.debug("Capacitor 설정 파일 생성 시작");
      await this._writeCapConf();
      Capacitor._logger.debug("Capacitor 설정 파일 생성 완료");

      // 3. 플랫폼 관리 (멱등성: 이미 존재하면 스킵)
      Capacitor._logger.debug("플랫폼 추가 시작");
      await this._addPlatforms();
      Capacitor._logger.debug("플랫폼 추가 완료");

      // 4. 아이콘 처리
      Capacitor._logger.debug("아이콘 처리 시작");
      await this._setupIcon();
      Capacitor._logger.debug("아이콘 처리 완료");

      // 5. Android 네이티브 설정 구성
      if (this._platforms.includes("android")) {
        Capacitor._logger.debug("Android 네이티브 설정 시작");
        await this._configureAndroid();
        Capacitor._logger.debug("Android 네이티브 설정 완료");
      }

      // 6. 웹 에셋 동기화
      if (changed) {
        Capacitor._logger.debug("cap sync 시작 (의존성 변경됨)");
        await this._execCap(["sync"]);
        Capacitor._logger.debug("cap sync 완료");
      } else {
        Capacitor._logger.debug("cap copy 시작");
        await this._execCap(["copy"]);
        Capacitor._logger.debug("cap copy 완료");
      }
    } finally {
      await this._releaseLock();
      Capacitor._logger.debug("initialize 완료");
    }
  }

  //#region Private - 명령어 실행

  /**
   * Capacitor CLI 명령어를 pnpm exec로 실행
   */
  private async _execCap(args: string[]): Promise<string> {
    return this._exec("pnpm", ["exec", "cap", ...args], this._capPath);
  }

  /**
   * 명령어 실행
   */
  private async _exec(command: string, args: string[], cwd: string): Promise<string> {
    Capacitor._logger.debug(`명령어 실행: ${command} ${args.join(" ")}`);
    const isDebug = consola.level >= LogLevels.debug;
    const { stdout } = await cpx.spawn(command, args, {
      cwd,
      ...(isDebug ? { stdio: ["ignore", "inherit", "inherit"] } : {}),
    });
    Capacitor._logger.debug(`실행 결과: ${stdout}`);
    return stdout;
  }

  //#endregion

  //#region Private - 동시 실행 방지

  /**
   * 동시 실행 방지 잠금 획득
   */
  private async _acquireLock(): Promise<void> {
    const lockPath = pathx.posixResolve(this._capPath, Capacitor._LOCK_FILE_NAME);
    await fsx.mkdir(this._capPath);
    try {
      await fs.promises.writeFile(lockPath, String(process.pid), { flag: "wx" });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "EEXIST"
      ) {
        const lockContent = await fsx.read(lockPath);
        throw new Error(
          `다른 Capacitor 작업이 진행 중입니다 (PID: ${lockContent}). ` +
            `문제가 있다면 ${lockPath} 파일을 삭제하세요.`,
        );
      }
      throw err;
    }
  }

  /**
   * 동시 실행 방지 잠금 해제
   */
  private async _releaseLock(): Promise<void> {
    const lockPath = pathx.posixResolve(this._capPath, Capacitor._LOCK_FILE_NAME);
    await fsx.rm(lockPath);
  }

  //#endregion

  //#region Private - 외부 도구 검증

  /**
   * 외부 도구 검증 (Java 21, Android SDK)
   */
  private async _validateTools(): Promise<void> {
    // Android SDK 확인
    const sdkPath = await this._findAndroidSdk();
    if (sdkPath == null) {
      throw new Error(
        "Android SDK를 찾을 수 없습니다.\n" +
          "1. Android Studio를 설치하거나\n" +
          "2. ANDROID_HOME 또는 ANDROID_SDK_ROOT 환경 변수를 설정하세요.",
      );
    }
    Capacitor._logger.debug(`Android SDK 경로: ${sdkPath}`);

    // Java 확인 (android 플랫폼인 경우에만)
    if (this._platforms.includes("android")) {
      const javaPath = await this._findJava21();
      if (javaPath == null) {
        Capacitor._logger.warn(
          "Java 21을 찾을 수 없습니다. Gradle이 내장 JDK를 사용하거나 빌드가 실패할 수 있습니다.",
        );
      } else {
        Capacitor._logger.debug(`Java 21 경로: ${javaPath}`);
      }
    }
  }

  //#endregion

  //#region Private - 초기화

  /**
   * Capacitor 프로젝트 기본 초기화 (package.json, npm install, cap init)
   */
  private async _initCap(): Promise<boolean> {
    Capacitor._logger.debug("package.json 설정 시작");
    const { depChanged, workspacePlugins } = await this._setupNpmConf();
    const nodeModulesExists = await fsx.exists(pathx.posixResolve(this._capPath, "node_modules"));
    Capacitor._logger.debug(`depChanged: ${depChanged}, nodeModulesExists: ${nodeModulesExists}`);

    if (!depChanged && nodeModulesExists) {
      // 의존성 미변경이어도 workspace 플러그인 symlink는 항상 갱신
      Capacitor._logger.debug("의존성 변경 없음, workspace 플러그인 symlink만 갱신");
      await this._linkWorkspacePlugins(workspacePlugins);
      return false;
    }

    // pnpm-workspace.yaml 생성 (상위 workspace 탐색 차단)
    const workspaceYamlPath = pathx.posixResolve(this._capPath, "pnpm-workspace.yaml");
    if (!(await fsx.exists(workspaceYamlPath))) {
      await fsx.write(workspaceYamlPath, "");
    }
    const lockfilePath = pathx.posixResolve(this._capPath, "pnpm-lock.yaml");
    if (!(await fsx.exists(lockfilePath))) {
      await fsx.write(lockfilePath, "");
    }

    // pnpm install + 빌드 스크립트 승인
    Capacitor._logger.debug("pnpm install 시작");
    await this._exec("pnpm", ["install"], this._capPath);
    await this._exec("pnpm", ["approve-builds", "--all"], this._capPath);
    Capacitor._logger.debug("pnpm install 완료");

    // workspace 플러그인 symlink
    Capacitor._logger.debug("workspace 플러그인 symlink 시작");
    await this._linkWorkspacePlugins(workspacePlugins);
    Capacitor._logger.debug("workspace 플러그인 symlink 완료");

    // 멱등성: capacitor.config.ts가 없을 때만 cap init 실행
    const configPath = pathx.posixResolve(this._capPath, "capacitor.config.ts");
    if (!(await fsx.exists(configPath))) {
      Capacitor._logger.debug("cap init 시작");
      await this._execCap(["init", this._config.appId, this._config.appId]);
      Capacitor._logger.debug("cap init 완료");
    }

    return true;
  }

  /**
   * package.json 설정
   */
  private async _setupNpmConf(): Promise<{ depChanged: boolean; workspacePlugins: string[] }> {
    const projNpmConfigPath = pathx.posixResolve(this._findWorkspaceRoot(), "package.json");

    // 루트 package.json 존재 확인
    if (!(await fsx.exists(projNpmConfigPath))) {
      throw new Error(`루트 package.json을 찾을 수 없습니다: ${projNpmConfigPath}`);
    }

    const projNpmConfig = await fsx.readJson<NpmConfig>(projNpmConfigPath);

    const capNpmConfPath = pathx.posixResolve(this._capPath, "package.json");
    const orgCapNpmConf: NpmConfig = (await fsx.exists(capNpmConfPath))
      ? await fsx.readJson<NpmConfig>(capNpmConfPath)
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
      (item) =>
        !["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/app"].includes(
          item,
        ),
    );

    // 사용하지 않는 플러그인 제거
    for (const prevPlugin of prevPlugins) {
      if (!usePlugins.includes(prevPlugin)) {
        delete capNpmConf.dependencies[prevPlugin];
        Capacitor._logger.debug(`플러그인 제거: ${prevPlugin}`);
      }
    }

    // 새 플러그인 추가 (workspace:* 플러그인은 분리)
    const workspacePlugins: string[] = [];
    for (const plugin of usePlugins) {
      const version = mainDeps[plugin] ?? "*";
      if (typeof version === "string" && version.startsWith("workspace:")) {
        // workspace 플러그인은 package.json에 추가하지 않고 symlink로 처리
        workspacePlugins.push(plugin);
        // 이전에 추가되어 있었으면 제거
        delete capNpmConf.dependencies[plugin];
        Capacitor._logger.debug(`workspace 플러그인 (symlink 예정): ${plugin}`);
      } else if (!(plugin in capNpmConf.dependencies)) {
        capNpmConf.dependencies[plugin] = version;
        Capacitor._logger.debug(`플러그인 추가: ${plugin}@${version}`);
      }
    }

    // exclude 패키지 추가
    for (const excludePkg of this._exclude) {
      if (!(excludePkg in capNpmConf.dependencies)) {
        const version = mainDeps[excludePkg] ?? "*";
        capNpmConf.dependencies[excludePkg] = version;
        Capacitor._logger.debug(`exclude 패키지 추가: ${excludePkg}@${version}`);
      }
    }

    // 저장
    await fsx.mkdir(this._capPath);
    await fsx.writeJson(capNpmConfPath, capNpmConf, { space: 2 });

    // 의존성 변경 여부 확인
    const isChanged =
      orgCapNpmConf.volta !== capNpmConf.volta ||
      JSON.stringify(orgCapNpmConf.dependencies) !== JSON.stringify(capNpmConf.dependencies) ||
      JSON.stringify(orgCapNpmConf.devDependencies) !== JSON.stringify(capNpmConf.devDependencies);

    return { depChanged: isChanged, workspacePlugins };
  }

  /**
   * capacitor.config.ts 생성
   */
  private async _writeCapConf(): Promise<void> {
    const confPath = pathx.posixResolve(this._capPath, "capacitor.config.ts");

    // 플러그인 옵션 생성
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

    await fsx.write(confPath, configContent);
  }

  /**
   * 플랫폼 추가 (멱등성: 이미 존재하면 스킵)
   */
  private async _addPlatforms(): Promise<void> {
    for (const platform of this._platforms) {
      const platformPath = pathx.posixResolve(this._capPath, platform);
      if (await fsx.exists(platformPath)) {
        Capacitor._logger.debug(`플랫폼이 이미 존재합니다: ${platform}`);
        continue;
      }

      await this._execCap(["add", platform]);
    }
  }

  /**
   * 앱 아이콘 처리 (소스 이미지 → 멀티 해상도 아이콘 + 스플래시)
   */
  private async _setupIcon(): Promise<void> {
    if (this._config.icon == null) return;

    const iconPath = pathx.posixResolve(this._pkgPath, this._config.icon);

    if (!(await fsx.exists(iconPath))) {
      Capacitor._logger.warn(`아이콘 파일을 찾을 수 없습니다: ${iconPath}`);
      return;
    }

    try {
      const sharp = (await import("sharp")).default;

      // 소스 이미지를 리사이즈 (60% of 1024 = ~614px)
      const canvasSize = 1024;
      const contentSize = Math.round(canvasSize * 0.6);

      const resizedBuffer = await sharp(iconPath)
        .resize(contentSize, contentSize, { fit: "inside" })
        .png()
        .toBuffer();

      // 1024x1024 투명 캔버스에 합성
      const assetsDir = pathx.posixResolve(this._capPath, "assets");
      await fsx.mkdir(assetsDir);
      const logoPath = pathx.posixResolve(assetsDir, "logo.png");

      await sharp({
        create: {
          width: canvasSize,
          height: canvasSize,
          channels: 4 as const,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: resizedBuffer, gravity: "center" }])
        .png()
        .toFile(logoPath);

      // capacitor-assets로 모든 해상도 아이콘/스플래시 생성
      await this._exec(
        "pnpm",
        [
          "exec",
          "capacitor-assets",
          "generate",
          "--iconBackgroundColor",
          "transparent",
          "--splashBackgroundColor",
          "transparent",
          "--logoSplashScale",
          "0.6",
        ],
        this._capPath,
      );
    } catch (err) {
      Capacitor._logger.warn(
        `아이콘 생성에 실패했습니다: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  //#endregion

  //#region Private - Android 설정

  /**
   * Android 네이티브 설정 구성
   */
  private async _configureAndroid(): Promise<void> {
    const androidPath = pathx.posixResolve(this._capPath, "android");

    // Android 디렉토리 존재 확인
    if (!(await fsx.exists(androidPath))) {
      throw new Error(`Android 프로젝트 디렉토리를 찾을 수 없습니다: ${androidPath}`);
    }

    Capacitor._logger.debug("JAVA_HOME 설정 시작");
    await this._configureAndroidJavaHomePath(androidPath);
    Capacitor._logger.debug("JAVA_HOME 설정 완료");

    Capacitor._logger.debug("Android SDK 경로 설정 시작");
    await this._configureAndroidSdkPath(androidPath);
    Capacitor._logger.debug("Android SDK 경로 설정 완료");

    Capacitor._logger.debug("AndroidManifest.xml 설정 시작");
    await this._configureAndroidManifest(androidPath);
    Capacitor._logger.debug("AndroidManifest.xml 설정 완료");

    Capacitor._logger.debug("루트 build.gradle Kotlin 플러그인 설정 시작");
    await this._configureAndroidRootBuildGradle(androidPath);
    Capacitor._logger.debug("루트 build.gradle Kotlin 플러그인 설정 완료");

    Capacitor._logger.debug("build.gradle 설정 시작");
    await this._configureAndroidBuildGradle(androidPath);
    Capacitor._logger.debug("build.gradle 설정 완료");

    Capacitor._logger.debug("styles.xml 설정 시작");
    await this._configureAndroidStyles(androidPath);
    Capacitor._logger.debug("styles.xml 설정 완료");
  }

  /**
   * JAVA_HOME 경로 설정 (gradle.properties)
   */
  private async _configureAndroidJavaHomePath(androidPath: string): Promise<void> {
    const gradlePropsPath = pathx.posixResolve(androidPath, "gradle.properties");

    if (!(await fsx.exists(gradlePropsPath))) {
      Capacitor._logger.warn(`gradle.properties 파일을 찾을 수 없습니다: ${gradlePropsPath}`);
      return;
    }

    let content = await fsx.read(gradlePropsPath);

    const java21Path = await this._findJava21();
    if (java21Path != null && !content.includes("org.gradle.java.home")) {
      // Windows 경로 이스케이프
      const escapedPath = java21Path.replace(/\\/g, "\\\\");
      content += `\norg.gradle.java.home=${escapedPath}\n`;
      await fsx.write(gradlePropsPath, content);
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
      const matches = await fsx.glob(pattern);
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
    const localPropsPath = pathx.posixResolve(androidPath, "local.properties");

    const sdkPath = await this._findAndroidSdk();
    if (sdkPath != null) {
      // Gradle 호환: 항상 forward slash 사용
      await fsx.write(localPropsPath, `sdk.dir=${pathx.posix(sdkPath)}\n`);
    } else {
      throw new Error(
        "Android SDK를 찾을 수 없습니다.\n" +
          "1. Android Studio를 설치하거나\n" +
          "2. ANDROID_HOME 또는 ANDROID_SDK_ROOT 환경 변수를 설정하세요.",
      );
    }
  }

  /**
   * Android SDK 경로 탐색
   */
  private async _findAndroidSdk(): Promise<string | undefined> {
    const androidHome =
      (env["ANDROID_HOME"] as string | undefined) ??
      (env["ANDROID_SDK_ROOT"] as string | undefined);
    if (androidHome != null && (await fsx.exists(androidHome))) {
      return androidHome;
    }

    const candidates = [
      pathx.posixResolve((env["LOCALAPPDATA"] as string | undefined) ?? "", "Android/Sdk"),
      pathx.posixResolve((env["HOME"] as string | undefined) ?? "", "Android/Sdk"),
      "C:/Program Files/Android/Sdk",
      "C:/Android/Sdk",
    ];

    for (const candidate of candidates) {
      if (await fsx.exists(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * AndroidManifest.xml 설정
   *
   * 주의: Capacitor가 생성하는 초기 XML 포맷에 의존하는 정규식 기반 수정.
   * XML 구조가 변경되면 정규식이 실패할 수 있음.
   */
  private async _configureAndroidManifest(androidPath: string): Promise<void> {
    const manifestPath = pathx.posixResolve(androidPath, "app/src/main/AndroidManifest.xml");

    if (!(await fsx.exists(manifestPath))) {
      throw new Error(`AndroidManifest.xml 파일을 찾을 수 없습니다: ${manifestPath}`);
    }

    let content = await fsx.read(manifestPath);

    // usesCleartextTraffic 설정
    if (!content.includes("android:usesCleartextTraffic")) {
      content = content.replace("<application", '<application android:usesCleartextTraffic="true"');
    }

    // 추가 권한 설정
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

    // 추가 application 속성 설정
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

    await fsx.write(manifestPath, content);
  }

  /**
   * 루트 build.gradle에 Kotlin Gradle 플러그인 classpath 추가
   */
  private async _configureAndroidRootBuildGradle(androidPath: string): Promise<void> {
    const rootBuildGradlePath = pathx.posixResolve(androidPath, "build.gradle");

    if (!(await fsx.exists(rootBuildGradlePath))) {
      Capacitor._logger.warn(`루트 build.gradle 파일을 찾을 수 없습니다: ${rootBuildGradlePath}`);
      return;
    }

    let content = await fsx.read(rootBuildGradlePath);

    if (!content.includes("kotlin-gradle-plugin")) {
      content = content.replace(
        /classpath 'com\.android\.tools\.build:gradle:[^']+'/,
        `$&\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20'`,
      );
      await fsx.write(rootBuildGradlePath, content);
    }
  }

  /**
   * build.gradle 수정 (서명 설정 제외)
   */
  private async _configureAndroidBuildGradle(androidPath: string): Promise<void> {
    const buildGradlePath = pathx.posixResolve(androidPath, "app/build.gradle");

    if (!(await fsx.exists(buildGradlePath))) {
      throw new Error(`build.gradle 파일을 찾을 수 없습니다: ${buildGradlePath}`);
    }

    let content = await fsx.read(buildGradlePath);

    // versionName, versionCode 설정
    const version = this._npmConfig.version;
    const cleanVersion = version.replace(/-.*$/, "");
    const versionParts = cleanVersion.split(".");
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
      content = content.replace(
        /targetSdkVersion .+/,
        `targetSdkVersion rootProject.ext.targetSdkVersion`,
      );
    }

    await fsx.write(buildGradlePath, content);
  }

  /**
   * styles.xml의 스플래시 테마 수정
   *
   * 1. Theme.SplashScreen parent → Theme.AppCompat.DayNight.NoActionBar
   *    Theme.SplashScreen은 android:windowBackground에 compat_splash_screen을 설정하여
   *    android:background(@drawable/splash)와 이중 표시를 발생시킨다.
   *    installSplashScreen()을 호출하지 않으므로 Theme.SplashScreen 기능이 불필요하다.
   *
   * 2. android:background → android:windowBackground
   *    android:background는 View 레벨 속성으로 AppCompat 뷰 계층의 여러 View에 상속되어
   *    동일한 splash 로고가 다중 레이어에 중복 렌더링된다.
   *    android:windowBackground는 Window의 DecorView에만 적용되어 단일 렌더링을 보장한다.
   */
  private async _configureAndroidStyles(androidPath: string): Promise<void> {
    const stylesPath = pathx.posixResolve(androidPath, "app/src/main/res/values/styles.xml");

    if (!(await fsx.exists(stylesPath))) {
      Capacitor._logger.warn(`styles.xml 파일을 찾을 수 없습니다: ${stylesPath}`);
      return;
    }

    let content = await fsx.read(stylesPath);
    let changed = false;

    if (content.includes('parent="Theme.SplashScreen"')) {
      content = content.replace(
        'parent="Theme.SplashScreen"',
        'parent="Theme.AppCompat.DayNight.NoActionBar"',
      );
      changed = true;
    }

    if (content.includes('"android:background">@drawable/splash')) {
      content = content.replace(
        '"android:background">@drawable/splash',
        '"android:windowBackground">@drawable/splash',
      );
      changed = true;
    }

    if (changed) {
      await fsx.write(stylesPath, content);
    }
  }

  //#endregion

  //#region Public — 기기 실행

  /**
   * 기기에서 앱을 실행한다 (개발 모드).
   *
   * 1. capacitor.config.ts에 server.url 설정 (Hot Reload용)
   * 2. cap copy — 웹 에셋 동기화
   * 3. cap run — 기기에서 앱 실행
   */
  async run(url: string): Promise<void> {
    Capacitor._logger.debug(`server.url 설정: ${url}`);
    await this._updateServerUrl(url);

    for (const platform of this._platforms) {
      Capacitor._logger.debug(`[${platform}] cap copy 시작`);
      await this._execCap(["copy", platform]);
      Capacitor._logger.debug(`[${platform}] cap copy 완료`);

      try {
        Capacitor._logger.debug(`[${platform}] cap run 시작`);
        await this._execCap(["run", platform]);
        Capacitor._logger.debug(`[${platform}] cap run 완료`);
      } catch (err) {
        if (platform === "android") {
          Capacitor._logger.debug(`[${platform}] adb kill-server 시작`);
          try {
            await this._exec("adb", ["kill-server"], this._capPath);
            Capacitor._logger.debug(`[${platform}] adb kill-server 완료`);
          } catch (adbErr) {
            const adbErrMsg = adbErr instanceof Error ? adbErr.message : String(adbErr);
            Capacitor._logger.debug(
              `[${platform}] adb kill-server 실패 (무시): ${adbErrMsg}`,
            );
          }
        }
        throw err;
      }
    }
  }

  //#endregion

  //#region Private — 기기 실행

  /**
   * capacitor.config.ts의 server.url을 업데이트한다.
   * WebView가 이 URL에서 웹 에셋을 로드하여 Hot Reload가 동작한다.
   */
  private async _updateServerUrl(url: string): Promise<void> {
    const configPath = pathx.posixResolve(this._capPath, "capacitor.config.ts");
    let content = await fsx.read(configPath);

    if (content.includes("url:")) {
      content = content.replace(/url:\s*"[^"]*"/, `url: "${url}"`);
    } else if (content.includes("server:")) {
      content = content.replace(/server:\s*\{/, `server: {\n    url: "${url}",`);
    }

    await fsx.write(configPath, content);
  }

  //#endregion

  //#region Public — 빌드

  /**
   * Capacitor 프로덕션 빌드 (APK/AAB 생성)
   *
   * 1. cap copy (웹 에셋 → 네이티브 프로젝트 동기화)
   * 2. 서명 설정 (sign 설정 있을 때)
   * 3. Gradle 빌드 (APK 또는 AAB)
   * 4. 빌드 산출물 복사
   */
  async build(outPath: string): Promise<void> {
    Capacitor._logger.debug("build 시작");

    // 1. 웹 에셋 동기화
    Capacitor._logger.debug("cap copy 시작");
    await this._execCap(["copy"]);
    Capacitor._logger.debug("cap copy 완료");

    // 2. 빌드 타입 결정
    const isDebug = this._config.debug === true;
    const isBundle = this._config.platform?.android?.bundle === true;
    const buildType = isDebug ? "debug" : "release";
    Capacitor._logger.debug(`빌드 타입: ${buildType}, bundle: ${isBundle}`);

    // 3. 서명 설정
    const signConfig = this._config.platform?.android?.sign;
    if (!isDebug && signConfig != null) {
      Capacitor._logger.debug("서명 설정 시작");
      await this._configureSigningConfig(pathx.posixResolve(this._capPath, "android"), signConfig);
      Capacitor._logger.debug("서명 설정 완료");
    } else if (!isDebug) {
      Capacitor._logger.warn("서명 설정이 없어 unsigned 빌드가 생성됩니다.");
    }

    // 4. Gradle 빌드
    Capacitor._logger.debug("Gradle 빌드 시작");
    await this._buildAndroid(buildType, isBundle);
    Capacitor._logger.debug("Gradle 빌드 완료");

    // 5. 빌드 산출물 복사
    Capacitor._logger.debug("빌드 산출물 복사 시작");
    await this._copyBuildOutput(outPath, buildType, isBundle);
    Capacitor._logger.debug("빌드 산출물 복사 완료");

    Capacitor._logger.debug("build 완료");
  }

  //#endregion

  //#region Private — 빌드

  /**
   * 서명 설정을 build.gradle에 추가하고 keystore 파일을 복사
   */
  private async _configureSigningConfig(
    androidPath: string,
    sign: import("../sd-config.types.js").SdCapacitorSignConfig,
  ): Promise<void> {
    // keystore 파일 확인 및 복사
    const keystoreSrc = pathx.posixResolve(this._pkgPath, sign.keystore);
    if (!(await fsx.exists(keystoreSrc))) {
      throw new Error(`keystore 파일을 찾을 수 없습니다: ${keystoreSrc}`);
    }

    const keystoreDest = pathx.posixResolve(androidPath, "app", "android.keystore");
    await fsx.copy(keystoreSrc, keystoreDest);

    // build.gradle에 signingConfigs 추가
    const buildGradlePath = pathx.posixResolve(androidPath, "app/build.gradle");
    let content = await fsx.read(buildGradlePath);

    // 이미 signingConfigs가 있으면 스킵
    if (content.includes("signingConfigs")) return;

    const storeType = sign.keystoreType ?? "jks";
    const escapeGroovy = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const escapedStorePassword = escapeGroovy(sign.storePassword);
    const escapedKeyPassword = escapeGroovy(sign.password);

    const signingBlock = `    signingConfigs {
        release {
            storeFile file("android.keystore")
            storePassword '${escapedStorePassword}'
            keyAlias '${sign.alias}'
            keyPassword '${escapedKeyPassword}'
            storeType "${storeType}"
        }
    }
`;

    // signingConfigs 블록을 buildTypes 앞에 삽입
    content = content.replace(/(\s*buildTypes\s*\{)/, (match) => `\n${signingBlock}${match}`);

    // buildTypes.release에 signingConfig 추가
    content = content.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
      "$1\n            signingConfig signingConfigs.release",
    );

    await fsx.write(buildGradlePath, content);
  }

  /**
   * Gradle 빌드 실행 (cross-platform)
   */
  private async _buildAndroid(buildType: string, isBundle: boolean): Promise<void> {
    let gradleTask: string;
    if (buildType === "debug") {
      gradleTask = "assembleDebug";
    } else if (isBundle) {
      gradleTask = "bundleRelease";
    } else {
      gradleTask = "assembleRelease";
    }

    const androidPath = pathx.posixResolve(this._capPath, "android");
    const isWindows = process.platform === "win32";

    if (isWindows) {
      Capacitor._logger.debug(`Gradle 실행: cmd /c gradlew.bat ${gradleTask}`);
      await this._exec("cmd", ["/c", "gradlew.bat", gradleTask, "--no-daemon"], androidPath);
    } else {
      const gradlew = pathx.posixResolve(androidPath, "gradlew");
      Capacitor._logger.debug(`Gradle 실행: ${gradlew} ${gradleTask}`);
      await this._exec(gradlew, [gradleTask, "--no-daemon"], androidPath);
    }
  }

  /**
   * 빌드 산출물을 출력 경로에 복사
   */
  private async _copyBuildOutput(
    outPath: string,
    buildType: string,
    isBundle: boolean,
  ): Promise<void> {
    const ext = isBundle ? "aab" : "apk";
    const outputType = isBundle ? "bundle" : "apk";
    const androidBuildPath = pathx.posixResolve(
      this._capPath,
      "android/app/build/outputs",
      outputType,
      buildType,
    );

    // 빌드 산출물 찾기
    Capacitor._logger.debug(`빌드 산출물 탐색: ${androidBuildPath}`);
    const candidates = await fsx.glob(pathx.posixResolve(androidBuildPath, `app-*.${ext}`));
    if (candidates.length === 0) {
      throw new Error(`빌드 산출물을 찾을 수 없습니다: ${androidBuildPath}`);
    }
    const builtFile = candidates[0];
    Capacitor._logger.debug(`빌드 산출물: ${builtFile}`);
    const isUnsigned = builtFile.includes("unsigned");

    // 출력 디렉토리 생성
    const androidOutPath = pathx.posixResolve(outPath, "android");
    const updatesPath = pathx.posixResolve(androidOutPath, "updates");
    await fsx.mkdir(androidOutPath);
    await fsx.mkdir(updatesPath);

    // latest 파일명 결정
    const unsignedSuffix = isUnsigned ? "-unsigned" : "";
    const latestName = `${this._config.appName}${unsignedSuffix}-latest.${ext}`;
    const versionedName = `${this._npmConfig.version}.${ext}`;

    // 복사
    await fsx.copy(builtFile, pathx.posixResolve(androidOutPath, latestName));
    await fsx.copy(builtFile, pathx.posixResolve(updatesPath, versionedName));
  }

  //#endregion

  //#region Private - 유틸리티

  /**
   * workspace:* 플러그인을 .capacitor/node_modules/에 symlink로 연결한다.
   * cap sync는 플러그인의 android/ 네이티브 코드만 필요하므로 JS 의존성 resolve 불필요.
   */
  private async _linkWorkspacePlugins(plugins: string[]): Promise<void> {
    if (plugins.length === 0) return;

    const require = createRequire(pathx.posixResolve(this._pkgPath, "package.json"));

    for (const plugin of plugins) {
      const pluginPkgJsonPath = require.resolve(`${plugin}/package.json`);
      const pluginDir = path.dirname(pluginPkgJsonPath);

      const linkPath = pathx.posixResolve(this._capPath, "node_modules", ...plugin.split("/"));

      // scope 디렉토리 생성 (예: @simplysm/)
      await fsx.mkdir(path.dirname(linkPath));

      // 기존 symlink가 있으면 삭제
      if (await fsx.exists(linkPath)) {
        await fsx.rm(linkPath);
      }

      await symlink(pluginDir, linkPath, "junction");
      Capacitor._logger.debug(`workspace 플러그인 symlink: ${plugin} → ${pluginDir}`);
    }
  }

  /**
   * pnpm-workspace.yaml이 있는 워크스페이스 루트 디렉토리를 찾는다.
   */
  private _findWorkspaceRoot(): string {
    let dir = this._pkgPath;
    while (true) {
      const parent = path.dirname(dir);
      if (parent === dir) {
        throw new Error(`워크스페이스 루트를 찾을 수 없습니다: ${this._pkgPath}`);
      }
      if (existsSync(pathx.posixResolve(parent, "pnpm-workspace.yaml"))) {
        return parent;
      }
      dir = parent;
    }
  }

  /**
   * 문자열을 PascalCase로 변환
   */
  private _toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
      .replace(/^./, (c) => c.toUpperCase());
  }

  //#endregion
}
