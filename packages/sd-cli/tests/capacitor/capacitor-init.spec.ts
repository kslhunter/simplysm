import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consola } from "consola";

//#region Mocks

const mockFsxExists = vi.fn();
const mockFsxRead = vi.fn();
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxReadJson = vi.fn();
const mockFsxWriteJson = vi.fn().mockResolvedValue(undefined);
const mockFsxMkdir = vi.fn().mockResolvedValue(undefined);
const mockFsxRm = vi.fn().mockResolvedValue(undefined);
const mockFsxGlob = vi.fn();
const mockFsxCopy = vi.fn().mockResolvedValue(undefined);

vi.mock("@simplysm/core-node", async (importOriginal) => {
  const original = await importOriginal<typeof import("@simplysm/core-node")>();
  return {
    ...original,
    fsx: {
      exists: mockFsxExists,
      read: mockFsxRead,
      write: mockFsxWrite,
      readJson: mockFsxReadJson,
      writeJson: mockFsxWriteJson,
      mkdir: mockFsxMkdir,
      rm: mockFsxRm,
      glob: mockFsxGlob,
      copy: mockFsxCopy,
    },
    cpx: {
      spawn: mockCpxSpawn,
      spawnSync: vi.fn().mockReturnValue({ stdout: "", stderr: "", exitCode: 0 }),
    },
  };
});

const execaCalls: { command: string; args: string[] }[] = [];
const mockCpxSpawn = vi.fn((...args: unknown[]) => {
  execaCalls.push({ command: args[0] as string, args: (args[1] as string[] | undefined) ?? [] });
  return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
});

const mockFsWriteFile = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs", () => ({
  default: { promises: { writeFile: (...args: unknown[]) => mockFsWriteFile(...args) } },
  existsSync: (p: string) => {
    if (p.includes("pnpm-workspace.yaml")) return true;
    return false;
  },
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(new Uint8Array([0])),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockLoggerWarn = vi.fn();
vi.spyOn(consola, "withTag").mockReturnValue({ debug: vi.fn(), warn: mockLoggerWarn, error: vi.fn(), info: vi.fn(), success: vi.fn() } as any);

//#endregion

//#region Helpers

const PKG_PATH = "/fake/pkg";

