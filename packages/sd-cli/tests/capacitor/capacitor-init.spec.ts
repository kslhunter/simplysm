/* eslint-disable no-restricted-properties -- 테스트 환경변수 조작 필요 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fsx, cpx } from "@simplysm/core-node";

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(new Uint8Array([0])),
    toFile: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockFsxExists = vi.spyOn(fsx, "exists");
const mockFsxRead = vi.spyOn(fsx, "read");
vi.spyOn(fsx, "write").mockResolvedValue(undefined);
const mockFsxReadJson = vi.spyOn(fsx, "readJson");
vi.spyOn(fsx, "writeJson").mockResolvedValue(undefined);
vi.spyOn(fsx, "mkdir").mockResolvedValue(undefined);
vi.spyOn(fsx, "rm").mockResolvedValue(undefined);
const mockFsxGlob = vi.spyOn(fsx, "glob");
vi.spyOn(fsx, "copy").mockResolvedValue(undefined);

vi.spyOn(cpx, "spawn").mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
vi.spyOn(cpx, "spawnSync").mockReturnValue({ stdout: "", stderr: "", exitCode: 0 });

let tmpRoot: string;
let PKG_PATH: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "cap-init-"));
  writeFileSync(path.join(tmpRoot, "package.json"), JSON.stringify({ private: true, workspaces: ["pkg"] }));
  PKG_PATH = path.join(tmpRoot, "pkg");
  // capacitor.ts가 .capacitor/.capacitor.lock 파일을 작성하므로 디렉토리 미리 생성
  mkdirSync(path.join(PKG_PATH, ".capacitor"), { recursive: true });
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function setupDefaultMocks() {
  mockFsxExists.mockImplementation(((p: string) => {
    if (p.includes(".capacitor.lock")) return false;
    return true;
  }) as never);

  mockFsxReadJson.mockImplementation(((p: string) => {
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
  }) as never);

  mockFsxRead.mockImplementation(((p: string) => {
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
  }) as never);

  mockFsxGlob.mockResolvedValue(["C:/Program Files/Amazon Corretto/jdk21.0.1"]);
  process.env["ANDROID_HOME"] = "C:/Android/Sdk";
}

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

describe("Android 개발 도구 감지", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("Android SDK 미설치 시 에러가 발생한다", async () => {
    delete process.env["ANDROID_HOME"];
    mockFsxExists.mockImplementation(((p: string) => {
      const n = p.replace(/\\/g, "/");
      if (n.includes(".capacitor.lock")) return false;
      if (n.includes("Android/Sdk")) return false;
      if (n.includes("Android\\Sdk")) return false;
      if (n.includes("Program Files/Android")) return false;
      if (n.includes("C:/Android")) return false;
      return true;
    }) as never);

    const { Capacitor } = await import("../../src/capacitor/capacitor.js");
    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      platform: { android: {} },
    });

    await expect(cap.initialize()).rejects.toThrow("Android SDK");
  });
});
