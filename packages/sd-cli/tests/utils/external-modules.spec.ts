import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// Mock fs (readFileSync, existsSync)
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();

vi.mock("fs", () => ({
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  existsSync: (...args: any[]) => mockExistsSync(...args),
}));

// Mock createRequire to control module resolution
const mockResolve = vi.fn();
vi.mock("module", () => ({
  createRequire: vi.fn(() => ({
    resolve: mockResolve,
  })),
}));

const { collectUninstalledOptionalPeerDeps, collectNativeModuleExternals, collectAllDependencyExternals } =
  await import("../../src/esbuild/esbuild-config");

describe("collectUninstalledOptionalPeerDeps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects uninstalled optional peer dependencies", () => {
    // Root package.json with one dependency
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({ dependencies: { "some-lib": "^1.0.0" } });
      }
      // some-lib's package.json with optional peer dep
      return JSON.stringify({
        peerDependencies: { "optional-peer": "^2.0.0" },
        peerDependenciesMeta: { "optional-peer": { optional: true } },
      });
    });

    // Resolving some-lib/package.json succeeds
    mockResolve.mockImplementation((name: string) => {
      if (name === "some-lib/package.json") {
        return "/node_modules/some-lib/package.json";
      }
      // optional-peer cannot be resolved (not installed)
      throw new Error("MODULE_NOT_FOUND");
    });

    const result = collectUninstalledOptionalPeerDeps("/pkg");
    expect(result).toContain("optional-peer");
  });

  it("does not include installed optional peer dependencies", () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({ dependencies: { "some-lib": "^1.0.0" } });
      }
      return JSON.stringify({
        peerDependencies: { "installed-peer": "^2.0.0" },
        peerDependenciesMeta: { "installed-peer": { optional: true } },
      });
    });

    mockResolve.mockImplementation((name: string) => {
      if (name === "some-lib/package.json") {
        return "/node_modules/some-lib/package.json";
      }
      // installed-peer resolves successfully
      if (name === "installed-peer") {
        return "/node_modules/installed-peer/index.js";
      }
      throw new Error("MODULE_NOT_FOUND");
    });

    const result = collectUninstalledOptionalPeerDeps("/pkg");
    expect(result).not.toContain("installed-peer");
  });

  it("returns empty array when no optional peer deps exist", () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({ dependencies: { "some-lib": "^1.0.0" } });
      }
      return JSON.stringify({ dependencies: {} });
    });

    mockResolve.mockImplementation((name: string) => {
      if (name === "some-lib/package.json") {
        return "/node_modules/some-lib/package.json";
      }
      throw new Error("MODULE_NOT_FOUND");
    });

    const result = collectUninstalledOptionalPeerDeps("/pkg");
    expect(result).toEqual([]);
  });
});

describe("collectNativeModuleExternals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects native modules with binding.gyp", () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({ dependencies: { bcrypt: "^5.0.0" } });
      }
      return JSON.stringify({ dependencies: {} });
    });

    mockResolve.mockImplementation((name: string) => {
      if (name === "bcrypt/package.json") {
        return "/node_modules/bcrypt/package.json";
      }
      throw new Error("MODULE_NOT_FOUND");
    });

    mockExistsSync.mockImplementation((filePath: string) => {
      return filePath === path.join("/node_modules/bcrypt", "binding.gyp");
    });

    const result = collectNativeModuleExternals("/pkg");
    expect(result).toContain("bcrypt");
  });

  it("does not include non-native modules", () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({ dependencies: { lodash: "^4.0.0" } });
      }
      return JSON.stringify({ dependencies: {} });
    });

    mockResolve.mockImplementation((name: string) => {
      if (name === "lodash/package.json") {
        return "/node_modules/lodash/package.json";
      }
      throw new Error("MODULE_NOT_FOUND");
    });

    mockExistsSync.mockReturnValue(false);

    const result = collectNativeModuleExternals("/pkg");
    expect(result).not.toContain("lodash");
    expect(result).toEqual([]);
  });
});

describe("collectAllDependencyExternals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects both optional peer deps and native modules in a single pass", () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({
          dependencies: { "native-lib": "^1.0.0", "peer-lib": "^2.0.0" },
        });
      }
      if (filePath === "/node_modules/native-lib/package.json") {
        return JSON.stringify({ dependencies: {} });
      }
      if (filePath === "/node_modules/peer-lib/package.json") {
        return JSON.stringify({
          peerDependencies: { "opt-peer": "^3.0.0" },
          peerDependenciesMeta: { "opt-peer": { optional: true } },
        });
      }
      return JSON.stringify({});
    });

    mockResolve.mockImplementation((name: string) => {
      if (name === "native-lib/package.json") {
        return "/node_modules/native-lib/package.json";
      }
      if (name === "peer-lib/package.json") {
        return "/node_modules/peer-lib/package.json";
      }
      // opt-peer not installed
      throw new Error("MODULE_NOT_FOUND");
    });

    mockExistsSync.mockImplementation((filePath: string) => {
      return filePath === path.join("/node_modules/native-lib", "binding.gyp");
    });

    const result = collectAllDependencyExternals("/pkg");
    expect(result.optionalPeerDeps).toContain("opt-peer");
    expect(result.nativeModules).toContain("native-lib");
  });

  it("returns empty arrays when no externals are found", () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath === path.join("/pkg", "package.json")) {
        return JSON.stringify({ dependencies: { "some-lib": "^1.0.0" } });
      }
      return JSON.stringify({ dependencies: {} });
    });

    mockResolve.mockImplementation((name: string) => {
      if (name === "some-lib/package.json") {
        return "/node_modules/some-lib/package.json";
      }
      throw new Error("MODULE_NOT_FOUND");
    });

    mockExistsSync.mockReturnValue(false);

    const result = collectAllDependencyExternals("/pkg");
    expect(result.optionalPeerDeps).toEqual([]);
    expect(result.nativeModules).toEqual([]);
  });
});