function setupDefaultMocks() {
  mockFsxExists.mockImplementation((p: string) => {
    if (p.includes(".capacitor.lock")) return false;
    return true;
  });

  mockFsxReadJson.mockImplementation((p: string) => {
    const normalized = p.replace(/\\/g, "/");
    if (normalized.includes(".capacitor/package.json")) {
      return {
        name: "com.test.app",
        version: "1.0.0",
        dependencies: {
          "@capacitor/core": "^7.0.0",
          "@capacitor/app": "^7.0.0",
          "@capacitor/android": "^7.0.0",
        },
        devDependencies: {
          "@capacitor/cli": "^7.0.0",
          "@capacitor/assets": "^3.0.0",
        },
      };
    }
    if (normalized.endsWith("package.json")) {
      return { name: "test-pkg", version: "1.0.0" };
    }
    return {};
  });

  mockFsxRead.mockImplementation((p: string) => {
    if (p.includes("AndroidManifest.xml")) {
      return '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application>\n<activity android:name=".MainActivity">\n</activity>\n</application>\n</manifest>';
    }
    if (p.includes("build.gradle")) {
      return `android {
    defaultConfig {
        versionCode 1
        versionName "1.0"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
    }
    buildTypes {
        release {
        }
    }
}`;
    }
    if (p.includes("gradle.properties")) {
      return "org.gradle.jvmargs=-Xmx2048m";
    }
    if (p.includes("styles.xml")) {
      return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>`;
    }
    return "";
  });

  mockFsxGlob.mockResolvedValue(["C:/Program Files/Amazon Corretto/jdk21.0.1"]);

  process.env["ANDROID_HOME"] = "C:/Android/Sdk";

  execaCalls.length = 0;
  mockFsWriteFile.mockReset();
  mockFsWriteFile.mockResolvedValue(undefined);
}

//#endregion

let savedEnv: Record<string, string | undefined>;
beforeEach(() => {
  savedEnv = { ...process.env };
});
afterEach(() => {
  process.env = savedEnv;
});

describe("Capacitor 설정 검증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("유효한 appId를 허용한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const instance = await Capacitor.create(PKG_PATH, {
      appId: "com.example.myapp",
      appName: "Test App",
    });
    expect(instance).toBeDefined();
  });

  it("잘못된 appId (숫자 시작)를 거부한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    await expect(
      Capacitor.create(PKG_PATH, { appId: "123.app", appName: "Test" }),
    ).rejects.toThrow("appId");
  });

  it("잘못된 appId (단일 세그먼트)를 거부한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    await expect(
      Capacitor.create(PKG_PATH, { appId: "myapp", appName: "Test" }),
    ).rejects.toThrow("appId");
  });

  it("잘못된 appName (특수문자)을 거부한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    await expect(
      Capacitor.create(PKG_PATH, { appId: "com.test.app", appName: "Test@App!" }),
    ).rejects.toThrow("appName");
  });

  it("한글 appName을 허용한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const instance = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "내 앱",
    });
    expect(instance).toBeDefined();
  });
});

describe("Capacitor 초기화", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("최초 초기화: pnpm install, cap init, cap add android를 실행한다", async () => {
    let androidAdded = false;
    mockFsxExists.mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor.lock")) return false;
      if (n.includes("node_modules")) return false;
      if (n.includes("capacitor.config.ts")) return false;
      // _addPlatforms에서 cap add 후 _configureAndroid에서 확인할 때는 true
      if (n.endsWith(".capacitor/android")) {
        if (!androidAdded) { androidAdded = true; return false; }
        return true;
      }
      return true;
    });

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });
    await cap.initialize();

    expect(execaCalls.some((c) => c.command === "pnpm" && c.args.includes("install"))).toBe(true);
    expect(
      execaCalls.some((c) => c.command === "pnpm" && c.args.includes("cap") && c.args.includes("init")),
    ).toBe(true);
    expect(
      execaCalls.some(
        (c) => c.command === "pnpm" && c.args.includes("cap") && c.args.includes("add"),
      ),
    ).toBe(true);
  });

  it("재초기화: 설정 미변경 시 pnpm install을 건너뛴다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });
    await cap.initialize();

    expect(execaCalls.some((c) => c.command === "pnpm" && c.args.includes("install"))).toBe(false);
  });

  it("플러그인 추가: package.json에 플러그인을 추가하고 pnpm install을 실행한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    // 클라이언트 패키지의 deps에 플러그인 포함
    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: {
            "@capacitor/core": "^7.0.0",
            "@capacitor/app": "^7.0.0",
            "@capacitor/android": "^7.0.0",
          },
          devDependencies: {
            "@capacitor/cli": "^7.0.0",
            "@capacitor/assets": "^3.0.0",
          },
        };
      }
      return {
        name: "test-pkg",
        version: "1.0.0",
        dependencies: { "@capacitor/camera": "^7.0.0" },
      };
    });

    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: { "@capacitor/camera": true },
      platform: { android: {} },
    });
    await cap.initialize();

    // writeJson에 plugin이 포함되었는지 확인
    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) =>
        typeof call[0] === "string" && call[0].includes("package.json"),
    );
    expect(capPkgWrite).toBeDefined();
    const writtenConfig = capPkgWrite![1] as Record<string, unknown>;
    const deps = writtenConfig["dependencies"] as Record<string, string>;
    expect(deps["@capacitor/camera"]).toBe("^7.0.0");
  });

  it("플러그인 제거: package.json에서 이전 플러그인을 삭제한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: {
            "@capacitor/core": "^7.0.0",
            "@capacitor/app": "^7.0.0",
            "@capacitor/android": "^7.0.0",
            "@capacitor/camera": "^7.0.0",
          },
          devDependencies: {
            "@capacitor/cli": "^7.0.0",
            "@capacitor/assets": "^3.0.0",
          },
        };
      }
      return { name: "test-pkg", version: "1.0.0" };
    });

    // plugins가 비어있으면 camera가 제거되어야 함
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });
    await cap.initialize();

    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) =>
        typeof call[0] === "string" && call[0].includes("package.json"),
    );
    expect(capPkgWrite).toBeDefined();
    const writtenConfig = capPkgWrite![1] as Record<string, unknown>;
    const deps = writtenConfig["dependencies"] as Record<string, string>;
    expect(deps["@capacitor/camera"]).toBeUndefined();
  });
});

describe("Android 개발 도구 감지", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("Java 21이 표준 경로에 설치되면 gradle.properties에 설정한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });
    await cap.initialize();

    const writeCalls = mockFsxWrite.mock.calls;
    const gradleWrite = writeCalls.find(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("gradle.properties") &&
        typeof call[1] === "string" &&
        call[1].includes("org.gradle.java.home"),
    );
    expect(gradleWrite).toBeDefined();
  });

  it("ANDROID_HOME 환경변수로 SDK를 감지한다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });
    await cap.initialize();

    const writeCalls = mockFsxWrite.mock.calls;
    const sdkWrite = writeCalls.find(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("local.properties") &&
        typeof call[1] === "string" &&
        call[1].includes("sdk.dir"),
    );
    expect(sdkWrite).toBeDefined();
  });

  it("Android SDK 미설치 시 에러가 발생한다", async () => {
    delete process.env["ANDROID_HOME"];
    mockFsxExists.mockImplementation((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor.lock")) return false;
      if (n.includes("Android/Sdk")) return false;
      if (n.includes("Android\\Sdk")) return false;
      if (n.includes("Program Files/Android")) return false;
      if (n.includes("C:/Android")) return false;
      return true;
    });

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });

    await expect(cap.initialize()).rejects.toThrow("Android SDK");
  });
});

describe("Android 네이티브 설정", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe("AndroidManifest.xml", () => {
    it("permissions를 AndroidManifest.xml에 추가한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: {
            permissions: [{ name: "CAMERA" }],
          },
        },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const manifestWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("AndroidManifest.xml") &&
          typeof call[1] === "string" &&
          call[1].includes("android.permission.CAMERA"),
      );
      expect(manifestWrite).toBeDefined();
    });

    it("usesCleartextTraffic을 자동 추가한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const manifestWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("AndroidManifest.xml") &&
          typeof call[1] === "string" &&
          call[1].includes("usesCleartextTraffic"),
      );
      expect(manifestWrite).toBeDefined();
    });

    it("intentFilters를 MainActivity에 추가한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: {
            intentFilters: [{ action: "android.intent.action.VIEW" }],
          },
        },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const manifestWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("AndroidManifest.xml") &&
          typeof call[1] === "string" &&
          call[1].includes("android.intent.action.VIEW"),
      );
      expect(manifestWrite).toBeDefined();
    });

    it("application 태그에 커스텀 속성을 추가한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: { config: { label: "Custom Label" } },
        },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const manifestWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("AndroidManifest.xml") &&
          typeof call[1] === "string" &&
          call[1].includes('android:label="Custom Label"'),
      );
      expect(manifestWrite).toBeDefined();
    });
  });

  describe("build.gradle", () => {
    it("sdkVersion을 build.gradle에 설정한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: { sdkVersion: 33 } },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const gradleWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("build.gradle") &&
          typeof call[1] === "string" &&
          call[1].includes("minSdkVersion 33"),
      );
      expect(gradleWrite).toBeDefined();
    });

    it("versionCode를 package.json version으로 계산한다", async () => {
      mockFsxReadJson.mockImplementation((p: string) => {
        const normalized = p.replace(/\\/g, "/");
        if (normalized.includes(".capacitor/package.json")) {
          return {
            name: "com.test.app",
            version: "1.2.3",
            dependencies: { "@capacitor/core": "^7.0.0", "@capacitor/app": "^7.0.0", "@capacitor/android": "^7.0.0" },
            devDependencies: { "@capacitor/cli": "^7.0.0", "@capacitor/assets": "^3.0.0" },
          };
        }
        return { name: "test-pkg", version: "1.2.3" };
      });

      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const gradleWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("build.gradle") &&
          typeof call[1] === "string" &&
          call[1].includes("versionCode 1002003"),
      );
      expect(gradleWrite).toBeDefined();
    });
  });

  describe("styles.xml", () => {
    it("styles.xml의 Theme.SplashScreen parent를 변경하고 android:background를 android:windowBackground로 변경한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const stylesWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("styles.xml") &&
          typeof call[1] === "string" &&
          call[1].includes('parent="Theme.AppCompat.DayNight.NoActionBar"'),
      );
      expect(stylesWrite).toBeDefined();
      const content = stylesWrite![1] as string;
      // @drawable/splash는 유지
      expect(content).toContain("@drawable/splash");
      // Theme.SplashScreen은 제거됨
      expect(content).not.toContain('parent="Theme.SplashScreen"');
      // android:background → android:windowBackground로 변경됨
      expect(content).toContain('"android:windowBackground">@drawable/splash');
      expect(content).not.toContain('"android:background">@drawable/splash');
    });

    it("이미 변경된 styles.xml은 재변경하지 않는다", async () => {
      mockFsxRead.mockImplementation((p: string) => {
        if (p.includes("styles.xml")) {
          return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>
</resources>`;
        }
        if (p.includes("AndroidManifest.xml")) {
          return '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application>\n<activity android:name=".MainActivity">\n</activity>\n</application>\n</manifest>';
        }
        if (p.includes("build.gradle")) {
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
        if (p.includes("gradle.properties")) {
          return "org.gradle.jvmargs=-Xmx2048m";
        }
        return "";
      });

      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });
      await cap.initialize();

      const writeCalls = mockFsxWrite.mock.calls;
      const stylesWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("styles.xml"),
      );
      expect(stylesWrite).toBeUndefined();
    });

    it("styles.xml이 없으면 warn을 출력한다", async () => {
      mockFsxExists.mockImplementation((p: string) => {
        const n = p.replace(/\\/g, "/");
        if (n.includes(".capacitor.lock")) return false;
        if (n.includes("styles.xml")) return false;
        return true;
      });

      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });
      await cap.initialize();

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("styles.xml"),
      );
    });
  });
});

