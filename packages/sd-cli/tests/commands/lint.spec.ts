import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoisted mock references — available inside vi.mock factories
const mocks = vi.hoisted(() => ({
  fsxExists: vi.fn<(path: string) => Promise<boolean>>(),
  fsxGlob: vi.fn<(...args: unknown[]) => Promise<string[]>>(),
  filterByTargets: vi.fn(
    (files: string[], _targets: string[], _cwd: string) => files,
  ),
  lintFiles: vi.fn<() => Promise<Array<{ errorCount: number; warningCount: number }>>>(),
  loadFormatter: vi.fn(),
  outputFixes: vi.fn(),
  jitiImport: vi.fn(),
  eslintCtor: vi.fn(),
}));

vi.mock("@simplysm/core-node", () => ({
  fsx: { exists: mocks.fsxExists, glob: mocks.fsxGlob },
  pathx: { filterByTargets: mocks.filterByTargets },
}));

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

vi.mock("consola", () => {
  const fns = (): Record<string, unknown> => ({
    debug: vi.fn(), start: vi.fn(), success: vi.fn(),
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn(),
    withTag: vi.fn(() => fns()),
    level: 0,
  });
  const c = fns();
  return { consola: c, default: c, LogLevels: {} };
});

const { loadIgnorePatterns, executeLint, runLint } = await import("../../src/commands/lint");

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
    mocks.filterByTargets.mockImplementation((files) => files);
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
    expect(mocks.lintFiles).toHaveBeenCalled();
  });

  it("filters files by targets via pathx.filterByTargets", async () => {
    const filteredFiles = ["/project/packages/core-common/src/a.ts"];
    mocks.filterByTargets.mockReturnValue(filteredFiles);

    await executeLint({ targets: ["packages/core-common"], fix: false, timing: false });

    expect(mocks.filterByTargets).toHaveBeenCalledWith(
      expect.any(Array),
      ["packages/core-common"],
      expect.any(String),
    );
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

  it("creates ESLint with cache enabled and correct cache location", async () => {
    await executeLint({ targets: [], fix: false, timing: false });

    expect(mocks.eslintCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: true,
        cacheLocation: expect.stringContaining("eslint.cache"),
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
    expect(mocks.lintFiles).not.toHaveBeenCalled();
  });
});

//#endregion

//#region runLint

describe("runLint", () => {
  let savedExitCode: typeof process.exitCode;
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    // Default: successful lint
    mocks.fsxExists.mockImplementation((p) =>
      Promise.resolve(typeof p === "string" && p.endsWith("eslint.config.ts")),
    );
    mocks.jitiImport.mockResolvedValue({ default: [] });
    mocks.fsxGlob.mockResolvedValue(["/project/src/a.ts"]);
    mocks.filterByTargets.mockImplementation((files) => files);
    mocks.lintFiles.mockResolvedValue([{ errorCount: 0, warningCount: 0 }]);
    mocks.loadFormatter.mockResolvedValue({
      format: vi.fn().mockResolvedValue(""),
    });
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    writeSpy.mockRestore();
  });

  it("writes formatted output to stdout when there are results", async () => {
    mocks.lintFiles.mockResolvedValue([{ errorCount: 1, warningCount: 0 }]);
    mocks.loadFormatter.mockResolvedValue({
      format: vi.fn().mockResolvedValue("lint output here"),
    });

    await runLint({ targets: [], fix: false, timing: false });

    expect(writeSpy).toHaveBeenCalledWith("lint output here");
  });

  it("sets exitCode to 1 when lint errors are found", async () => {
    mocks.lintFiles.mockResolvedValue([{ errorCount: 1, warningCount: 0 }]);
    mocks.loadFormatter.mockResolvedValue({
      format: vi.fn().mockResolvedValue("errors"),
    });

    await runLint({ targets: [], fix: false, timing: false });

    expect(process.exitCode).toBe(1);
  });
});

//#endregion
