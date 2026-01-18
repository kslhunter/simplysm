import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// 모킹 데이터 저장용 전역 객체
const mockState = {
  lintResults: [] as Array<{ errorCount: number; warningCount: number }>,
  lintedFiles: [] as string[],
  outputFixesCalled: false,
};

const mockJitiImportFn = vi.fn();

// 외부 의존성 모킹
vi.mock("glob", () => ({
  glob: vi.fn(),
}));

vi.mock("eslint", () => {
  // 호이스팅된 환경에서 mockState를 참조하기 위해 함수 형태로 접근
  const getMockState = () => (globalThis as { __mockState?: typeof mockState }).__mockState;

  class MockESLint {
    lintFiles(files: string[]) {
      const state = getMockState();
      if (state) {
        state.lintedFiles = files;
      }
      return Promise.resolve(state?.lintResults ?? []);
    }
    loadFormatter() {
      return Promise.resolve({
        format: () => Promise.resolve(""),
      });
    }
    static outputFixes(_results: unknown) {
      const state = getMockState();
      if (state) {
        state.outputFixesCalled = true;
      }
    }
  }

  return { ESLint: MockESLint };
});

vi.mock("@simplysm/core-node", () => ({
  FsUtils: {
    exists: vi.fn(),
  },
  PathUtils: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
  },
}));

vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: (configPath: string) => {
      const getMockJiti = () => (globalThis as { __mockJitiImportFn?: typeof mockJitiImportFn }).__mockJitiImportFn;
      return getMockJiti()?.(configPath);
    },
  })),
}));

vi.mock("pino", () => ({
  default: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    text: "",
  })),
}));

import { glob } from "glob";
import { FsUtils } from "@simplysm/core-node";
import { runLint } from "../src/commands/lint";

describe("runLint", () => {
  let originalExitCode: typeof process.exitCode;
  let originalCwd: () => string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalExitCode = process.exitCode;
    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue("/project");

    // 전역 상태 초기화
    mockState.lintResults = [];
    mockState.lintedFiles = [];
    mockState.outputFixesCalled = false;

    // globalThis에 상태 노출 (호이스팅된 모킹에서 접근 가능하도록)
    (globalThis as { __mockState?: typeof mockState }).__mockState = mockState;
    (globalThis as { __mockJitiImportFn?: typeof mockJitiImportFn }).__mockJitiImportFn = mockJitiImportFn;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    process.cwd = originalCwd;
    delete (globalThis as { __mockState?: typeof mockState }).__mockState;
    delete (globalThis as { __mockJitiImportFn?: typeof mockJitiImportFn }).__mockJitiImportFn;
  });

  it("린트 에러 발생 시 exitCode를 1로 설정", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 2, warningCount: 0 }];

    await runLint({ targets: [], fix: false, timing: false, debug: false });

    expect(process.exitCode).toBe(1);
  });

  it("린트 에러 없으면 exitCode 설정하지 않음", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({ targets: [], fix: false, timing: false, debug: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("targets 옵션으로 파일 필터링", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue([
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-node/src/index.ts",
      "/project/packages/cli/src/index.ts",
    ]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({
      targets: ["packages/core-common"],
      fix: false,
      timing: false,
      debug: false,
    });

    expect(mockState.lintedFiles).toHaveLength(1);
    expect(mockState.lintedFiles[0]).toContain("core-common");
  });

  it("fix 옵션 활성화 시 ESLint.outputFixes 호출", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    await runLint({ targets: [], fix: true, timing: false, debug: false });

    expect(mockState.outputFixesCalled).toBe(true);
  });

  it("린트할 파일이 없으면 조기 종료", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue([]);

    await runLint({ targets: [], fix: false, timing: false, debug: false });

    // ESLint가 호출되지 않으므로 lintedFiles는 빈 배열 유지
    expect(mockState.lintedFiles).toHaveLength(0);
    expect(process.exitCode).toBeUndefined();
  });

  it("ESLint 설정 파일이 없으면 exitCode 1 설정", async () => {
    // 모든 설정 파일이 없는 경우
    vi.mocked(FsUtils.exists).mockReturnValue(false);

    await runLint({ targets: [], fix: false, timing: false, debug: false });

    expect(process.exitCode).toBe(1);
    // ESLint가 호출되지 않음
    expect(mockState.lintedFiles).toHaveLength(0);
  });

  it("warning만 있는 경우 exitCode 설정 안함", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 3 }];

    await runLint({ targets: [], fix: false, timing: false, debug: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("timing 옵션 활성화 시 TIMING 환경변수 설정", async () => {
    const cwd = "/project";
    vi.mocked(FsUtils.exists).mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }],
    });

    vi.mocked(glob).mockResolvedValue(["/project/src/index.ts"]);

    mockState.lintResults = [{ errorCount: 0, warningCount: 0 }];

    const originalTiming = process.env["TIMING"];

    await runLint({ targets: [], fix: false, timing: true, debug: false });

    expect(process.env["TIMING"]).toBe("1");

    // cleanup
    if (originalTiming === undefined) {
      delete process.env["TIMING"];
    } else {
      process.env["TIMING"] = originalTiming;
    }
  });
});
