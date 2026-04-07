import path from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

//#region Mocks

// fsx mock
const mockFsxExists = vi.fn();
const mockFsxRead = vi.fn();
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxReadJson = vi.fn();
const mockFsxWriteJson = vi.fn().mockResolvedValue(undefined);
const mockFsxMkdir = vi.fn().mockResolvedValue(undefined);
const mockFsxRm = vi.fn().mockResolvedValue(undefined);
const mockFsxGlob = vi.fn().mockResolvedValue([]);
const mockFsxCopy = vi.fn().mockResolvedValue(undefined);

vi.mock("@simplysm/core-node", () => ({
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
  pathx: {
    posixResolve: (...args: string[]) => path.resolve(...args).replace(/\\/g, "/"),
    posix: (p: string) => p.replace(/\\/g, "/"),
  },
}));

// cpx mock (was execa)
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

// sharp mock
vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(new Uint8Array([0])),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

// consola mock (logger assertion 필요)
const mockLoggerWarn = vi.fn();
const _mockConsola = {
  level: 0,
  withTag: () => ({ debug: vi.fn(), warn: mockLoggerWarn, error: vi.fn(), info: vi.fn(), success: vi.fn() }),
};
vi.mock("consola", () => ({
  consola: _mockConsola,
  default: _mockConsola,
  LogLevels: { debug: 4 },
}));

//#endregion

//#region Helpers

const PKG_PATH = "/fake/pkg";

/** Gradle 실행 명령을 찾는다 (Windows: cmd /c gradlew.bat, 그 외: gradlew) */
function findGradleCall(calls: { command: string; args: string[] }[]) {
  return calls.find(
    (c) => c.command.includes("gradlew") || (c.command === "cmd" && c.args.includes("gradlew.bat")),
  );
}

function findGradleCallIndex(calls: { command: string; args: string[] }[]) {
  return calls.findIndex(
    (c) => c.command.includes("gradlew") || (c.command === "cmd" && c.args.includes("gradlew.bat")),
  );
}

