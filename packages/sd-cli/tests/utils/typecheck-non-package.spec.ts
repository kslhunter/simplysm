import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  parseTsconfig: vi.fn(),
  createIncrementalCompilerHost: vi.fn(),
  createIncrementalProgram: vi.fn(),
  serializeDiagnostic: vi.fn((d: any) => d),
}));

vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: mocks.parseTsconfig,
}));

vi.mock("../../src/utils/typecheck-serialization", () => ({
  serializeDiagnostic: mocks.serializeDiagnostic,
}));

vi.mock("typescript", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  const origDefault = (orig["default"] ?? orig) as Record<string, unknown>;
  return {
    ...orig,
    default: {
      ...origDefault,
      createIncrementalCompilerHost: mocks.createIncrementalCompilerHost,
      createIncrementalProgram: mocks.createIncrementalProgram,
      DiagnosticCategory: { Error: 1, Warning: 0 },
    },
  };
});

const { typecheckNonPackageFiles } = await import("../../src/utils/typecheck-non-package");

describe("typecheckNonPackageFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.parseTsconfig.mockReturnValue({
      fileNames: [
        "/project/vitest.config.ts",
        "/project/packages/core/src/index.ts",
        "/project/packages/core/vitest.config.ts",
      ],
      options: { strict: true },
      errors: [],
    });

    mocks.createIncrementalCompilerHost.mockReturnValue({});

    const mockProgram = {
      emit: vi.fn(() => ({ diagnostics: [] })),
      getConfigFileParsingDiagnostics: vi.fn(() => []),
      getSyntacticDiagnostics: vi.fn(() => []),
      getOptionsDiagnostics: vi.fn(() => []),
      getGlobalDiagnostics: vi.fn(() => []),
      getSemanticDiagnostics: vi.fn(() => []),
    };
    mocks.createIncrementalProgram.mockReturnValue(mockProgram);
  });

  it("returns success when no diagnostics", () => {
    const result = typecheckNonPackageFiles("/project");

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("excludes diagnostics from package source files", () => {
    const pkgSourceDiag = {
      category: 1,
      code: 2322,
      messageText: "Type error in package source",
      file: { fileName: "/project/packages/core/src/index.ts" },
      start: 0,
    };
    const mockProgram = {
      emit: vi.fn(() => ({ diagnostics: [] })),
      getConfigFileParsingDiagnostics: vi.fn(() => []),
      getSyntacticDiagnostics: vi.fn(() => []),
      getOptionsDiagnostics: vi.fn(() => []),
      getGlobalDiagnostics: vi.fn(() => []),
      getSemanticDiagnostics: vi.fn(() => [pkgSourceDiag]),
    };
    mocks.createIncrementalProgram.mockReturnValue(mockProgram);

    const result = typecheckNonPackageFiles("/project");

    expect(result.diagnostics).toHaveLength(0);
    expect(result.errorCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it("includes diagnostics from package root config files", () => {
    const configDiag = {
      category: 1,
      code: 2322,
      messageText: "Type error in config",
      file: { fileName: "/project/packages/core/vitest.config.ts" },
      start: 0,
    };
    const mockProgram = {
      emit: vi.fn(() => ({ diagnostics: [] })),
      getConfigFileParsingDiagnostics: vi.fn(() => []),
      getSyntacticDiagnostics: vi.fn(() => []),
      getOptionsDiagnostics: vi.fn(() => []),
      getGlobalDiagnostics: vi.fn(() => []),
      getSemanticDiagnostics: vi.fn(() => [configDiag]),
    };
    mocks.createIncrementalProgram.mockReturnValue(mockProgram);

    const result = typecheckNonPackageFiles("/project");

    expect(result.diagnostics).toHaveLength(1);
    expect(result.errorCount).toBe(1);
    expect(result.success).toBe(false);
  });

  it("reports errors from diagnostics", () => {
    const mockDiag = { category: 1, code: 2322, messageText: "Type error", file: null, start: null };
    const mockProgram = {
      emit: vi.fn(() => ({ diagnostics: [] })),
      getConfigFileParsingDiagnostics: vi.fn(() => []),
      getSyntacticDiagnostics: vi.fn(() => []),
      getOptionsDiagnostics: vi.fn(() => []),
      getGlobalDiagnostics: vi.fn(() => []),
      getSemanticDiagnostics: vi.fn(() => [mockDiag]),
    };
    mocks.createIncrementalProgram.mockReturnValue(mockProgram);

    const result = typecheckNonPackageFiles("/project");

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(1);
  });
});
