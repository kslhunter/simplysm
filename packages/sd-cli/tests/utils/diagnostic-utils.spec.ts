import ts from "typescript";
import { describe, it, expect } from "vitest";
import {
  isWorkspaceDiagnostic,
  formatDiagnosticError,
  formatDiagnosticsOutput,
} from "../../src/utils/diagnostic-utils";

describe("isWorkspaceDiagnostic", () => {
  it("includes diagnostic when file is within cwd", () => {
    const diag = {
      file: { fileName: "/workspace/src/index.ts" },
    };
    expect(isWorkspaceDiagnostic(diag as any, "/workspace")).toBe(true);
  });

  it("excludes diagnostic when file is in node_modules", () => {
    const diag = {
      file: { fileName: "/workspace/node_modules/dep/index.ts" },
    };
    expect(isWorkspaceDiagnostic(diag as any, "/workspace")).toBe(false);
  });

  it("includes diagnostic without file info (global diagnostic)", () => {
    const diag = { file: null };
    expect(isWorkspaceDiagnostic(diag as any, "/workspace")).toBe(true);
  });

  it("excludes diagnostic from outside cwd", () => {
    const diag = {
      file: { fileName: "/other-workspace/src/index.ts" },
    };
    expect(isWorkspaceDiagnostic(diag as any, "/workspace")).toBe(false);
  });

  // Key scenario: Windows backslash paths are normalized via posix()
  it("normalizes Windows backslash paths for comparison", () => {
    const diag = {
      file: { fileName: "D:\\workspace\\src\\index.ts" },
    };
    expect(isWorkspaceDiagnostic(diag as any, "D:\\workspace")).toBe(true);
  });

  it("handles trailing slash in cwd", () => {
    const diag = {
      file: { fileName: "/workspace/src/index.ts" },
    };
    expect(isWorkspaceDiagnostic(diag as any, "/workspace/")).toBe(true);
  });
});

describe("formatDiagnosticError", () => {
  it("파일 정보가 있는 diagnostic을 컬러+코드 컨텍스트로 포맷한다", () => {
    const sourceFile = ts.createSourceFile(
      "/workspace/src/index.ts",
      "const x = 1;\nconst y: string = 123;\n",
      ts.ScriptTarget.Latest,
    );
    const diag: ts.Diagnostic = {
      file: sourceFile,
      start: 27,
      length: 3,
      category: ts.DiagnosticCategory.Error,
      code: 2345,
      messageText: "Type error",
    };
    const result = formatDiagnosticError(diag, "/workspace");
    expect(result).toContain("TS2345");
    expect(result).toContain("Type error");
    expect(result).toContain("index.ts");
  });

  it("파일 정보가 없는 diagnostic을 포맷한다", () => {
    const diag: ts.Diagnostic = {
      file: undefined,
      start: undefined,
      length: undefined,
      category: ts.DiagnosticCategory.Error,
      code: 1001,
      messageText: "Global error",
    };
    const result = formatDiagnosticError(diag, "/workspace");
    expect(result).toContain("TS1001");
    expect(result).toContain("Global error");
  });
});

describe("formatDiagnosticsOutput", () => {
  it("returns empty string for empty diagnostics array", () => {
    const result = formatDiagnosticsOutput([], "/workspace");
    expect(result).toBe("");
  });

  it("returns formatted string for file-less global diagnostic", () => {
    const diagnostic: ts.Diagnostic = {
      file: undefined,
      start: undefined,
      length: undefined,
      messageText: "Global error message",
      category: ts.DiagnosticCategory.Error,
      code: 9999,
    };
    const result = formatDiagnosticsOutput([diagnostic], "/workspace");
    expect(result).toContain("Global error message");
    expect(result).toContain("9999");
  });

  it("deduplicates identical diagnostics", () => {
    const sourceFile = ts.createSourceFile("test.ts", "const x = 1;", ts.ScriptTarget.Latest);
    const diagnostic: ts.Diagnostic = {
      file: sourceFile,
      start: 0,
      length: 5,
      messageText: "Duplicate error",
      category: ts.DiagnosticCategory.Error,
      code: 1234,
    };
    const result = formatDiagnosticsOutput([diagnostic, diagnostic], "/workspace");
    const occurrences = result.split("Duplicate error").length - 1;
    expect(occurrences).toBe(1);
  });
});
