import { describe, it, expect } from "vitest";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "../../src/utils/diagnostic-utils";

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
  it("formats diagnostic with file info", () => {
    const diag = {
      file: {
        fileName: "/workspace/src/index.ts",
        getLineAndCharacterOfPosition: () => ({ line: 5, character: 10 }),
      },
      start: 100,
      code: 2345,
      messageText: "Type error",
    };
    const result = formatDiagnosticError(diag as any);
    expect(result).toBe("/workspace/src/index.ts:6:11: TS2345: Type error");
  });

  it("formats diagnostic without file info", () => {
    const diag = {
      file: null,
      start: null,
      code: 1001,
      messageText: "Global error",
    };
    const result = formatDiagnosticError(diag as any);
    expect(result).toBe("TS1001: Global error");
  });
});
