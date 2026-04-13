/* eslint-disable no-restricted-properties -- 테스트 환경변수 조작 필요 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mock references — available inside vi.mock factories
const mocks = vi.hoisted(() => ({
  fsxExists: vi.fn<(path: string) => Promise<boolean>>(),
  fsxGlob: vi.fn<(...args: unknown[]) => Promise<string[]>>(),
  lintFiles: vi.fn<() => Promise<Array<{ errorCount: number; warningCount: number }>>>(),
  loadFormatter: vi.fn(),
  outputFixes: vi.fn(),
  jitiImport: vi.fn(),
  eslintCtor: vi.fn(),
}));

vi.mock("@simplysm/core-node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@simplysm/core-node")>();
  return {
    ...actual,
    fsx: { exists: mocks.fsxExists, glob: mocks.fsxGlob },
  };
});

vi.mock("eslint", () => ({
  ESLint: class MockESLint {
    constructor(options: unknown) { mocks.eslintCtor(options); }
    lintFiles = mocks.lintFiles;
    loadFormatter = mocks.loadFormatter;
    static outputFixes = mocks.outputFixes;
  },
}));

vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({ import: mocks.jitiImport })),
}));

const { loadIgnorePatterns, executeLint } = await import("../../src/lint/lint-core");

//#region loadIgnorePatterns

describe("loadIgnorePatterns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extracts globalIgnores patterns from eslint config", async () => {
    mocks.fsxExists.mockImplementation((p) =>
      Promise.resolve(typeof p === "string" && p.endsWith("eslint.config.ts")),
    );
    mocks.jitiImport.mockResolvedValue({
      default: [
        { ignores: ["dist/**", "node_modules/**"] },
        { files: ["*.ts"], rules: {} }, // not globalIgnores — has files key
        { ignores: [".cache/**"] },
      ],
    });

    const result = await loadIgnorePatterns("/project");
    expect(result).toEqual(["dist/**", "node_modules/**", ".cache/**"]);
  });

  it("ignores config objects that have files key", async () => {
    mocks.fsxExists.mockImplementation((p) =>
      Promise.resolve(typeof p === "string" && p.endsWith("eslint.config.ts")),
    );
    mocks.jitiImport.mockResolvedValue({
      default: [{ files: ["*.ts"], ignores: ["dist/**"] }],
    });

    const result = await loadIgnorePatterns("/project");
    expect(result).toEqual([]);
  });

  it("throws when no eslint config file found", async () => {
    mocks.fsxExists.mockResolvedValue(false);

    await expect(loadIgnorePatterns("/project")).rejects.toThrow(
      "ESLint 설정 파일",
    );
  });
});

//#endregion

//#region executeLint

describe("executeLint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: eslint config exists with no ignores
    mocks.fsxExists.mockImplementation((p) =>
      Promise.resolve(typeof p === "string" && p.endsWith("eslint.config.ts")),
    );
    mocks.jitiImport.mockResolvedValue({ default: [] });
    mocks.fsxGlob.mockResolvedValue(["/project/src/a.ts", "/project/src/b.ts"]);
    mocks.lintFiles.mockResolvedValue([{ errorCount: 0, warningCount: 0 }]);
    mocks.loadFormatter.mockResolvedValue({
      format: vi.fn().mockResolvedValue(""),
    });
  });

  it("lints all collected files and returns success when no errors", async () => {
    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it("filters files by targets via pathx.filterByTargets", async () => {
    const cwd = process.cwd().replace(/\\/g, "/");
    mocks.fsxGlob.mockResolvedValue([
      `${cwd}/packages/core-common/src/a.ts`,
      `${cwd}/packages/other/src/b.ts`,
    ]);

    await executeLint({ targets: ["packages/core-common"], fix: false, timing: false });

    expect(mocks.lintFiles).toHaveBeenCalledWith([`${cwd}/packages/core-common/src/a.ts`]);
  });

  it("applies auto-fix when fix option is true", async () => {
    await executeLint({ targets: [], fix: true, timing: false });

    expect(mocks.outputFixes).toHaveBeenCalled();
  });

  it("sets TIMING env variable when timing option is true", async () => {
    const origTiming = process.env["TIMING"];

    await executeLint({ targets: [], fix: false, timing: true });

    expect(process.env["TIMING"]).toBe("1");

    // Cleanup
    if (origTiming == null) delete process.env["TIMING"];
    else process.env["TIMING"] = origTiming;
  });

  it("creates ESLint without cache", async () => {
    await executeLint({ targets: [], fix: false, timing: false });

    expect(mocks.eslintCtor).toHaveBeenCalledWith(
      expect.not.objectContaining({
        cache: true,
      }),
    );
  });

  it("returns error count and formatted output when lint errors found", async () => {
    mocks.lintFiles.mockResolvedValue([
      { errorCount: 3, warningCount: 1 },
      { errorCount: 1, warningCount: 2 },
    ]);
    mocks.loadFormatter.mockResolvedValue({
      format: vi.fn().mockResolvedValue("error details"),
    });

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(4);
    expect(result.warningCount).toBe(3);
    expect(result.formattedOutput).toBe("error details");
  });

  it("returns success when no files to lint", async () => {
    mocks.fsxGlob.mockResolvedValue([]);

    const result = await executeLint({ targets: [], fix: false, timing: false });

    expect(result.success).toBe(true);
  });
});

//#endregion
