import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

//#region Mocks

const mockFsxExists = vi.fn();
const mockFsxRead = vi.fn();
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxGlob = vi.fn();

vi.mock("@simplysm/core-node", async (importOriginal) => {
  const original = await importOriginal<typeof import("@simplysm/core-node")>();
  return {
    ...original,
    fsx: {
      exists: mockFsxExists,
      read: mockFsxRead,
      write: mockFsxWrite,
      glob: mockFsxGlob,
    },
  };
});

//#endregion

describe("findJava21", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("여러 패턴 중 첫 매치를 사용하고 마지막 정렬 결과를 반환한다", async () => {
    mockFsxGlob.mockImplementation((pattern: string) => {
      if (pattern.includes("Amazon Corretto")) {
        return ["C:/Program Files/Amazon Corretto/jdk21.0.1", "C:/Program Files/Amazon Corretto/jdk21.0.3"];
      }
      return [];
    });

    const { findJava21 } = await import("../../src/capacitor/capacitor-android.js");
    const result = await findJava21();
    expect(result).toBe("C:/Program Files/Amazon Corretto/jdk21.0.3");
  });

  it("모든 패턴에 매치가 없으면 undefined를 반환한다", async () => {
    mockFsxGlob.mockResolvedValue([]);

    const { findJava21 } = await import("../../src/capacitor/capacitor-android.js");
    const result = await findJava21();
    expect(result).toBeUndefined();
  });
});

describe("findAndroidSdk", () => {
  let savedEnv: Record<string, string | undefined>;
  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv = { ...process.env };
  });
  afterEach(() => {
    process.env = savedEnv;
  });

  it("ANDROID_SDK_ROOT로 SDK를 감지한다", async () => {
    process.env["ANDROID_SDK_ROOT"] = "D:/Android/Sdk";
    mockFsxExists.mockImplementation((p: string) => p === "D:/Android/Sdk");

    const { findAndroidSdk } = await import("../../src/capacitor/capacitor-android.js");
    const result = await findAndroidSdk();
    expect(result).toBe("D:/Android/Sdk");
  });

  it("환경변수와 후보 경로 모두 없으면 undefined를 반환한다", async () => {
    delete process.env["ANDROID_SDK_ROOT"];
    delete process.env["ANDROID_HOME"];
    mockFsxExists.mockResolvedValue(false);

    const { findAndroidSdk } = await import("../../src/capacitor/capacitor-android.js");
    const result = await findAndroidSdk();
    expect(result).toBeUndefined();
  });
});

