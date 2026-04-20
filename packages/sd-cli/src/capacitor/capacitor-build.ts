import { cpx, fsx, pathx } from "@simplysm/core-node";
import { consola, LogLevels } from "consola";
import { createLazyLogger } from "../runtime/lazy-logger";
import type { SdCapacitorSignConfig } from "../sd-config.types.js";

const _logger = createLazyLogger("sd:cli:capacitor");

/**
 * 서명 설정을 build.gradle에 추가하고 keystore 파일을 복사
 */
export async function configureSigningConfig(
  pkgPath: string,
  androidPath: string,
  sign: SdCapacitorSignConfig,
): Promise<void> {
  // keystore 파일 확인 및 복사
  const keystoreSrc = pathx.posixResolve(pkgPath, sign.keystore);
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
export async function buildAndroid(
  capPath: string,
  buildType: string,
  isBundle: boolean,
): Promise<void> {
  let gradleTask: string;
  if (buildType === "debug") {
    gradleTask = "assembleDebug";
  } else if (isBundle) {
    gradleTask = "bundleRelease";
  } else {
    gradleTask = "assembleRelease";
  }

  const androidPath = pathx.posixResolve(capPath, "android");
  const isWindows = process.platform === "win32";
  const isDebug = consola.level >= LogLevels.debug;

  if (isWindows) {
    _logger.debug(`Gradle 실행: cmd /c gradlew.bat ${gradleTask}`);
    const { stdout } = await cpx.spawn("cmd", ["/c", "gradlew.bat", gradleTask, "--no-daemon"], {
      cwd: androidPath,
      ...(isDebug ? { stdio: ["ignore", "inherit", "inherit"] } : {}),
    });
    _logger.debug(`실행 결과: ${stdout}`);
  } else {
    const gradlew = pathx.posixResolve(androidPath, "gradlew");
    _logger.debug(`Gradle 실행: ${gradlew} ${gradleTask}`);
    const { stdout } = await cpx.spawn(gradlew, [gradleTask, "--no-daemon"], {
      cwd: androidPath,
      ...(isDebug ? { stdio: ["ignore", "inherit", "inherit"] } : {}),
    });
    _logger.debug(`실행 결과: ${stdout}`);
  }
}

/**
 * 빌드 산출물을 출력 경로에 복사
 */
export async function copyBuildOutput(
  capPath: string,
  outPath: string,
  buildType: string,
  isBundle: boolean,
  appName: string,
  version: string,
): Promise<void> {
  const ext = isBundle ? "aab" : "apk";
  const outputType = isBundle ? "bundle" : "apk";
  const androidBuildPath = pathx.posixResolve(
    capPath,
    "android/app/build/outputs",
    outputType,
    buildType,
  );

  // 빌드 산출물 찾기
  _logger.debug(`빌드 산출물 탐색: ${androidBuildPath}`);
  const candidates = await fsx.glob(pathx.posixResolve(androidBuildPath, `app-*.${ext}`));
  if (candidates.length === 0) {
    throw new Error(`빌드 산출물을 찾을 수 없습니다: ${androidBuildPath}`);
  }
  const builtFile = candidates[0];
  _logger.debug(`빌드 산출물: ${builtFile}`);
  const isUnsigned = builtFile.includes("unsigned");

  // 출력 디렉토리 생성
  const androidOutPath = pathx.posixResolve(outPath, "android");
  const updatesPath = pathx.posixResolve(androidOutPath, "updates");
  await fsx.mkdir(androidOutPath);
  await fsx.mkdir(updatesPath);

  // latest 파일명 결정
  const unsignedSuffix = isUnsigned ? "-unsigned" : "";
  const latestName = `${appName}${unsignedSuffix}-latest.${ext}`;
  const versionedName = `${version}.${ext}`;

  // 복사
  await fsx.copy(builtFile, pathx.posixResolve(androidOutPath, latestName));
  await fsx.copy(builtFile, pathx.posixResolve(updatesPath, versionedName));
}
