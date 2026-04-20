import fs from "node:fs";
import { cpx, fsx, pathx } from "@simplysm/core-node";
import { consola, LogLevels } from "consola";
import { createLazyLogger } from "../runtime/lazy-logger";
import type { NpmConfig, SdCapacitorConfig } from "../sd-config.types.js";
import { configureAndroid, findAndroidSdk, findJava21 } from "./capacitor-android.js";
import { buildAndroid, configureSigningConfig, copyBuildOutput } from "./capacitor-build.js";
import { writeCapacitorConfig, updateServerUrl } from "./capacitor-config-writer.js";
import { setupIcon } from "./capacitor-icon.js";
import { initCapNpmProject } from "./capacitor-npm-config.js";

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
  private static readonly _logger = createLazyLogger("sd:cli:capacitor");

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
    Capacitor._logger.start("initialize 중...");
    await this._acquireLock();

    try {
      // 외부 도구 검증
      Capacitor._logger.debug("외부 도구 검증 시작");
      await this._validateTools();
      Capacitor._logger.debug("외부 도구 검증 완료");

      // 1. Capacitor 프로젝트 초기화
      Capacitor._logger.debug("Capacitor 프로젝트 초기화 시작");
      const changed = await initCapNpmProject(
        this._capPath,
        this._pkgPath,
        this._config,
        this._npmConfig,
        this._platforms,
        this._exclude,
      );
      Capacitor._logger.debug(`Capacitor 프로젝트 초기화 완료 (changed: ${changed})`);

      // 2. Capacitor 설정 파일 생성
      Capacitor._logger.debug("Capacitor 설정 파일 생성 시작");
      await writeCapacitorConfig(this._capPath, this._config);
      Capacitor._logger.debug("Capacitor 설정 파일 생성 완료");

      // 3. 플랫폼 관리 (멱등성: 이미 존재하면 스킵)
      Capacitor._logger.debug("플랫폼 추가 시작");
      await this._addPlatforms();
      Capacitor._logger.debug("플랫폼 추가 완료");

      // 4. 아이콘 처리
      if (this._config.icon != null) {
        Capacitor._logger.debug("아이콘 처리 시작");
        await setupIcon(this._pkgPath, this._capPath, this._config.icon);
        Capacitor._logger.debug("아이콘 처리 완료");
      }

      // 5. Android 네이티브 설정 구성
      if (this._platforms.includes("android")) {
        Capacitor._logger.debug("Android 네이티브 설정 시작");
        await configureAndroid(this._capPath, this._config, this._npmConfig);
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
    }
    Capacitor._logger.success("initialize 완료");
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
    const sdkPath = await findAndroidSdk();
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
      const javaPath = await findJava21();
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
    Capacitor._logger.start(`run 중... (url: ${url})`);
    Capacitor._logger.debug(`server.url 설정: ${url}`);
    await updateServerUrl(this._capPath, url);

    for (const platform of this._platforms) {
      // Android + localhost URL이면 adb reverse로 포트 포워딩
      if (platform === "android") {
        const urlObj = new URL(url);
        if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
          const port = urlObj.port || (urlObj.protocol === "https:" ? "443" : "80");
          Capacitor._logger.debug(`[${platform}] adb reverse tcp:${port} 설정`);
          try {
            await this._exec("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], this._capPath);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            Capacitor._logger.warn(`adb reverse 실패 — USB 연결을 확인하세요: ${errMsg}`);
          }
        }
      }

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
    Capacitor._logger.success("run 완료");
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
    Capacitor._logger.start("build 중...");

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
      await configureSigningConfig(
        this._pkgPath,
        pathx.posixResolve(this._capPath, "android"),
        signConfig,
      );
      Capacitor._logger.debug("서명 설정 완료");
    } else if (!isDebug) {
      Capacitor._logger.warn("서명 설정이 없어 unsigned 빌드가 생성됩니다.");
    }

    // 4. Gradle 빌드
    Capacitor._logger.debug("Gradle 빌드 시작");
    await buildAndroid(this._capPath, buildType, isBundle);
    Capacitor._logger.debug("Gradle 빌드 완료");

    // 5. 빌드 산출물 복사
    Capacitor._logger.debug("빌드 산출물 복사 시작");
    await copyBuildOutput(
      this._capPath,
      outPath,
      buildType,
      isBundle,
      this._config.appName,
      this._npmConfig.version,
    );
    Capacitor._logger.debug("빌드 산출물 복사 완료");

    Capacitor._logger.success("build 완료");
  }

  //#endregion
}
