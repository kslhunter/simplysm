import { fsx, pathx } from "@simplysm/core-node";
import { env, xml } from "@simplysm/core-common";
import { createLazyLogger } from "../runtime/lazy-logger";
import type { NpmConfig, SdCapacitorAndroidConfig, SdCapacitorConfig } from "../sd-config.types.js";

const _logger = createLazyLogger("sd:cli:capacitor");

/**
 * Android 네이티브 설정 구성
 *
 * JAVA_HOME, Android SDK 경로, AndroidManifest.xml, build.gradle, styles.xml을 설정한다.
 */
export async function configureAndroid(
  capPath: string,
  config: SdCapacitorConfig,
  npmConfig: NpmConfig,
): Promise<void> {
  const androidPath = pathx.posixResolve(capPath, "android");

  // Android 디렉토리 존재 확인
  if (!(await fsx.exists(androidPath))) {
    throw new Error(`Android 프로젝트 디렉토리를 찾을 수 없습니다: ${androidPath}`);
  }

  _logger.debug("JAVA_HOME 설정 시작");
  await _configureJavaHomePath(androidPath);
  _logger.debug("JAVA_HOME 설정 완료");

  _logger.debug("Android SDK 경로 설정 시작");
  await _configureSdkPath(androidPath);
  _logger.debug("Android SDK 경로 설정 완료");

  _logger.debug("AndroidManifest.xml 설정 시작");
  await _configureManifest(androidPath, config.platform?.android);
  _logger.debug("AndroidManifest.xml 설정 완료");

  _logger.debug("루트 build.gradle Kotlin 플러그인 설정 시작");
  await _configureRootBuildGradle(androidPath);
  _logger.debug("루트 build.gradle Kotlin 플러그인 설정 완료");

  _logger.debug("build.gradle 설정 시작");
  await _configureBuildGradle(androidPath, npmConfig.version, config.platform?.android?.sdkVersion);
  _logger.debug("build.gradle 설정 완료");

  _logger.debug("styles.xml 설정 시작");
  await _configureStyles(androidPath);
  _logger.debug("styles.xml 설정 완료");

  _logger.debug("MainActivity.java textZoom 설정 시작");
  await _configureMainActivity(androidPath, config.appId);
  _logger.debug("MainActivity.java textZoom 설정 완료");
}

/**
 * Java 21 경로 자동 탐색
 *
 * JAVA_HOME이 Java 21이면 우선 사용한다. JDK 표준 `release` 파일의 `JAVA_VERSION`으로 판별.
 */
export async function findJava21(): Promise<string | undefined> {
  const javaHome = env("JAVA_HOME");
  if (javaHome != null && (await _isJava21(javaHome))) {
    return pathx.posix(javaHome);
  }

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

async function _isJava21(javaHome: string): Promise<boolean> {
  const releasePath = pathx.posixResolve(javaHome, "release");
  if (!(await fsx.exists(releasePath))) return false;
  const content = await fsx.read(releasePath);
  return /JAVA_VERSION="21(\.|")/m.test(content);
}

/**
 * Android SDK 경로 탐색
 */
