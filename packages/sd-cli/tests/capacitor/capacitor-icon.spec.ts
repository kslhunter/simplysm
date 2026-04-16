/* eslint-disable no-restricted-properties -- 테스트 환경변수 조작 필요 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { consola } from "consola";

//#region Mocks

// fsx mock
const mockFsxExists = vi.fn();
const mockFsxRead = vi.fn();
const mockFsxWrite = vi.fn().mockResolvedValue(undefined);
const mockFsxReadJson = vi.fn();
const mockFsxWriteJson = vi.fn().mockResolvedValue(undefined);
const mockFsxMkdir = vi.fn().mockResolvedValue(undefined);
const mockFsxRm = vi.fn().mockResolvedValue(undefined);
const mockFsxGlob = vi.fn();

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
    },
    cpx: {
      spawn: mockCpxSpawn,
      spawnSync: vi.fn().mockReturnValue({ stdout: "", stderr: "", exitCode: 0 }),
    },
  };
});

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
const mockSharpToBuffer = vi.fn().mockResolvedValue(new Uint8Array([0]));
const mockSharpToFile = vi.fn().mockResolvedValue(undefined);
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  composite: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  toBuffer: mockSharpToBuffer,
  toFile: mockSharpToFile,
};
const mockSharp = vi.fn().mockReturnValue(mockSharpInstance);
vi.mock("sharp", () => ({ default: mockSharp }));

// consola mock (logger assertion 필요)
const mockLoggerWarn = vi.fn();
vi.spyOn(consola, "withTag").mockReturnValue({ debug: vi.fn(), warn: mockLoggerWarn, error: vi.fn(), info: vi.fn(), success: vi.fn(), start: vi.fn() } as any);

//#endregion

//#region Helpers

const PKG_PATH = "/fake/pkg";
const _CAP_PATH = "/fake/pkg/.capacitor";

function setupDefaultMocks() {
  // fsx.exists: 모든 것 존재, lock만 없음
  mockFsxExists.mockImplementation((p: string) => {
    if (p.includes(".capacitor.lock")) return false;
    return true;
  });

  // fsx.readJson: package.json 응답
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
    return { name: "test-pkg", version: "1.0.0" };
  });

  // fsx.read: Android 설정 파일
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

  // fsx.glob: Java 21 경로
  mockFsxGlob.mockResolvedValue(["C:/Program Files/Amazon Corretto/jdk21.0.1"]);

  // env: Android SDK
  process.env["ANDROID_HOME"] = "C:/Android/Sdk";

  // execa 호출 기록 초기화
  execaCalls.length = 0;
}

//#endregion

let savedEnv: Record<string, string | undefined>;
beforeEach(() => {
  savedEnv = { ...process.env };
});
afterEach(() => {
  process.env = savedEnv;
});

describe("Capacitor 아이콘 처리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe("인수 테스트", () => {
    it("icon 경로가 지정되어 있으면 initialize 시 아이콘을 생성한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        icon: "assets/icon.png",
        platform: { android: {} },
      });

      await cap.initialize();

      // capacitor-assets generate가 실행되었는지 확인
      const assetsCmd = execaCalls.find(
        (c) => c.command === "pnpm" && c.args.includes("capacitor-assets"),
      );
      expect(assetsCmd).toBeDefined();

      // sharp가 소스 이미지를 처리했는지 확인
      expect(mockSharp).toHaveBeenCalled();
    });

    it("icon이 미지정이면 기본 아이콘을 유지한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        platform: { android: {} },
      });

      await cap.initialize();

      // sharp가 호출되지 않아야 한다
      expect(mockSharp).not.toHaveBeenCalled();

      // capacitor-assets generate가 실행되지 않아야 한다
      const assetsCmd = execaCalls.find(
        (c) => c.command === "pnpm" && c.args.includes("capacitor-assets"),
      );
      expect(assetsCmd).toBeUndefined();
    });

    it("icon 경로의 파일이 없으면 경고 후 기본 아이콘을 사용한다", async () => {
      // icon 파일만 존재하지 않도록 설정
      mockFsxExists.mockImplementation((p: string) => {
        if (p.includes(".capacitor.lock")) return false;
        if (p.includes("icon.png")) return false;
        return true;
      });

      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        icon: "assets/icon.png",
        platform: { android: {} },
      });

      await cap.initialize();

      // 경고가 출력되었는지 확인
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("icon"),
      );

      // sharp가 호출되지 않아야 한다
      expect(mockSharp).not.toHaveBeenCalled();
    });
  });

  describe("단위", () => {
    it("sharp로 소스 이미지를 리사이즈하고 1024x1024 캔버스에 합성한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      const cap = await Capacitor.create(PKG_PATH, {
        appId: "com.test.app",
        appName: "Test App",
        icon: "assets/icon.png",
        platform: { android: {} },
      });

      await cap.initialize();

      // sharp가 소스 이미지 경로로 호출되었는지 확인
      const sourceCall = mockSharp.mock.calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("icon.png"),
      );
      expect(sourceCall).toBeDefined();

      // resize가 호출되었는지 확인
      expect(mockSharpInstance.resize).toHaveBeenCalled();

      // composite가 호출되었는지 확인 (캔버스 합성)
      expect(mockSharpInstance.composite).toHaveBeenCalled();

      // toFile로 logo.png에 저장되었는지 확인
      const toFileCalls = mockSharpToFile.mock.calls;
      const logoCall = toFileCalls.find(
        (call) => typeof call[0] === "string" && call[0].includes("logo.png"),
      );
      expect(logoCall).toBeDefined();
    });
  });
});
