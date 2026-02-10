import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// vi.hoisted로 호이스팅된 상태 관리
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
        return targets.some((target) => relativePath === target || isChildPath(relativePath, target));
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
    withTag: vi.fn(() => mockLogger),
    level: 3, // info level
  };
  return {
    consola: mockLogger,
    createConsola: vi.fn(() => mockLogger),
    LogLevels: { debug: 4, info: 3, warn: 2, error: 1 },
  };
});

// listr2 모킹 - 순차적으로 모든 task를 실행하고 context 반환
vi.mock("listr2", () => ({
  Listr: class MockListr {
    private readonly tasks: Array<{
      title: string;
      task: (ctx: Record<string, unknown>, task: { title: string; skip: (msg: string) => void }) => Promise<void>;
      enabled?: (ctx: Record<string, unknown>) => boolean;
      skip?: (ctx: Record<string, unknown>) => boolean;
    }>;
    constructor(
      tasks: Array<{
        title: string;
        task: (ctx: Record<string, unknown>, task: { title: string; skip: (msg: string) => void }) => Promise<void>;
        enabled?: (ctx: Record<string, unknown>) => boolean;
        skip?: (ctx: Record<string, unknown>) => boolean;
      }>,
    ) {
      this.tasks = tasks;
    }
    async run() {
      const ctx: Record<string, unknown> = { files: [], results: [], ignorePatterns: [] };
      for (const t of this.tasks) {
        if (t.enabled && !t.enabled(ctx)) continue;
        if (t.skip && t.skip(ctx)) continue;
        const mockTask = { title: t.title, skip: () => {} };
        await t.task(ctx, mockTask);
      }
      return ctx;
    }
  },
}));

import { fsExists, fsGlob } from "@simplysm/core-node";
import { runLint } from "../src/commands/lint";

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

  it("린트 에러 발생 시 exitCode를 1로 설정", async () => {
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

  it("린트 에러 없으면 exitCode 설정하지 않음", async () => {
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

  it("targets 옵션으로 파일 필터링", async () => {
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

  it("여러 targets 지정 시 모든 경로의 파일 필터링", async () => {
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

  it("fix 옵션 활성화 시 ESLint.outputFixes 호출", async () => {
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

  it("린트할 파일이 없으면 조기 종료", async () => {
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

  it("ESLint 설정 파일이 없으면 에러를 throw한다", async () => {
    // 모든 설정 파일이 없는 경우
    vi.mocked(fsExists).mockResolvedValue(false);

    await expect(runLint({ targets: [], fix: false, timing: false })).rejects.toThrow(
      "ESLint 설정 파일을 찾을 수 없습니다",
    );

    // 에러가 throw되므로 exitCode는 호출자가 설정해야 함 (runLint 내부에서 설정하지 않음)
    // ESLint가 호출되지 않음
    expect(mockState.lintedFiles).toHaveLength(0);
  });

  it("warning만 있는 경우 exitCode 설정 안함", async () => {
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

  it("timing 옵션 활성화 시 TIMING 환경변수 설정", async () => {
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

  it("eslint.config.ts가 없고 eslint.config.mts만 있는 경우 mts 파일 사용", async () => {
    const cwd = "/project";
    vi.mocked(fsExists).mockImplementation((filePath: string) => {
      // eslint.config.ts는 없고 eslint.config.mts만 존재
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.mts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["dist/**"] }],
    });

    vi.mocked(fsGlob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({ targets: [], fix: false, timing: false });

    // mts 파일이 로드되었는지 확인
    expect(mockJitiImportFn).toHaveBeenCalledWith(expect.stringContaining("eslint.config.mts"));
    expect(process.exitCode).toBeUndefined();
  });

  it("glob 에러 발생 시 에러 전파", async () => {
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
