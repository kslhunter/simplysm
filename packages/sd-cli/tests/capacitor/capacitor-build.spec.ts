/* eslint-disable no-restricted-properties -- 테스트 환경변수 조작 필요 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fsx, cpx } from "@simplysm/core-node";

// sharp는 외부 npm 네이티브 라이브러리로 이미지 처리 시간이 크고 결정적 검증에 mock 필요
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
const mockFsxGlob = vi.spyOn(fsx, "glob").mockResolvedValue([]);
vi.spyOn(fsx, "copy").mockResolvedValue(undefined);

vi.spyOn(cpx, "spawn").mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
vi.spyOn(cpx, "spawnSync").mockReturnValue({ stdout: "", stderr: "", exitCode: 0 });

let tmpRoot: string;
let PKG_PATH: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "cap-build-"));
  writeFileSync(path.join(tmpRoot, "pnpm-workspace.yaml"), "");
  PKG_PATH = path.join(tmpRoot, "pkg");
  mkdirSync(path.join(PKG_PATH, ".capacitor"), { recursive: true });
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function setupDefaultMocks() {
  mockFsxExists.mockResolvedValue(true);

  mockFsxReadJson.mockImplementation(((p: string) => {
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
  }) as never);

  mockFsxRead.mockImplementation(((p: string) => {
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
    buildTypes { release { } }
}`;
    }
    if (p.includes("gradle.properties")) {
      return "org.gradle.jvmargs=-Xmx2048m";
    }
    return "";
  }) as never);

  mockFsxGlob.mockImplementation(((pattern: string) => {
    if (pattern.includes("Corretto") || pattern.includes("jdk")) {
      return ["C:/Program Files/Amazon Corretto/jdk21.0.1"];
    }
    return [];
  }) as never);

  process.env["ANDROID_HOME"] = "C:/Android/Sdk";
}

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

  describe("서명", () => {
    it("keystore 파일이 없으면 에러가 발생한다", async () => {
      const { Capacitor } = await import("../../src/capacitor/capacitor.js");

      // keystore 파일만 존재하지 않도록 설정
      mockFsxExists.mockImplementation(((p: string) => {
        if (p.includes("my-release.keystore")) return false;
        return true;
      }) as never);

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
  });
});
