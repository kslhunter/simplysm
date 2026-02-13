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

  // Worker proxy 모킹 - buildDts 메서드와 terminate 메서드 제공
  const createMockWorkerProxy = () => ({
    buildDts: vi.fn(() =>
      Promise.resolve({
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
      }),
    ),
    terminate: vi.fn(() => Promise.resolve()),
  });

  return {
    fsExists: vi.fn(),
    fsExistsSync: vi.fn(() => false),
    fsReadJson: vi.fn(),
    fsReadSync: vi.fn(() => ""),
    pathPosix: vi.fn(posix),
    pathIsChildPath: vi.fn(isChildPath),
    pathFilterByTargets: vi.fn((files: string[], targets: string[], cwd: string) => {
      if (targets.length === 0) return files;
      return files.filter((file) => {
        const relativePath = posix(file.replace(cwd + "/", ""));
        return targets.some((target) => relativePath === target || isChildPath(relativePath, target));
      });
    }),
    Worker: {
      create: vi.fn(() => createMockWorkerProxy()),
    },
  };
});

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
    default: mockLogger,
    LogLevels: { debug: 4, info: 3, warn: 2, error: 1 },
  };
});

// listr2 모킹 - 모든 task Promise를 병렬로 실행하여 교착 상태 방지
vi.mock("listr2", () => ({
  Listr: class MockListr {
    private readonly tasks: Array<{ task: () => Promise<void> }>;
    constructor(tasks: Array<{ task: () => Promise<void> }>) {
      this.tasks = tasks;
    }
    async run() {
      // 모든 task를 병렬로 시작 (worker가 완료될 때 resolve됨)
      await Promise.all(this.tasks.map((t) => t.task()));
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
import { fsExists, fsReadJson } from "@simplysm/core-node";
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
      options: { lib: ["ES2024"], types: [] },
      fileNames: [],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    await runTypecheck({ targets: [], options: [] });

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

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBe(1);
  });

  it("tsconfig.json 파싱 실패 시 exitCode를 1로 설정", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: {},
      fileNames: [],
      errors: [{ category: ts.DiagnosticCategory.Error, messageText: "Parse error" }],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBe(1);
  });

  it("targets 옵션으로 파일 필터링", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: [
        "/project/packages/core-common/src/index.ts",
        "/project/packages/core-node/src/index.ts",
        "/project/packages/cli/src/index.ts",
      ],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    await runTypecheck({
      targets: ["packages/core-common"],
      options: [],
    });

    // Worker를 통해 실행되므로 exitCode가 설정되지 않아야 함
    expect(process.exitCode).toBeUndefined();
  });

  it("sd.config.ts 로드 실패 시 기본값 사용하여 계속 진행", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/sd.config.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // sd.config.ts 로드 실패해도 에러 없이 진행되어야 함
    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBeUndefined();
  });

  it("sd.config.ts의 default export가 함수가 아닌 경우 기본값 사용", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    // sd.config.ts의 default export가 함수가 아닌 객체인 경우
    mockJitiImport.mockResolvedValue({
      default: { packages: {} }, // 함수가 아닌 객체
    });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // 에러 없이 기본값으로 진행되어야 함
    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBeUndefined();
  });

  it("sd.config.ts에 default export가 없는 경우 기본값 사용", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    // sd.config.ts에 default export가 없는 경우
    mockJitiImport.mockResolvedValue({
      someOtherExport: () => ({}),
    });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // 에러 없이 기본값으로 진행되어야 함
    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBeUndefined();
  });

  it("복수 패키지 타입체크", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024", "DOM"], types: [] },
      fileNames: [
        "/project/packages/core-node/src/index.ts",
        "/project/packages/core-browser/src/index.ts",
        "/project/packages/core-common/src/index.ts",
      ],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBeUndefined();
  });

  it("타입체크 에러 발생 시 exitCode를 1로 설정", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    // Worker가 에러 결과를 반환하도록 모킹
    const { Worker } = await import("@simplysm/core-node");
    vi.mocked(Worker.create).mockReturnValue({
      buildDts: vi.fn(() =>
        Promise.resolve({
          success: false,
          diagnostics: [
            {
              category: 1,
              code: 2322,
              messageText: "Type error",
              fileName: "/project/packages/core-common/src/index.ts",
            },
          ],
          errorCount: 1,
          warningCount: 0,
        }),
      ),
      terminate: vi.fn(() => Promise.resolve()),
    } as unknown as ReturnType<typeof Worker.create>);

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);
    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBe(1);
  });

  it("non-package 파일(tests/ 등)이 포함된 경우 기타 task 생성", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/packages/core-node/src/index.ts", "/project/tests/orm/some-test.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    // core-node는 node 타겟 패키지로 설정
    vi.mocked(fsReadJson).mockImplementation((filePath: string) => {
      if (filePath.includes("core-node")) {
        return Promise.resolve({ name: "@simplysm/core-node" });
      }
      return Promise.resolve({ devDependencies: {} });
    });

    // sd.config.ts 모킹: core-node를 node 타겟으로 설정
    mockJitiImport.mockResolvedValue({
      default: () => ({
        packages: {
          "core-node": { target: "node" },
        },
      }),
    });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    const { Worker } = await import("@simplysm/core-node");
    const mockBuildDts = vi.fn(() =>
      Promise.resolve({
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
      }),
    );
    vi.mocked(Worker.create).mockReturnValue({
      buildDts: mockBuildDts,
      terminate: vi.fn(() => Promise.resolve()),
    } as unknown as ReturnType<typeof Worker.create>);

    await runTypecheck({ targets: [], options: [] });

    // buildDts 호출 확인
    expect(mockBuildDts).toHaveBeenCalled();

    // 기타 task: pkgDir/env 없이 호출
    const nonPkgCall = mockBuildDts.mock.calls.find((call) => (call[0] as { name: string }).name === "root");
    expect(nonPkgCall).toBeDefined();
    expect((nonPkgCall![0] as { pkgDir?: string }).pkgDir).toBeUndefined();
    expect((nonPkgCall![0] as { env?: string }).env).toBeUndefined();

    // core-node 패키지 task도 존재
    const pkgCall = mockBuildDts.mock.calls.find((call) => (call[0] as { name: string }).name === "core-node");
    expect(pkgCall).toBeDefined();
  });

  it("packages/ 파일만 있으면 기타 task 생성 안 함", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: { lib: ["ES2024"], types: [] },
      fileNames: ["/project/packages/core-common/src/index.ts"],
      errors: [],
    } as unknown as ts.ParsedCommandLine);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    const { Worker } = await import("@simplysm/core-node");
    const mockBuildDts = vi.fn(() =>
      Promise.resolve({
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
      }),
    );
    vi.mocked(Worker.create).mockReturnValue({
      buildDts: mockBuildDts,
      terminate: vi.fn(() => Promise.resolve()),
    } as unknown as ReturnType<typeof Worker.create>);

    await runTypecheck({ targets: [], options: [] });

    // buildDts 호출에 name="root"인 것이 없어야 함
    const nonPkgCall = mockBuildDts.mock.calls.find((call) => (call[0] as { name: string }).name === "root");
    expect(nonPkgCall).toBeUndefined();
  });
});