function setupDefaultMocks() {
  mockFsxExists.mockResolvedValue(true);

  mockFsxReadJson.mockImplementation((p: string) => {
    const normalized = p.replace(/\\/g, "/");
    if (normalized.includes(".capacitor/package.json")) {
      return {
        name: "com.test.app",
        version: "1.2.3",
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
    return { name: "test-pkg", version: "1.2.3" };
  });

  mockFsxRead.mockImplementation((p: string) => {
    if (p.includes("AndroidManifest.xml")) {
      return '<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application>\n</application>\n</manifest>';
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
    return "";
  });

  mockFsxGlob.mockImplementation((pattern: string) => {
    if (pattern.includes("Corretto") || pattern.includes("jdk")) {
      return ["C:/Program Files/Amazon Corretto/jdk21.0.1"];
    }
    // Gradle 빌드 출력 파일 검색
    if (pattern.includes("app-release.apk") || pattern.includes("app-*.apk")) {
      return ["/fake/pkg/.capacitor/android/app/build/outputs/apk/release/app-release-unsigned.apk"];
    }
    if (pattern.includes("app-release.aab") || pattern.includes("app-*.aab")) {
      return ["/fake/pkg/.capacitor/android/app/build/outputs/bundle/release/app-release.aab"];
    }
    return [];
  });

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

describe("Capacitor 빌드", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe("인수 테스트", () => {
    it("AAB 번들 빌드: bundle=true일 때 Gradle bundleRelease task를 실행한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: { bundle: true } },
      });

      await cap.build("/fake/out");

      const gradleCmd = findGradleCall(execaCalls);
      expect(gradleCmd).toBeDefined();
      expect(gradleCmd!.args).toContain("bundleRelease");
    });

    it("APK release 빌드: bundle=false일 때 Gradle assembleRelease task를 실행한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });

      await cap.build("/fake/out");

      const gradleCmd = findGradleCall(execaCalls);
      expect(gradleCmd).toBeDefined();
      expect(gradleCmd!.args).toContain("assembleRelease");
    });

    it("APK debug 빌드: debug=true일 때 Gradle assembleDebug task를 실행한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        debug: true,
        platform: { android: {} },
      });

      await cap.build("/fake/out");

      const gradleCmd = findGradleCall(execaCalls);
      expect(gradleCmd).toBeDefined();
      expect(gradleCmd!.args).toContain("assembleDebug");
    });

    it("서명 설정이 없으면 unsigned 빌드를 생성하고 경고한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });

      await cap.build("/fake/out");

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("서명"),
      );
    });

    it("빌드 산출물을 outPath/android/ 경로에 복사한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });

      await cap.build("/fake/out");

      // outPath/android/ 디렉토리 생성 확인
      const mkdirCalls = mockFsxMkdir.mock.calls.map((c) =>
        (c[0] as string).replace(/\\/g, "/"),
      );
      const androidDir = mkdirCalls.find((p) => p.includes("/fake/out/android"));
      expect(androidDir).toBeDefined();

      // 파일 복사 확인
      expect(mockFsxCopy).toHaveBeenCalled();
    });
  });

  describe("단위", () => {
    it("build 전에 cap copy로 웹 에셋을 네이티브 프로젝트에 동기화한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });

      await cap.build("/fake/out");

      // cap copy가 gradlew보다 먼저 실행되는지 확인
      const capCopyIndex = execaCalls.findIndex(
        (c) => c.command === "pnpm" && c.args.includes("cap") && c.args.includes("copy"),
      );
      const gradlewIndex = findGradleCallIndex(execaCalls);
      expect(capCopyIndex).toBeGreaterThanOrEqual(0);
      expect(gradlewIndex).toBeGreaterThan(capCopyIndex);
    });

    it("Windows에서 cmd /c gradlew.bat으로 Gradle을 실행한다", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      try {
        const { Capacitor } = await import("../../src/capacitor/capacitor.js");

        const cap = await Capacitor.create(PKG_PATH, {
          appId: "com.test.app",
          appName: "Test App",
          platform: { android: {} },
        });

        await cap.build("/fake/out");

        const gradleCmd = execaCalls.find((c) => c.command === "cmd");
        expect(gradleCmd).toBeDefined();
        expect(gradleCmd!.args[0]).toBe("/c");
        expect(gradleCmd!.args[1]).toBe("gradlew.bat");
        expect(gradleCmd!.args).toContain("assembleRelease");
        expect(gradleCmd!.args).toContain("--no-daemon");
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
      }
    });

    it("Linux/macOS에서 gradlew를 직접 실행한다", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      try {
        const { Capacitor } = await import("../../src/capacitor/capacitor.js");

        const cap = await Capacitor.create(PKG_PATH, {
          appId: "com.test.app",
          appName: "Test App",
          platform: { android: {} },
        });

        await cap.build("/fake/out");

        const gradleCmd = findGradleCall(execaCalls);
        expect(gradleCmd).toBeDefined();
        expect(gradleCmd!.command).toContain("gradlew");
        expect(gradleCmd!.command).not.toContain("gradlew.bat");
        expect(gradleCmd!.args).toContain("assembleRelease");
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
      }
    });
  });

  describe("서명", () => {
    it("서명 설정이 있으면 build.gradle에 signingConfigs를 추가한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      // keystore 파일 존재하도록 설정
      mockFsxExists.mockResolvedValue(true);

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: {
            sign: {
              keystore: "my-release.keystore",
              storePassword: "store123",
              alias: "my-key",
              password: "key123",
            },
          },
        },
      });

      await cap.build("/fake/out");

      // build.gradle에 signingConfigs가 쓰여졌는지 확인
      const writeCalls = mockFsxWrite.mock.calls;
      const gradleWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("build.gradle") &&
          typeof call[1] === "string" &&
          call[1].includes("signingConfigs"),
      );
      expect(gradleWrite).toBeDefined();

      // build.gradle에 비밀번호가 포함되어 있는지 확인 (.capacitor는 gitignore 대상)
      const gradleContent = gradleWrite![1] as string;
      expect(gradleContent).toContain("storePassword 'store123'");
      expect(gradleContent).toContain("keyPassword 'key123'");
      expect(gradleContent).toContain("keyAlias 'my-key'");

      // unsigned 경고가 출력되지 않아야 한다
      const unsignedWarn = mockLoggerWarn.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("서명"),
      );
      expect(unsignedWarn).toBeUndefined();
    });

    it("keystore 파일이 없으면 에러가 발생한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      // keystore 파일만 존재하지 않도록 설정
      mockFsxExists.mockImplementation((p: string) => {
        if (p.includes("my-release.keystore")) return false;
        return true;
      });

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: {
            sign: {
              keystore: "my-release.keystore",
              storePassword: "store123",
              alias: "my-key",
              password: "key123",
            },
          },
        },
      });

      await expect(cap.build("/fake/out")).rejects.toThrow("keystore");
    });

    it("비밀번호에 $, \\, ' 등 특수문자가 있으면 Groovy 이스케이프하여 build.gradle에 기록한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");
      mockFsxExists.mockResolvedValue(true);

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: {
            sign: {
              keystore: "my-release.keystore",
              storePassword: "12tlavmf#$",
              alias: "my-key",
              password: "pass\\'word",
            },
          },
        },
      });

      await cap.build("/fake/out");

      const writeCalls = mockFsxWrite.mock.calls;
      const gradleWrite = writeCalls.find(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("build.gradle") &&
          typeof call[1] === "string" &&
          call[1].includes("signingConfigs"),
      );
      expect(gradleWrite).toBeDefined();

      const gradleContent = gradleWrite![1] as string;
      // $ 는 Groovy single-quoted string에서 그대로 유지
      expect(gradleContent).toContain("storePassword '12tlavmf#$'");
      // \ → \\, ' → \' 이스케이프
      expect(gradleContent).toContain("keyPassword 'pass\\\\\\'word'");
    });

    it("signed 빌드 산출물이 unsigned 접미사 없이 복사된다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      // signed 빌드 출력 설정
      mockFsxGlob.mockImplementation((pattern: string) => {
        if (pattern.includes("Corretto")) return ["C:/Program Files/Amazon Corretto/jdk21.0.1"];
        if (pattern.includes("app-")) {
          return ["/fake/pkg/.capacitor/android/app/build/outputs/apk/release/app-release.apk"];
        }
        return [];
      });

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: {
          android: {
            sign: {
              keystore: "my-release.keystore",
              storePassword: "store123",
              alias: "my-key",
              password: "key123",
            },
          },
        },
      });

      await cap.build("/fake/out");

      // latest 파일명에 unsigned가 없는지 확인
      const copyCalls = mockFsxCopy.mock.calls.map((c) => [
        (c[0] as string).replace(/\\/g, "/"),
        (c[1] as string).replace(/\\/g, "/"),
      ]);
      const latestCopy = copyCalls.find(
        (c) => c[1].includes("latest"),
      );
      expect(latestCopy).toBeDefined();
      expect(latestCopy![1]).not.toContain("unsigned");
    });
  });
});
