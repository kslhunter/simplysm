import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import "@simplysm/core-common"; // Import to use Map.getOrCreate extension method

// Mock external dependencies
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

  // Mock worker proxy - provides build and terminate methods
  const createMockWorkerProxy = () => ({
    build: vi.fn(() =>
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
        return targets.some(
          (target) => relativePath === target || isChildPath(relativePath, target),
        );
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

const mockJitiImport = vi.fn();
vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: mockJitiImport,
  })),
}));

import path from "path";
import ts from "typescript";
import { fsExists, fsReadJson } from "@simplysm/core-node";
import { runTypecheck } from "../src/commands/typecheck";

/**
 * Create mock parsed tsconfig
 */
function createMockParsedCommandLine(overrides: Partial<ts.ParsedCommandLine> = {}): ts.ParsedCommandLine {
  return {
    options: {},
    fileNames: [],
    errors: [],
    ...overrides,
  } as ts.ParsedCommandLine;
}

/**
 * Create mock diagnostic
 */
function createMockDiagnostic(overrides: Partial<ts.Diagnostic> = {}): ts.Diagnostic {
  return {
    file: undefined,
    start: 0,
    length: 0,
    messageText: "test error",
    category: 1,
    code: 0,
    ...overrides,
  } as ts.Diagnostic;
}

/**
 * Create mock diagnostic array
 */
function createMockDiagnosticArray(diagnostics: ts.Diagnostic[] = []): ts.SortedReadonlyArray<ts.Diagnostic> {
  return diagnostics as ts.SortedReadonlyArray<ts.Diagnostic>;
}

/**
 * Create mock Worker
 */
function createMockWorker<T extends Record<string, unknown>>(overrides?: Partial<T>): any {
  return {
    on: vi.fn(),
    send: vi.fn(),
    terminate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

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

  it("exits early when no files to typecheck", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: { lib: ["ES2024"], types: [] },
        fileNames: [],
        errors: [],
      }),
    );

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBeUndefined();
  });

  it("sets exitCode to 1 when tsconfig.json fails to load", async () => {
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

  it("sets exitCode to 1 when tsconfig.json fails to parse", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: {},
        fileNames: [],
        errors: [{ category: ts.DiagnosticCategory.Error, messageText: "Parse error" }],
      }),
    );

    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBe(1);
  });

  it("filters files using targets option", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: { lib: ["ES2024"], types: [] },
        fileNames: [
          "/project/packages/core-common/src/index.ts",
          "/project/packages/core-node/src/index.ts",
          "/project/packages/cli/src/index.ts",
        ],
        errors: [],
      }),
    );

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      createMockDiagnosticArray([]),
    );

    await runTypecheck({
      targets: ["packages/core-common"],
      options: [],
    });

    // Runs via Worker, so exitCode should not be set
    expect(process.exitCode).toBeUndefined();
  });

  it("filters files using targets option (including tests)", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: { lib: ["ES2024"], types: [] },
        fileNames: [
          "/project/packages/core-common/src/index.ts",
          "/project/packages/core-common/tests/utils.spec.ts",
          "/project/packages/core-node/src/index.ts",
          "/project/packages/cli/src/index.ts",
        ],
        errors: [],
      }),
    );

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    const { Worker } = await import("@simplysm/core-node");
    const mockBuildDts = vi.fn(() =>
      Promise.resolve({
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
      }),
    );
    vi.mocked(Worker.create).mockReturnValue(
      createMockWorker({
        build: mockBuildDts,
        terminate: vi.fn(() => Promise.resolve()),
      }),
    );

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      createMockDiagnosticArray([]),
    );

    await runTypecheck({
      targets: ["packages/core-common"],
      options: [],
    });

    // Call buildDts only for core-common package
    expect(mockBuildDts).toHaveBeenCalledTimes(2); // neutral: node + browser
    for (const call of mockBuildDts.mock.calls as unknown[][]) {
      expect((call[0] as { name: string }).name).toBe("core-common");
    }
  });

  it("continues with default value when sd.config.ts fails to load", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({
      config: {},
    });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: { lib: ["ES2024"], types: [] },
        fileNames: ["/project/sd.config.ts"],
        errors: [],
      }),
    );

    vi.mocked(fsExists).mockResolvedValue(false);

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      createMockDiagnosticArray([]),
    );

    // Should proceed without error even if sd.config.ts fails to load
    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBeUndefined();
  });

  it("sets exitCode to 1 when typecheck errors occur", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: { lib: ["ES2024"], types: [] },
        fileNames: ["/project/packages/core-common/src/index.ts"],
        errors: [],
      }),
    );

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    // Mock Worker to return error results
    const { Worker } = await import("@simplysm/core-node");
    vi.mocked(Worker.create).mockReturnValue(
      createMockWorker({
        build: vi.fn(() =>
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
      }),
    );

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      createMockDiagnosticArray([]),
    );
    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("");

    await runTypecheck({ targets: [], options: [] });

    expect(process.exitCode).toBe(1);
  });

  it("creates other task when non-package files (like tests/) are included", async () => {
    vi.mocked(ts.readConfigFile).mockReturnValue({ config: {} });

    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(
      createMockParsedCommandLine({
        options: { lib: ["ES2024"], types: [] },
        fileNames: ["/project/packages/core-node/src/index.ts", "/project/tests/orm/some-test.ts"],
        errors: [],
      }),
    );

    vi.mocked(fsExists).mockResolvedValue(false);
    // Set core-node as node target package
    vi.mocked(fsReadJson).mockImplementation((filePath: string) => {
      if (filePath.includes("core-node")) {
        return Promise.resolve({ name: "@simplysm/core-node" });
      }
      return Promise.resolve({ devDependencies: {} });
    });

    // Mock sd.config.ts: set core-node as node target
    mockJitiImport.mockResolvedValue({
      default: () => ({
        packages: {
          "core-node": { target: "node" },
        },
      }),
    });

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      createMockDiagnosticArray([]),
    );

    const { Worker } = await import("@simplysm/core-node");
    const mockBuildDts = vi.fn(() =>
      Promise.resolve({
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
      }),
    );
    vi.mocked(Worker.create).mockReturnValue(
      createMockWorker({
        build: mockBuildDts,
        terminate: vi.fn(() => Promise.resolve()),
      }),
    );

    await runTypecheck({ targets: [], options: [] });

    // Verify buildDts call
    expect(mockBuildDts).toHaveBeenCalled();

    // Other task: called without pkgDir/env
    const calls = mockBuildDts.mock.calls as unknown[][];
    const nonPkgCall = calls.find((call) => (call[0] as { name: string }).name === "root");
    expect(nonPkgCall).toBeDefined();
    expect((nonPkgCall![0] as { pkgDir?: string }).pkgDir).toBeUndefined();
    expect((nonPkgCall![0] as { env?: string }).env).toBeUndefined();

    // core-node package task also exists
    const pkgCall = calls.find((call) => (call[0] as { name: string }).name === "core-node");
    expect(pkgCall).toBeDefined();
  });

});

