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
      DiagnosticCategory,
    },
  };
});

vi.mock("@simplysm/core-node", () => ({
  FsUtils: {
    exists: vi.fn(),
    readJsonAsync: vi.fn(),
  },
  PathUtils: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
  },
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

  it("타입체크 에러 발생 시 exitCode를 1로 설정", async () => {
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

    const mockProgram = {
      getProgram: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    vi.mocked(ts.createIncrementalProgram).mockReturnValue(mockProgram as unknown as ts.BuilderProgram);

    vi.mocked(ts.getPreEmitDiagnostics).mockReturnValue([
      { category: ts.DiagnosticCategory.Error, messageText: "Error" },
    ] as unknown as readonly ts.Diagnostic[]);

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);
    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBe(1);
  });

  it("타입체크 에러 없으면 exitCode 설정하지 않음", async () => {
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

    const mockProgram = {
      getProgram: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    vi.mocked(ts.createIncrementalProgram).mockReturnValue(mockProgram as unknown as ts.BuilderProgram);

    vi.mocked(ts.getPreEmitDiagnostics).mockReturnValue([]);
    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
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

    let checkedFiles: string[] = [];
    const mockProgram = {
      getProgram: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    vi.mocked(ts.createIncrementalProgram).mockImplementation((opts) => {
      checkedFiles.push(...opts.rootNames);
      return mockProgram as unknown as ts.BuilderProgram;
    });

    vi.mocked(ts.getPreEmitDiagnostics).mockReturnValue([]);
    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    await runTypecheck({
      targets: ["packages/core-common"],
      debug: false,
    });

    expect(checkedFiles).toHaveLength(1);
    expect(checkedFiles[0]).toContain("core-common");
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

    const mockCreateProgram = vi.mocked(ts.createIncrementalProgram);

    await runTypecheck({ targets: [], debug: false });

    expect(mockCreateProgram).not.toHaveBeenCalled();
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

    const mockProgram = {
      getProgram: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    vi.mocked(ts.createIncrementalProgram).mockReturnValue(mockProgram as unknown as ts.BuilderProgram);

    vi.mocked(ts.getPreEmitDiagnostics).mockReturnValue([]);
    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue([] as unknown as ts.SortedReadonlyArray<ts.Diagnostic>);

    // sd.config.ts 로드 실패해도 에러 없이 진행되어야 함
    await runTypecheck({ targets: [], debug: false });

    expect(process.exitCode).toBeUndefined();
  });
});