export async function findAndroidSdk(): Promise<string | undefined> {
  const androidHome =
    env("ANDROID_HOME") ??
    env("ANDROID_SDK_ROOT");
  if (androidHome != null && (await fsx.exists(androidHome))) {
    return androidHome;
  }

  const candidates = [
    pathx.posixResolve(env("LOCALAPPDATA") ?? "", "Android/Sdk"),
    pathx.posixResolve(env("HOME") ?? "", "Android/Sdk"),
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
 * JAVA_HOME 경로 설정 (gradle.properties)
 */
async function _configureJavaHomePath(androidPath: string): Promise<void> {
  const gradlePropsPath = pathx.posixResolve(androidPath, "gradle.properties");

  if (!(await fsx.exists(gradlePropsPath))) {
    _logger.warn(`gradle.properties 파일을 찾을 수 없습니다: ${gradlePropsPath}`);
    return;
  }

  let content = await fsx.read(gradlePropsPath);

  const java21Path = await findJava21();
  if (java21Path != null && !content.includes("org.gradle.java.home")) {
    // Windows 경로 이스케이프
    const escapedPath = java21Path.replace(/\\/g, "\\\\");
    content += `\norg.gradle.java.home=${escapedPath}\n`;
    await fsx.write(gradlePropsPath, content);
  }
}

/**
 * Android SDK 경로 설정 (local.properties)
 */
async function _configureSdkPath(androidPath: string): Promise<void> {
  const localPropsPath = pathx.posixResolve(androidPath, "local.properties");

  const sdkPath = await findAndroidSdk();
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
 * AndroidManifest.xml 설정 (XML 파서 기반)
 */
async function _configureManifest(
  androidPath: string,
  androidConfig?: SdCapacitorAndroidConfig,
): Promise<void> {
  const manifestPath = pathx.posixResolve(androidPath, "app/src/main/AndroidManifest.xml");

  if (!(await fsx.exists(manifestPath))) {
    throw new Error(`AndroidManifest.xml 파일을 찾을 수 없습니다: ${manifestPath}`);
  }

  const content = await fsx.read(manifestPath);

  // XML 선언 보존 (xml.parse는 선언을 무시하므로 수동 보존)
  const declMatch = content.match(/^(<\?xml[^?]*\?>\s*)/);
  const xmlDecl = declMatch?.[1] ?? "";
  const xmlBody = declMatch != null ? content.slice(declMatch[0].length) : content;

  type Attrs = Record<string, string>;
  type XmlNode = { $?: Attrs; [key: string]: unknown };

  const parsed = xml.parse(xmlBody) as { manifest?: XmlNode };
  const manifest = parsed.manifest;
  if (manifest == null) {
    _logger.warn("AndroidManifest.xml에 manifest 요소가 없습니다");
    return;
  }

  const apps = manifest["application"] as Array<XmlNode | string> | undefined;
  if (apps == null || apps.length === 0) {
    _logger.warn("AndroidManifest.xml에 application 요소가 없습니다");
    return;
  }
  // 자식 요소 없는 <application></application>은 텍스트 노드로 파싱될 수 있음
  if (typeof apps[0] !== "object") {
    apps[0] = {};
  }
  const app = apps[0];
  app.$ ??= {};

  // usesCleartextTraffic 설정
  app.$["android:usesCleartextTraffic"] ??= "true";

  // 추가 권한 설정
  const permissions = androidConfig?.permissions ?? [];
  if (permissions.length > 0) {
    if (manifest["uses-permission"] == null) {
      manifest["uses-permission"] = [];
    }
    const permArray = manifest["uses-permission"] as XmlNode[];
    for (const perm of permissions) {
      const permName = `android.permission.${perm.name}`;
      const exists = permArray.some((p) => p.$?.["android:name"] === permName);
      if (!exists) {
        const attrs: Attrs = { "android:name": permName };
        if (perm.maxSdkVersion != null) {
          attrs["android:maxSdkVersion"] = String(perm.maxSdkVersion);
        }
        if (perm.ignore != null) {
          attrs["tools:ignore"] = perm.ignore;
          manifest.$ ??= {};
          manifest.$["xmlns:tools"] ??= "http://schemas.android.com/tools";
        }
        permArray.push({ $: attrs });
      }
    }
  }

  // 추가 application 속성 설정
  const appConfig = androidConfig?.config;
  if (appConfig != null) {
    for (const [key, value] of Object.entries(appConfig)) {
      const attrName = `android:${key}`;
      app.$[attrName] ??= String(value);
    }
  }

  // intentFilters 설정
  const intentFilters = androidConfig?.intentFilters ?? [];
  if (intentFilters.length > 0) {
    const activities = app["activity"] as XmlNode[] | undefined;
    const mainActivity = activities?.find((a) => a.$?.["android:name"] === ".MainActivity");
    if (mainActivity != null) {
      if (mainActivity["intent-filter"] == null) {
        mainActivity["intent-filter"] = [];
      }
      const filterArray = mainActivity["intent-filter"] as XmlNode[];
      for (const filter of intentFilters) {
        const filterKey = filter.action ?? filter.category ?? "";
        if (filterKey === "") continue;
        const exists = filterArray.some((f) => {
          const actions = f["action"] as XmlNode[] | undefined;
          const categories = f["category"] as XmlNode[] | undefined;
          return (
            (filter.action != null &&
              actions?.some((a) => a.$?.["android:name"] === filter.action)) ||
            (filter.category != null &&
              categories?.some((c) => c.$?.["android:name"] === filter.category))
          );
        });
        if (!exists) {
          const newFilter: XmlNode = {};
          if (filter.action != null) {
            newFilter["action"] = [{ $: { "android:name": filter.action } }];
          }
          if (filter.category != null) {
            newFilter["category"] = [{ $: { "android:name": filter.category } }];
          }
          filterArray.push(newFilter);
        }
      }
    }
  }

  const result = xml.stringify(parsed, { format: true, indentBy: "    ", suppressEmptyNode: true });
  await fsx.write(manifestPath, xmlDecl + result);
}

/**
 * 루트 build.gradle에 Kotlin Gradle 플러그인 classpath 추가
 */
async function _configureRootBuildGradle(androidPath: string): Promise<void> {
  const rootBuildGradlePath = pathx.posixResolve(androidPath, "build.gradle");

  if (!(await fsx.exists(rootBuildGradlePath))) {
    _logger.warn(`루트 build.gradle 파일을 찾을 수 없습니다: ${rootBuildGradlePath}`);
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
async function _configureBuildGradle(
  androidPath: string,
  version: string,
  sdkVersion?: number,
): Promise<void> {
  const buildGradlePath = pathx.posixResolve(androidPath, "app/build.gradle");

  if (!(await fsx.exists(buildGradlePath))) {
    throw new Error(`build.gradle 파일을 찾을 수 없습니다: ${buildGradlePath}`);
  }

  let content = await fsx.read(buildGradlePath);

  // versionName, versionCode 설정
  const cleanVersion = version.replace(/-.*$/, "");
  const versionParts = cleanVersion.split(".");
  const versionCode =
    parseInt(versionParts[0] ?? "0") * 1000000 +
    parseInt(versionParts[1] ?? "0") * 1000 +
    parseInt(versionParts[2] ?? "0");

  content = content.replace(/versionCode \d+/, `versionCode ${versionCode}`);
  content = content.replace(/versionName "[^"]+"/, `versionName "${version}"`);

  // SDK 버전 설정
  if (sdkVersion != null) {
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
 * MainActivity.java에 textZoom 100% 고정 설정
 *
 * 시스템 글꼴 크기 설정과 무관하게 WebView 텍스트 줌을 100%로 고정한다.
 * BridgeActivity.load() 오버라이드를 사용한다 (onCreate 시점에서는 bridge가 아직 null).
 */
async function _configureMainActivity(androidPath: string, appId: string): Promise<void> {
  const mainActivityPath = pathx.posixResolve(
    androidPath,
    `app/src/main/java/${appId.replace(/\./g, "/")}/MainActivity.java`,
  );

  if (!(await fsx.exists(mainActivityPath))) {
    _logger.warn(`MainActivity.java 파일을 찾을 수 없습니다: ${mainActivityPath}`);
    return;
  }

  let content = await fsx.read(mainActivityPath);

  if (content.includes("setTextZoom")) {
    return;
  }

  if (content.includes("public class MainActivity extends BridgeActivity {}")) {
    content = content.replace(
      "public class MainActivity extends BridgeActivity {}",
      [
        "public class MainActivity extends BridgeActivity {",
        "    @Override",
        "    protected void load() {",
        "        super.load();",
        "        getBridge().getWebView().getSettings().setTextZoom(100);",
        "    }",
        "}",
      ].join("\n"),
    );
    await fsx.write(mainActivityPath, content);
  }
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
async function _configureStyles(androidPath: string): Promise<void> {
  const stylesPath = pathx.posixResolve(androidPath, "app/src/main/res/values/styles.xml");

  if (!(await fsx.exists(stylesPath))) {
    _logger.warn(`styles.xml 파일을 찾을 수 없습니다: ${stylesPath}`);
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