describe("플러그인 의존성 해석", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("일반 npm 플러그인: root package.json에서 버전을 resolve한다", async () => {
    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: { "@capacitor/core": "^7.0.0", "@capacitor/app": "^7.0.0", "@capacitor/android": "^7.0.0" },
          devDependencies: { "@capacitor/cli": "^7.0.0", "@capacitor/assets": "^3.0.0" },
        };
      }
      return {
        name: "test-pkg",
        version: "1.0.0",
        dependencies: { "@capacitor/camera": "^7.1.0" },
      };
    });

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: { "@capacitor/camera": true },
      platform: { android: {} },
    });
    await cap.initialize();

    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) => typeof call[0] === "string" && call[0].includes("package.json"),
    );
    const deps = (capPkgWrite![1] as Record<string, unknown>)["dependencies"] as Record<string, string>;
    expect(deps["@capacitor/camera"]).toBe("^7.1.0");
  });

  it("exclude 패키지를 .capacitor/package.json에 추가한다", async () => {
    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: { "@capacitor/core": "^7.0.0", "@capacitor/app": "^7.0.0", "@capacitor/android": "^7.0.0" },
          devDependencies: { "@capacitor/cli": "^7.0.0", "@capacitor/assets": "^3.0.0" },
        };
      }
      return {
        name: "test-pkg",
        version: "1.0.0",
        dependencies: { "jeep-sqlite": "^2.0.0" },
      };
    });

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(
      PKG_PATH,
      { appId: "com.test.app", appName: "Test App", platform: { android: {} } },
      ["jeep-sqlite"],
    );
    await cap.initialize();

    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) => typeof call[0] === "string" && call[0].includes("package.json"),
    );
    const deps = (capPkgWrite![1] as Record<string, unknown>)["dependencies"] as Record<string, string>;
    expect(deps["jeep-sqlite"]).toBe("^2.0.0");
  });

  it("플러그인 버전이 root에 없으면 *를 사용한다", async () => {
    mockFsxReadJson.mockImplementation((p: string) => {
      const normalized = p.replace(/\\/g, "/");
      if (normalized.includes(".capacitor/package.json")) {
        return {
          name: "com.test.app",
          version: "1.0.0",
          dependencies: { "@capacitor/core": "^7.0.0", "@capacitor/app": "^7.0.0", "@capacitor/android": "^7.0.0" },
          devDependencies: { "@capacitor/cli": "^7.0.0", "@capacitor/assets": "^3.0.0" },
        };
      }
      return { name: "test-pkg", version: "1.0.0" };
    });

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: { "unknown-plugin": true },
      platform: { android: {} },
    });
    await cap.initialize();

    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) => typeof call[0] === "string" && call[0].includes("package.json"),
    );
    const deps = (capPkgWrite![1] as Record<string, unknown>)["dependencies"] as Record<string, string>;
    expect(deps["unknown-plugin"]).toBe("*");
  });
});
