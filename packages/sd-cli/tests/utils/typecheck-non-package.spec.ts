import { describe, it, expect, vi, beforeEach } from "vitest";

// typescript default export는 ESM에서 spyOn 불가 (Cannot redefine property) — vi.mock 유지
const tsMocks = vi.hoisted(() => ({
  createIncrementalCompilerHost: vi.fn(),
  createIncrementalProgram: vi.fn(),
}));

vi.mock("typescript", async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  const origDefault = (orig["default"] ?? orig) as Record<string, unknown>;
  return {
    ...orig,
    default: {
      ...origDefault,
      createIncrementalCompilerHost: tsMocks.createIncrementalCompilerHost,
      createIncrementalProgram: tsMocks.createIncrementalProgram,
      DiagnosticCategory: { Error: 1, Warning: 0 },
    },
  };
});

import * as tsconfigMod from "../../src/utils/tsconfig";
import * as typecheckSerializationMod from "../../src/typecheck/typecheck-serialization";

import { typecheckNonPackageFiles } from "../../src/typecheck/typecheck-non-package";

const mocks = {
  parseTsconfig: undefined as unknown as ReturnType<typeof vi.spyOn>,
  createIncrementalCompilerHost: tsMocks.createIncrementalCompilerHost,
  createIncrementalProgram: tsMocks.createIncrementalProgram,
  serializeDiagnostic: undefined as unknown as ReturnType<typeof vi.spyOn>,
};

describe("typecheckNonPackageFiles", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    mocks.parseTsconfig = vi.spyOn(tsconfigMod, "parseTsconfig");
    mocks.serializeDiagnostic = vi.spyOn(typecheckSerializationMod, "serializeDiagnostic")
      .mockImplementation((d: any) => d);
    mocks.createIncrementalCompilerHost.mockReset();
    mocks.createIncrementalProgram.mockReset();

    mocks.parseTsconfig.mockReturnValue({
      fileNames: [
        "/project/vitest.config.ts",
        "/project/packages/core/src/index.ts",
        "/project/packages/core/vitest.config.ts",
      ],
      options: { strict: true },
      errors: [],
    });

    mocks.createIncrementalCompilerHost.mockReturnValue({} as any);

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
