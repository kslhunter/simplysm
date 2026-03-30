import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock ESLint ---

const { mockLintFiles, mockLoadFormatter, MockESLintClass } = vi.hoisted(() => {
  const lintFilesFn = vi.fn();
  const loadFormatterFn = vi.fn();
  const ESLintCls = vi.fn().mockImplementation(function () {
    return {
      lintFiles: lintFilesFn,
      loadFormatter: loadFormatterFn,
    };
  });
  return { mockLintFiles: lintFilesFn, mockLoadFormatter: loadFormatterFn, MockESLintClass: ESLintCls };
});

vi.mock("eslint", () => ({
  ESLint: MockESLintClass,
}));

// --- Mock consola ---

const mockLintLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("consola", () => {
  const consolaObj = {
    withTag: vi.fn(() => mockLintLogger),
  };
  return { consola: consolaObj, default: consolaObj };
});

const { LintWithProgramRunner } = await import("../../src/utils/lint-with-program");

// --- Helpers ---

function createMockSourceFile(fileName: string, isDts = false): {
  fileName: string;
  isDeclarationFile: boolean;
} {
  return { fileName, isDeclarationFile: isDts };
}

function createMockProgram(files: Array<{ fileName: string; isDeclarationFile: boolean }>): {
  getSourceFiles: () => Array<{ fileName: string; isDeclarationFile: boolean }>;
} {
  return {
    getSourceFiles: () => files,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockLintFiles.mockResolvedValue([]);
  mockLoadFormatter.mockResolvedValue({
    format: vi.fn().mockResolvedValue(""),
  });
});

