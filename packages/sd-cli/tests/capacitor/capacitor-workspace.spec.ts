import path from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const mockSymlink = vi.fn().mockResolvedValue(undefined);
vi.mock("fs/promises", () => ({
  symlink: mockSymlink,
}));

vi.mock("module", () => ({
  createRequire: () => ({
    resolve: (id: string) => {
      if (id.includes("capacitor-plugin-auto-update")) {
        return path.resolve("/fake/workspace/packages/capacitor-plugin-auto-update/package.json");
      }
      throw new Error(`Cannot find module '${id}'`);
    },
  }),
}));

//#endregion

//#region Helpers

const PKG_PATH = "/fake/pkg";

function setupDefaultMocks() {
  mockFsxExists.mockImplementation((p: string) => {
    const n = p.replace(/\\/g, "/");
    if (n.includes(".capacitor.lock")) return false;
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
    return {
      name: "test-pkg",
      version: "1.0.0",
      dependencies: {
        "@simplysm/capacitor-plugin-auto-update": "workspace:*",
        "@capacitor/camera": "^7.0.0",
      },
    };
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
    return "";
  });

  mockFsxGlob.mockResolvedValue(["C:/Program Files/Amazon Corretto/jdk21.0.1"]);
  process.env["ANDROID_HOME"] = "C:/Android/Sdk";
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

describe("workspace:* 플러그인 해석", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("workspace:* 플러그인이 link: 프로토콜로 package.json에 등록된다", async () => {
    const { Capacitor } = await import("../../src/capacitor/capacitor.js");

    const cap = await Capacitor.create(PKG_PATH, {
      appId: "com.test.app",
      appName: "Test App",
      plugins: {
        "@simplysm/capacitor-plugin-auto-update": true,
        "@capacitor/camera": true,
      },
      platform: { android: {} },
    });

    await cap.initialize();

    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) => typeof call[0] === "string" && call[0].includes("package.json"),
    );
    expect(capPkgWrite).toBeDefined();
    const deps = (capPkgWrite![1] as Record<string, unknown>)["dependencies"] as Record<
      string,
      string
    >;

    // 1. workspace:* 플러그인이 link: 프로토콜로 등록되어야 한다
    expect(deps["@simplysm/capacitor-plugin-auto-update"]).toMatch(/^link:/);

    // 2. link: 경로는 상대경로여야 한다 (절대경로가 아님)
    const linkPath = deps["@simplysm/capacitor-plugin-auto-update"].replace(/^link:/, "");
    expect(linkPath).not.toMatch(/^[A-Z]:|^\//i);

    // 3. 일반 npm 플러그인은 버전 문자열로 등록되어야 한다
    expect(deps["@capacitor/camera"]).toBe("^7.0.0");

    // 4. 수동 symlink 생성이 호출되지 않아야 한다
    expect(mockSymlink).not.toHaveBeenCalled();
  });
});