describe("configureAndroid", () => {
  let savedEnv: Record<string, string | undefined>;
  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv = { ...process.env };
    process.env["ANDROID_HOME"] = "C:/Android/Sdk";
  });
  afterEach(() => {
    process.env = savedEnv;
  });

  it("Android 디렉토리가 없으면 에러를 던진다", async () => {
    mockFsxExists.mockResolvedValue(false);

    const { configureAndroid } = await import("../../src/capacitor/capacitor-android.js");
    await expect(
      configureAndroid("/fake/cap", { appId: "com.test.app", appName: "Test" }, { name: "test", version: "1.0.0" }),
    ).rejects.toThrow("Android 프로젝트 디렉토리를 찾을 수 없습니다");
  });

  it("모든 Android 설정을 순서대로 수행한다", async () => {
    mockFsxExists.mockResolvedValue(true);
    mockFsxGlob.mockResolvedValue(["C:/Program Files/Amazon Corretto/jdk21.0.1"]);
    mockFsxRead.mockImplementation((p: string) => {
      if (p.includes("gradle.properties")) return "org.gradle.jvmargs=-Xmx2048m";
      if (p.includes("local.properties")) return "";
      if (p.includes("AndroidManifest.xml")) {
        return '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application>\n<activity android:name=".MainActivity">\n</activity>\n</application>\n</manifest>';
      }
      if (p.includes("app/build.gradle")) {
        return `android {
    defaultConfig {
        versionCode 1
        versionName "1.0"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
    }
    buildTypes { release { } }
}`;
      }
      if (p.includes("build.gradle")) {
        return "buildscript { dependencies { classpath 'com.android.tools.build:gradle:8.2.1' } }";
      }
      if (p.includes("styles.xml")) {
        return `<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>`;
      }
      return "";
    });

    const { configureAndroid } = await import("../../src/capacitor/capacitor-android.js");
    await configureAndroid(
      "/fake/cap",
      { appId: "com.test.app", appName: "Test App", platform: { android: {} } },
      { name: "test-pkg", version: "2.1.0" },
    );

    const writeCalls = mockFsxWrite.mock.calls;

    // JAVA_HOME 설정
    expect(writeCalls.some((c) => typeof c[0] === "string" && c[0].includes("gradle.properties"))).toBe(true);

    // SDK 경로 설정
    expect(writeCalls.some((c) => typeof c[0] === "string" && c[0].includes("local.properties"))).toBe(true);

    // AndroidManifest.xml usesCleartextTraffic
    const manifestWrite = writeCalls.find(
      (c) => typeof c[0] === "string" && c[0].includes("AndroidManifest.xml"),
    );
    expect(manifestWrite).toBeDefined();
    expect(manifestWrite![1]).toContain("usesCleartextTraffic");

    // build.gradle versionCode (2.1.0 → 2001000)
    const gradleWrite = writeCalls.find(
      (c) => typeof c[0] === "string" && c[0].includes("app/build.gradle"),
    );
    expect(gradleWrite).toBeDefined();
    expect(gradleWrite![1]).toContain("versionCode 2001000");
    expect(gradleWrite![1]).toContain('versionName "2.1.0"');

    // styles.xml Theme 변경
    const stylesWrite = writeCalls.find(
      (c) => typeof c[0] === "string" && c[0].includes("styles.xml"),
    );
    expect(stylesWrite).toBeDefined();
    expect(stylesWrite![1]).toContain('parent="Theme.AppCompat.DayNight.NoActionBar"');
    expect(stylesWrite![1]).toContain('"android:windowBackground">@drawable/splash');
  });

  it("minor/patch >= 100인 버전에서 versionCode가 충돌하지 않는다", async () => {
    mockFsxExists.mockResolvedValue(true);
    mockFsxGlob.mockResolvedValue(["C:/Program Files/Amazon Corretto/jdk21.0.1"]);
    mockFsxRead.mockImplementation((p: string) => {
      if (p.includes("gradle.properties")) return "";
      if (p.includes("local.properties")) return "";
      if (p.includes("AndroidManifest.xml")) {
        return '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application>\n<activity android:name=".MainActivity">\n</activity>\n</application>\n</manifest>';
      }
      if (p.includes("app/build.gradle")) {
        return "android { defaultConfig { versionCode 1\nversionName \"1.0\"\nminSdkVersion rootProject.ext.minSdkVersion\ntargetSdkVersion rootProject.ext.targetSdkVersion } }";
      }
      if (p.includes("build.gradle")) return "";
      if (p.includes("styles.xml")) {
        return '<resources><style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen"></style></resources>';
      }
      return "";
    });

    const { configureAndroid } = await import("../../src/capacitor/capacitor-android.js");

    // "1.0.100"과 "1.1.0"은 서로 다른 versionCode를 가져야 한다
    await configureAndroid(
      "/fake/cap",
      { appId: "com.test.app", appName: "Test" },
      { name: "test", version: "1.0.100" },
    );
    const call1 = mockFsxWrite.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("app/build.gradle"),
    );
    expect(call1![1]).toContain("versionCode 1000100");

    mockFsxWrite.mockClear();

    await configureAndroid(
      "/fake/cap",
      { appId: "com.test.app", appName: "Test" },
      { name: "test", version: "1.1.0" },
    );
    const call2 = mockFsxWrite.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("app/build.gradle"),
    );
    expect(call2![1]).toContain("versionCode 1001000");
  });
});
