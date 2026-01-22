import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import "@simplysm/core-common"; // Map.getOrCreate 확장 메서드 사용을 위해 import

// 외부 의존성 모킹
vi.mock("typescript", () => {
  const DiagnosticCategory = {
    Error: 1,
    Warning: 0,
  };
  return {
    default: {
      sys: {
        readFile: vi.fn(),
        newLine: "\n",
      },
      readConfigFile: vi.fn(),
      parseJsonConfigFileContent: vi.fn(),
      createIncrementalProgram: vi.fn(),
      getPreEmitDiagnostics: vi.fn(),
      formatDiagnosticsWithColorAndContext: vi.fn(),
      sortAndDeduplicateDiagnostics: vi.fn(),
      createSourceFile: vi.fn().mockReturnValue({}),
      ScriptTarget: { Latest: 99 },
      ScriptKind: { TS: 3 },
      DiagnosticCategory,
    },
  };
});

vi.mock("@simplysm/core-node", () => {
  const posix = (p: string) => p.replace(/\\/g, "/");
  const isChildPath = (child: string, parent: string) => {
    if (child === parent) return false;
    const parentWithSlash = parent.endsWith("/") ? parent : parent + "/";
    return child.startsWith(parentWithSlash);
  };
  return {
    FsUtils: {
      exists: vi.fn(),
      readJsonAsync: vi.fn(),
    },
    PathUtils: {
      posix: vi.fn(posix),
      isChildPath: vi.fn(isChildPath),
      filterByTargets: vi.fn((files: string[], targets: string[], cwd: string) => {
        if (targets.length === 0) return files;
        return files.filter((file) => {
          const relativePath = posix(file.replace(cwd + "/", ""));
          return targets.some(
            (target) => relativePath === target || isChildPath(relativePath, target),
          );
        });
      }),
    },
    SdWorker: class MockSdWorker {
      async run(_method: string, params: unknown[]) {
        // Worker에서 타입체크를 시뮬레이션
        const taskInfo = params[0] as { name: string; files: string[] };
        return {
          taskName: taskInfo.name,
          diagnostics: [],
          hasErrors: false,
        };
      }
      async killAsync() {}
    },
  };
});

vi.mock("pino", () => ({
  default: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

// listr2 모킹 - 순차적으로 모든 task를 실행
vi.mock("listr2", () => ({
  Listr: class MockListr {
    private tasks: Array<{ task: () => Promise<void> }>;
    constructor(tasks: Array<{ task: () => Promise<void> }>) {
      this.tasks = tasks;
    }
    async run() {
      for (const t of this.tasks) {
        await t.task();
      }
    }
  },
}));

const mockJitiImport = vi.fn();
vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: mockJitiImport,
  })),
}));

import ts from "typescript";
import { FsUtils } from "@simplysm/core-node";
import { runTypecheck } from "../src/commands/typecheck";

describe("runTypecheck", () => {
  let originalExitCode: typeof process.exitCode;
  let originalCwd: () => string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalExitCode = process.exitCode;
    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue("/project");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    process.cwd = originalCwd;
  });

  it("타입체크할 파일이 없으면 조기 종료", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2022"], types: [] },
      fileNames: [],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("tsconfig.json 로드 실패 시 exitCode를 1로 설정", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      error: {
        category: ts.DiagnosticCategory.Error,
        messageText: "Failed to read tsconfig.json",
      } as ts.Diagnostic,
    });

    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBe(1);
  });

  it("tsconfig.json 파싱 실패 시 exitCode를 1로 설정", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: {},
      fileNames: [],
      errors: [
        { category: ts.DiagnosticCategory.Error, messageText: "Parse error" },
      ],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBe(1);
  });

  it("targets 옵션으로 파일 필터링", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2022"], types: [] },
      fileNames: [
        "/project/packages/core-common/src/index.ts",
        "/project/packages/core-node/src/index.ts",
        "/project/packages/cli/src/index.ts",
      ],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(FsUtils.exists).mockReturnValue(false);
    vi.mocked(FsUtils.readJsonAsync).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    await runTypecheck({
      targets: ["packages/core-common"],
      debug: false,
    });

    // Worker를 통해 실행되므로 exitCode가 설정되지 않아야 함
    expect(process.exitCode).toBeUndefined();
  });

  it("sd.config.ts 로드 실패 시 기본값 사용하여 계속 진행", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2022"], types: [] },
      fileNames: ["/project/sd.config.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(FsUtils.exists).mockReturnValue(false);

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // sd.config.ts 로드 실패해도 에러 없이 진행되어야 함
    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("sd.config.ts의 default export가 함수가 아닌 경우 기본값 사용", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2022"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(FsUtils.exists).mockReturnValue(false);
    vi.mocked(FsUtils.readJsonAsync).mockResolvedValue({ devDependencies: {} });

    // sd.config.ts의 default export가 함수가 아닌 객체인 경우
    mockJitiImport.mockResolvedValue({
      default: { packages: {} }, // 함수가 아닌 객체
    });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // 에러 없이 기본값으로 진행되어야 함
    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("sd.config.ts에 default export가 없는 경우 기본값 사용", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2022"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(FsUtils.exists).mockReturnValue(false);
    vi.mocked(FsUtils.readJsonAsync).mockResolvedValue({ devDependencies: {} });

    // sd.config.ts에 default export가 없는 경우
    mockJitiImport.mockResolvedValue({
      someOtherExport: () => ({}),
    });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // 에러 없이 기본값으로 진행되어야 함
    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
  });

  it("복수 패키지 타입체크", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2022", "DOM"], types: [] },
      fileNames: [
        "/project/packages/core-node/src/index.ts",
        "/project/packages/core-browser/src/index.ts",
        "/project/packages/core-common/src/index.ts",
      ],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(FsUtils.exists).mockReturnValue(false);
    vi.mocked(FsUtils.readJsonAsync).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
  });
});