describe("LintWithProgramRunner", () => {
  describe("Scenario: ts.Program and workspace-wide lint execution", () => {
    it("extracts .ts files from program within cwd (workspace scope), runs ESLint with programs option, and returns lint result", async () => {
      // Given: ts.Program with files inside workspace and outside (node_modules)
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/app.ts"),
        createMockSourceFile("/workspace/packages/my-pkg/src/util.ts"),
        createMockSourceFile("/workspace/packages/other-pkg/src/foo.ts"),
        createMockSourceFile("/workspace/node_modules/@types/node/index.d.ts", true),
      ]);

      // Mock ESLint result with some errors/warnings
      mockLintFiles.mockResolvedValue([
        { errorCount: 1, warningCount: 2, messages: [] },
      ]);
      mockLoadFormatter.mockResolvedValue({
        format: vi.fn().mockResolvedValue("error: no-unused-vars"),
      });

      // When: lint-with-program is called
      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });
      const result = await runner.lint({
        program: program as any,
      });

      // Then: all workspace .ts files (excluding .d.ts and node_modules) are linted
      expect(mockLintFiles).toHaveBeenCalledWith([
        "/workspace/packages/my-pkg/src/app.ts",
        "/workspace/packages/my-pkg/src/util.ts",
        "/workspace/packages/other-pkg/src/foo.ts",
      ]);

      // And: result contains success, errorCount, warningCount, formattedOutput
      expect(result).toEqual({
        success: false,
        errorCount: 1,
        warningCount: 2,
        formattedOutput: "error: no-unused-vars",
      });
    });
  });

  describe("Scenario: node_modules and declaration files excluded", () => {
    it("excludes node_modules and .d.ts files from lint targets", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/main.ts"),
        createMockSourceFile("/workspace/packages/my-pkg/node_modules/dep/index.ts"),
        createMockSourceFile("/workspace/packages/my-pkg/src/types.d.ts", true),
        createMockSourceFile("/workspace/packages/my-pkg/src/generated.d.ts", true),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });
      await runner.lint({
        program: program as any,
      });

      expect(mockLintFiles).toHaveBeenCalledWith([
        "/workspace/packages/my-pkg/src/main.ts",
      ]);
    });
  });

  describe("empty program returns success without calling ESLint", () => {
    it("returns success when program has no matching files within workspace", async () => {
      const program = createMockProgram([
        createMockSourceFile("/other-workspace/packages/pkg/src/foo.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });
      const result = await runner.lint({
        program: program as any,
      });

      expect(result).toEqual({
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      });
      expect(mockLintFiles).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: watch mode ESLint instance reuse", () => {
    it("reuses ESLint instance across multiple lint calls", async () => {

      const program1 = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
      ]);
      const program2 = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
        createMockSourceFile("/workspace/packages/my-pkg/src/b.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });

      await runner.lint({
        program: program1 as any,
      });
      await runner.lint({
        program: program2 as any,
      });

      // ESLint constructor should only be called once (instance reuse)
      expect(MockESLintClass).toHaveBeenCalledTimes(1);
      // But lintFiles should be called twice
      expect(mockLintFiles).toHaveBeenCalledTimes(2);
    });
  });

  describe("Scenario: affected files filter reduces lint scope in watch rebuild", () => {
    it("when affectedFiles is provided, only files in the intersection are linted", async () => {
      // Given: workspace has 4 source files
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/core/src/error.ts"),
        createMockSourceFile("/workspace/packages/core/src/util.ts"),
        createMockSourceFile("/workspace/packages/server/src/app.ts"),
        createMockSourceFile("/workspace/packages/server/src/controller.ts"),
      ]);

      // And: only error.ts and app.ts are affected (changed + dependents)
      const affectedFiles = new Set([
        "/workspace/packages/core/src/error.ts",
        "/workspace/packages/server/src/app.ts",
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "server",
      });

      // When: lint is called with affectedFiles
      await runner.lint({
        program: program as any,
        affectedFiles,
      });

      // Then: only the affected files are linted (intersection of extractFiles and affectedFiles)
      expect(mockLintFiles).toHaveBeenCalledWith([
        "/workspace/packages/core/src/error.ts",
        "/workspace/packages/server/src/app.ts",
      ]);
    });

    it("when affectedFiles is not provided, all workspace files are linted (one-time build)", async () => {
      // Given: workspace source files
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/core/src/error.ts"),
        createMockSourceFile("/workspace/packages/server/src/app.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "server",
      });

      // When: lint is called without affectedFiles (one-time build)
      await runner.lint({
        program: program as any,
      });

      // Then: all workspace files are linted
      expect(mockLintFiles).toHaveBeenCalledWith([
        "/workspace/packages/core/src/error.ts",
        "/workspace/packages/server/src/app.ts",
      ]);
    });
  });

  describe("Unit: affectedFiles edge cases", () => {
    it("returns success without calling ESLint when affectedFiles is empty set", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
        createMockSourceFile("/workspace/packages/my-pkg/src/b.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });

      const result = await runner.lint({
        program: program as any,
        affectedFiles: new Set(),
      });

      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(mockLintFiles).not.toHaveBeenCalled();
    });

    it("normalizes backslashes in file names when matching affectedFiles", async () => {
      const program = createMockProgram([
        // Windows-style backslash path from ts.Program
        createMockSourceFile("\\workspace\\packages\\my-pkg\\src\\a.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });

      // affectedFiles uses forward slashes
      await runner.lint({
        program: program as any,
        affectedFiles: new Set(["/workspace/packages/my-pkg/src/a.ts"]),
      });

      expect(mockLintFiles).toHaveBeenCalledTimes(1);
    });
  });

  describe("Scenario: ESLint cache policy depends on affectedFiles", () => {
    it("disables ESLint cache when affectedFiles is provided (watch rebuild)", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });

      // When: lint with affectedFiles (watch rebuild)
      await runner.lint({
        program: program as any,
        affectedFiles: new Set(["/workspace/packages/my-pkg/src/a.ts"]),
      });

      // Then: ESLint is created with cache: false
      expect(MockESLintClass).toHaveBeenCalledWith(
        expect.objectContaining({ cache: false }),
      );
    });

    it("enables ESLint cache when affectedFiles is not provided (one-time build)", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });

      // When: lint without affectedFiles (one-time build)
      await runner.lint({
        program: program as any,
      });

      // Then: ESLint is created with cache: true
      expect(MockESLintClass).toHaveBeenCalledWith(
        expect.objectContaining({ cache: true }),
      );
    });
  });

  //#region Feature 2.1 Slice 2: lint-with-program 로그 개선

  describe("Feature 2.1: lint-with-program 시작/완료 로그", () => {
    it("시작 로그 문구가 '린트 시작'으로 출력된다", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
        createMockSourceFile("/workspace/packages/my-pkg/src/b.ts"),
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });
      await runner.lint({ program: program as any });

      const debugCalls = mockLintLogger.debug.mock.calls;
      const startMsg = debugCalls.find(
        (c: string[]) => c[0].includes("린트 시작"),
      );
      expect(startMsg).toBeDefined();
      expect(startMsg![0]).toContain("[my-pkg]");
      expect(startMsg![0]).toContain("2개 파일");
    });

    it("완료 로그 출력 (에러 없음): '린트 완료 (에러: 0, 경고: 0)'", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
      ]);
      mockLintFiles.mockResolvedValue([
        { errorCount: 0, warningCount: 0, messages: [] },
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });
      await runner.lint({ program: program as any });

      const debugCalls = mockLintLogger.debug.mock.calls;
      const completeMsg = debugCalls.find(
        (c: string[]) => c[0].includes("린트 완료"),
      );
      expect(completeMsg).toBeDefined();
      expect(completeMsg![0]).toContain("[my-pkg]");
      expect(completeMsg![0]).toContain("에러: 0");
      expect(completeMsg![0]).toContain("경고: 0");
    });

    it("완료 로그 출력 (에러 있음): '린트 완료 (에러: 3, 경고: 2)'", async () => {
      const program = createMockProgram([
        createMockSourceFile("/workspace/packages/my-pkg/src/a.ts"),
      ]);
      mockLintFiles.mockResolvedValue([
        { errorCount: 3, warningCount: 2, messages: [] },
      ]);

      const runner = new LintWithProgramRunner({
        cwd: "/workspace",
        pkgName: "my-pkg",
      });
      await runner.lint({ program: program as any });

      const debugCalls = mockLintLogger.debug.mock.calls;
      const completeMsg = debugCalls.find(
        (c: string[]) => c[0].includes("린트 완료"),
      );
      expect(completeMsg).toBeDefined();
      expect(completeMsg![0]).toContain("[my-pkg]");
      expect(completeMsg![0]).toContain("에러: 3");
      expect(completeMsg![0]).toContain("경고: 2");
    });
  });

  //#endregion
});
