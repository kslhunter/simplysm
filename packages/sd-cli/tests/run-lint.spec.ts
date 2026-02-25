import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// State management hoisted via vi.hoisted
const { mockState, mockJitiImportFn } = vi.hoisted(() => ({
  mockState: {
    lintResults: [] as Array<{ errorCount: number; warningCount: number }>,
    lintedFiles: [] as string[],
    outputFixesCalled: false,
  },
  mockJitiImportFn: vi.fn(),
}));

// 외부 의존성 모킹

vi.mock("eslint", () => {
  class MockESLint {
    lintFiles(files: string[]) {
      mockState.lintedFiles = files;
      return Promise.resolve(mockState.lintResults);
    }
    loadFormatter() {
      return Promise.resolve({
        format: () => Promise.resolve(""),
      });
    }
    static outputFixes(_results: unknown) {
      mockState.outputFixesCalled = true;
    }
  }

  return { ESLint: MockESLint };
});

vi.mock("@simplysm/core-node", () => {
  const posix = (p: string) => p.replace(/\\/g, "/");
  const isChildPath = (child: string, parent: string) => {
    if (child === parent) return false;
    const parentWithSlash = parent.endsWith("/") ? parent : parent + "/";
    return child.startsWith(parentWithSlash);
  };
  return {
    fsExists: vi.fn(),
    fsGlob: vi.fn(),
    pathPosix: vi.fn(posix),
    pathIsChildPath: vi.fn(isChildPath),
    pathFilterByTargets: vi.fn((files: string[], targets: string[], cwd: string) => {
      if (targets.length === 0) return files;
      return files.filter((file) => {
        const relativePath = posix(file.replace(cwd + "/", ""));
        return targets.some(
          (target) => relativePath === target || isChildPath(relativePath, target),
        );
      });
    }),
  };
});

vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: (configPath: string) => mockJitiImportFn(configPath),
  })),
}));

vi.mock("consola", () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    start: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    withTag: vi.fn(() => mockLogger),
    level: 3, // info level
  };
  return {
    consola: mockLogger,
    default: mockLogger,
    LogLevels: { debug: 4, info: 3, warn: 2, error: 1 },
  };
});

import { fsExists, fsGlob } from "@simplysm/core-node";
import { runLint, executeLint } from "../src/commands/lint";

describe("runLint", () => {
  let originalExitCode: typeof process.exitCode;
  let originalCwd: () => string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalExitCode = process.exitCode;
    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue("/project");

    // 상태 초기화
    mockState.lintResults = [];
    mockState.lintedFiles = [];
    mockState.outputFixesCalled = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    process.cwd = originalCwd;
  });

  it("sets exitCode to 1 when lint errors occur", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 2, warningCount: 0 }];

    await runLint({ targets: [], fix: false, timing: false });

    expect(process.exitCode).toBe(1);
  });

  it("does not set exitCode when no lint errors", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({ targets: [], fix: false, timing: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("filters files using targets option", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue([
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-node/src/index.ts",
      "/project/packages/cli/src/index.ts",
    ]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({
      targets: ["packages/core-common"],
      fix: false,
      timing: false,
    });

    expect(mockState.lintedFiles).toHaveLength(1);
    expect(mockState.lintedFiles[0]).toContain("core-common");
  });

  it("filters files from all paths when multiple targets specified", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue([
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-node/src/index.ts",
      "/project/packages/cli/src/index.ts",
      "/project/tests/orm/src/test.spec.ts",
    ]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({
      targets: ["packages/core-common", "packages/cli"],
      fix: false,
      timing: false,
    });

    expect(mockState.lintedFiles).toHaveLength(2);
    expect(mockState.lintedFiles.some((f) => f.includes("core-common"))).toBe(true);
    expect(mockState.lintedFiles.some((f) => f.includes("cli"))).toBe(true);
    expect(mockState.lintedFiles.some((f) => f.includes("core-node"))).toBe(false);
    expect(mockState.lintedFiles.some((f) => f.includes("tests/orm"))).toBe(false);
  });

  it("calls ESLint.outputFixes when fix option is enabled", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({ targets: [], fix: true, timing: false });

    expect(mockState.outputFixesCalled).toBe(true);
  });

  it("exits early when no files to lint", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue([]);

    await runLint({ targets: [], fix: false, timing: false });

    // ESLint가 호출되지 않으므로 lintedFiles는 빈 배열 유지
    expect(mockState.lintedFiles).toHaveLength(0);
    expect(process.exitCode).toBeUndefined();
  });

  it("throws error when ESLint config file is not found", async () => {
    // When all config files are missing
    vi.mocked(fsExists).mockResolvedValue(false);

    await expect(runLint({ targets: [], fix: false, timing: false })).rejects.toThrow(
      "ESLint config file not found",
    );

    // Since error is thrown, exitCode must be set by caller (not set inside runLint)
    // ESLint is not called
    expect(mockState.lintedFiles).toHaveLength(0);
  });

  it("does not set exitCode when only warnings exist", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 3 }];

    await runLint({ targets: [], fix: false, timing: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("sets TIMING environment variable when timing option is enabled", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    const originalTiming = process.env["TIMING"];
    delete process.env["TIMING"];

    await runLint({ targets: [], fix: false, timing: true });

    // TIMING이 설정되었는지 확인 (함수 내에서 설정됨)
    expect(process.env["TIMING"]).toBe("1");

    // cleanup
    if (originalTiming !== undefined) {
      process.env["TIMING"] = originalTiming;
    } else {
      delete process.env["TIMING"];
    }
  });

  it("uses eslint.config.mts when eslint.config.ts is not found", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      // eslint.config.ts does not exist, only eslint.config.mts
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.mts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["dist/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({ targets: [], fix: false, timing: false });

    // Verify that mts file was loaded
    expect(mockJitiImportFn).toHaveBeenCalledWith(expect.stringContaining("eslint.config.mts"));
    expect(process.exitCode).toBeUndefined();
  });

  it("propagates error when glob fails", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(fsGlob).mockRejectedValue(new Error("Glob error"));

    await expect(runLint({ targets: [], fix: false, timing: false })).rejects.toThrow("Glob error");
  });
});

describe("executeLint", () => {
  let originalCwd: () => string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue("/project");

    // 상태 초기화
    mockState.lintResults = [];
    mockState.lintedFiles = [];
    mockState.outputFixesCalled = false;

    // 기본 ESLint 설정 mock
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });
    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.cwd = originalCwd;
  });

  it("returns success result when no errors", async () => {
    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];
    vi.mocked(fsGlob).mockResolvedValue(["/project/packages/core-common/src/index.ts"]);

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it("returns failure result when errors exist", async () => {
    mockState.lintResults = [{ errorCount: 2, warningCount: 1 }];
    vi.mocked(fsGlob).mockResolvedValue(["/project/packages/core-common/src/index.ts"]);

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(1);
  });

  it("includes formatter output in formattedOutput", async () => {
    mockState.lintResults = [{ errorCount: 1, warningCount: 0 }];
    vi.mocked(fsGlob).mockResolvedValue(["/project/packages/core-common/src/index.ts"]);

    const result = await executeLint({ targets: [], fix: false, timing: false });

    // MockESLint's formatter returns empty string, so formattedOutput is also empty string
    expect(result.formattedOutput).toBeDefined();
    expect(typeof result.formattedOutput).toBe("string");
  });

  it("returns success result when no files exist", async () => {
    vi.mocked(fsGlob).mockResolvedValue([]);

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });
});