describe("executeTypecheck", () => {
  const cwd = "/project";
  let originalExitCode: typeof process.exitCode;
  let originalCwd: () => string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalExitCode = process.exitCode;
    originalCwd = process.cwd;
    process.cwd = vi.fn().mockReturnValue(cwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    process.cwd = originalCwd;
  });

  it("returns success result when no errors", async () => {
    const { executeTypecheck } = await import("../src/commands/typecheck");
    const { Worker } = await import("@simplysm/core-node");

    vi.mocked(ts.readConfigFile).mockReturnValue({ config: { compilerOptions: {} } });
    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      fileNames: [path.resolve(cwd, "packages/core-common/src/index.ts")],
      options: {},
      errors: [],
    } as never);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    vi.mocked(Worker.create).mockReturnValue(
      createMockWorker({
        build: vi.fn(() =>
          Promise.resolve({
            success: true,
            diagnostics: [],
            errorCount: 0,
            warningCount: 0,
          }),
        ),
        terminate: vi.fn(() => Promise.resolve()),
      }),
    );

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockReturnValue(
      createMockDiagnosticArray([]),
    );

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    // executeTypecheck should not set process.exitCode
    expect(process.exitCode).toBeUndefined();
  });

  it("returns failure result without setting exitCode when errors exist", async () => {
    const { executeTypecheck } = await import("../src/commands/typecheck");
    const { Worker } = await import("@simplysm/core-node");

    vi.mocked(ts.readConfigFile).mockReturnValue({ config: { compilerOptions: {} } });
    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      fileNames: [path.resolve(cwd, "packages/core-common/src/index.ts")],
      options: {},
      errors: [],
    } as never);

    vi.mocked(fsExists).mockResolvedValue(false);
    vi.mocked(fsReadJson).mockResolvedValue({ devDependencies: {} });

    // Mock worker to return error results
    vi.mocked(Worker.create).mockReturnValue(
      createMockWorker({
        build: vi.fn(() =>
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
      }),
    );

    vi.mocked(ts.sortAndDeduplicateDiagnostics).mockImplementation(
      (diagnostics) => diagnostics as ts.SortedReadonlyArray<ts.Diagnostic>,
    );
    vi.mocked(ts.formatDiagnosticsWithColorAndContext).mockReturnValue("error output");

    const result = await executeTypecheck({ targets: [], options: [] });

    expect(result.success).toBe(false);
    // core-common is neutral, so creates 2 tasks (node + browser), each with errorCount 1
    expect(result.errorCount).toBe(2);
    expect(result.formattedOutput).toBe("error output");
    // executeTypecheck should not set process.exitCode
    expect(process.exitCode).toBeUndefined();
  });

});
