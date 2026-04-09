import { describe, it, expect, vi, afterEach } from "vitest";

// Mock fs for getTypesFromPackageJson
const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockReadFileSync = vi.fn<(path: string, encoding: string) => string>();
vi.mock("fs", () => {
  const fsMock = {
    existsSync: (path: string) => mockExistsSync(path),
    readFileSync: (path: string, encoding: string) => mockReadFileSync(path, encoding),
  };
  return { ...fsMock, default: fsMock };
});

vi.mock("typescript", () => ({
  default: {
    readConfigFile: vi.fn(),
    sys: { readFile: vi.fn() },
    parseJsonConfigFileContent: vi.fn(),
  },
}));

const {
  getTypesFromPackageJson,
  getCompilerOptionsForEnv,
  toTypecheckEnvs,
} = await import("../../src/utils/tsconfig");

afterEach(() => {
  vi.clearAllMocks();
});

//#region Acceptance Tests — Slice 1 Scenarios

describe("getCompilerOptionsForEnv", () => {
  // Scenario: node env에서 DOM 및 WebWorker lib 제거
  it("removes DOM and WebWorker libs in node env", () => {
    mockExistsSync.mockReturnValue(false);
    const base = { lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.webworker.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "node", "/pkg");
    expect(result.lib).toEqual(["lib.esnext.d.ts"]);
  });

  // Scenario: node env에서 사용자 커스텀 lib 보존
  it("preserves custom libs in node env", () => {
    mockExistsSync.mockReturnValue(false);
    const base = { lib: ["lib.esnext.d.ts", "lib.webworker.d.ts", "lib.scripthost.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "node", "/pkg");
    expect(result.lib).toEqual(["lib.esnext.d.ts", "lib.scripthost.d.ts"]);
  });

  // Scenario: browser env에서 lib 변화 없음
  it("does not modify lib in browser env", () => {
    mockExistsSync.mockReturnValue(false);
    const base = { lib: ["lib.esnext.d.ts", "lib.webworker.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", "/pkg");
    expect(result.lib).toEqual(["lib.esnext.d.ts", "lib.webworker.d.ts"]);
  });

  // Scenario: node env에서 types 변화 없음
  it("does not set types in node env", () => {
    mockExistsSync.mockReturnValue(false);
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "node", "/pkg");
    expect(result.types).toBeUndefined();
  });

  // Scenario: browser env에서 @types/node 제거
  it("removes @types/node in browser env via devDeps", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { "@types/node": "^20", "@types/ws": "^8" } }),
    );
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", "/pkg");
    expect(result.types).toEqual(["ws"]);
  });

  // Scenario: browser env에서 @types/node만 있는 경우
  it("returns empty types when only @types/node in browser env", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { "@types/node": "^20" } }),
    );
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", "/pkg");
    expect(result.types).toEqual([]);
  });

  // Scenario: browser env에서 @types가 없는 경우
  it("returns empty types when no @types in browser env", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ devDependencies: { vitest: "^1" } }),
    );
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", "/pkg");
    expect(result.types).toEqual([]);
  });
});

//#endregion

//#region Unit Tests — getTypesFromPackageJson

describe("getTypesFromPackageJson", () => {
  it("extracts @types packages from devDependencies", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        devDependencies: { "@types/node": "^20", "@types/ws": "^8", "vitest": "^1" },
      }),
    );
    expect(getTypesFromPackageJson("/pkg")).toEqual(["node", "ws"]);
  });

  it("returns empty array when package.json does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    expect(getTypesFromPackageJson("/nonexistent")).toEqual([]);
  });

  it("returns empty array when no devDependencies", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ name: "test" }));
    expect(getTypesFromPackageJson("/pkg")).toEqual([]);
  });

  it("handles scoped @types packages", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        devDependencies: { "@types/ssh2-sftp-client": "^9" },
      }),
    );
    expect(getTypesFromPackageJson("/pkg")).toEqual(["ssh2-sftp-client"]);
  });
});

//#endregion

//#region Unit Tests — toTypecheckEnvs

describe("toTypecheckEnvs", () => {
  it("returns ['node'] for node target", () => {
    expect(toTypecheckEnvs("node")).toEqual(["node"]);
  });

  it("returns ['node'] for server target", () => {
    expect(toTypecheckEnvs("server")).toEqual(["node"]);
  });

  it("returns ['browser'] for browser target", () => {
    expect(toTypecheckEnvs("browser")).toEqual(["browser"]);
  });

  it("returns ['browser'] for client target", () => {
    expect(toTypecheckEnvs("client")).toEqual(["browser"]);
  });

  it("returns ['node', 'browser'] for neutral target", () => {
    expect(toTypecheckEnvs("neutral")).toEqual(["node", "browser"]);
  });

  it("returns ['node', 'browser'] for undefined target", () => {
    expect(toTypecheckEnvs(undefined)).toEqual(["node", "browser"]);
  });
});

//#endregion
