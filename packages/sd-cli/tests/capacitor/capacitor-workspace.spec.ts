import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

let mockEnv: Record<string, unknown> = {};
vi.mock("@simplysm/core-common", () => ({
  env: new Proxy({} as Record<string, unknown>, {
    get: (_target, prop) => mockEnv[prop as string],
  }),
}));

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

vi.mock("consola", () => ({
  consola: {
    withTag: () => ({ debug: vi.fn(), warn: vi.fn() }),
    level: 0,
  },
  LogLevels: { debug: 4 },
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
  mockEnv = { ANDROID_HOME: "C:/Android/Sdk" };
  execaCalls.length = 0;
}

//#endregion

describe("workspace:* 플러그인 해석", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("workspace:* 플러그인을 package.json에 추가하지 않고 symlink로 연결한다", async () => {
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

    // 1. .capacitor/package.json에 workspace:* 플러그인이 포함되지 않아야 한다
    const writeJsonCalls = mockFsxWriteJson.mock.calls;
    const capPkgWrite = writeJsonCalls.find(
      (call) => typeof call[0] === "string" && call[0].includes("package.json"),
    );
    expect(capPkgWrite).toBeDefined();
    const deps = (capPkgWrite![1] as Record<string, unknown>)["dependencies"] as Record<
      string,
      string
    >;
    expect(deps["@simplysm/capacitor-plugin-auto-update"]).toBeUndefined();

    // 2. 일반 npm 플러그인은 정상 추가되어야 한다
    expect(deps["@capacitor/camera"]).toBe("^7.0.0");

    // 3. symlink가 생성되어야 한다
    expect(mockSymlink).toHaveBeenCalled();
    const symlinkCall = mockSymlink.mock.calls.find(
      (call) =>
        typeof call[1] === "string" &&
        call[1].replace(/\\/g, "/").includes("@simplysm/capacitor-plugin-auto-update"),
    );
    expect(symlinkCall).toBeDefined();
  });
});
