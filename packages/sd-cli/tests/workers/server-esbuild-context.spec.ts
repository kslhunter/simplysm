import { describe, it, expect, vi, afterEach } from "vitest";

//#region Mocks

const mockRebuild = vi.fn();
const mockDispose = vi.fn();

const mockTscPlugin = {
  plugin: { name: "sd-tsc", setup: vi.fn() },
  getProgram: vi.fn(),
  getAffectedFiles: vi.fn(),
  getDiagnostics: vi.fn((): unknown[] => []),
  getErrors: vi.fn(),
  resetBuilderProgram: vi.fn(),
};

vi.mock("esbuild", () => ({
  default: {
    context: vi.fn(() =>
      Promise.resolve({ rebuild: mockRebuild, dispose: mockDispose }),
    ),
  },
}));

vi.mock("../../src/esbuild/esbuild-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/esbuild/esbuild-config")>();
  return {
    ...actual,
    writeChangedOutputFiles: vi.fn(() => Promise.resolve()),
  };
});

vi.mock("../../src/esbuild/esbuild-tsc-plugin", () => ({
  createTscPlugin: vi.fn(() => mockTscPlugin),
}));

//#endregion

const esbuild = (await import("esbuild")).default;
const { writeChangedOutputFiles } = await import("../../src/esbuild/esbuild-config");
const {
  createContext, rebuild, recreateContext, dispose, getMetafile, hasContext,
  getTscProgram, getTscAffectedFiles, getTscDiagnostics,
} = await import("../../src/workers/server-esbuild-context");
const { createTscPlugin } = await import("../../src/esbuild/esbuild-tsc-plugin");

const baseOptions = {
  pkgDir: "/workspace/packages/my-server",
  entryPoints: ["/workspace/packages/my-server/src/main.ts"],
  external: ["express"],
};

describe("createContext", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("calls esbuild.context with metafile:true and write:false", async () => {
    await createContext(baseOptions);

    expect(esbuild.context).toHaveBeenCalledWith(
      expect.objectContaining({
        metafile: true,
        write: false,
        external: ["express"],
      }),
    );
    expect(hasContext()).toBe(true);
  });

  it("passes dev:true options for sourcemap and no minification", async () => {
    await createContext(baseOptions);

    expect(esbuild.context).toHaveBeenCalledWith(
      expect.objectContaining({
        minify: false,
        sourcemap: "linked",
      }),
    );
  });
});

describe("rebuild", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("returns null when no context exists", async () => {
    const result = await rebuild();
    expect(result).toBeNull();
  });

  it("returns success result and updates metafile", async () => {
    const mockMetafile = { inputs: { "src/main.ts": {} }, outputs: {} };
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [{ path: "/dist/main.js", text: "export {}" }],
      metafile: mockMetafile,
    });

    await createContext(baseOptions);
    const result = await rebuild();

    expect(result).toEqual({
      success: true,
      errors: undefined,
      warnings: undefined,
    });
    expect(getMetafile()).toBe(mockMetafile);
    expect(writeChangedOutputFiles).toHaveBeenCalledWith([
      { path: "/dist/main.js", text: "export {}" },
    ]);
  });

  it("returns error result on esbuild errors", async () => {
    mockRebuild.mockResolvedValue({
      errors: [{ text: "syntax error" }],
      warnings: [{ text: "deprecation warning" }],
      outputFiles: [],
      metafile: undefined,
    });

    await createContext(baseOptions);
    const result = await rebuild();

    expect(result).toEqual({
      success: false,
      errors: ["syntax error"],
      warnings: ["deprecation warning"],
    });
  });
});

describe("recreateContext", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("disposes old context and creates new one", async () => {
    await createContext(baseOptions);
    const newOptions = { ...baseOptions, entryPoints: ["/src/new.ts"] };

    const disposeCountBefore = mockDispose.mock.calls.length;
    await recreateContext(newOptions);

    // recreateContext 중 old context가 dispose됨
    expect(mockDispose.mock.calls.length - disposeCountBefore).toBe(1);
    expect(esbuild.context).toHaveBeenCalledTimes(2);
    expect(hasContext()).toBe(true);
  });

  it("clears metafile during recreation", async () => {
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
    });

    await createContext(baseOptions);
    await rebuild(); // set metafile
    expect(getMetafile()).toBeDefined();

    await recreateContext(baseOptions);

    // metafile cleared (new context hasn't been rebuilt yet)
    expect(getMetafile()).toBeUndefined();
  });
});

describe("dispose", () => {
  afterEach(() => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
  });

  it("is safe to call when no context exists", async () => {
    await expect(dispose()).resolves.not.toThrow();
    expect(hasContext()).toBe(false);
  });

  it("disposes context and clears all state", async () => {
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
    });

    await createContext(baseOptions);
    await rebuild();

    await dispose();

    expect(mockDispose).toHaveBeenCalledOnce();
    expect(hasContext()).toBe(false);
    expect(getMetafile()).toBeUndefined();
  });

  it("clears tscPlugin reference on dispose", async () => {
    mockTscPlugin.getProgram.mockReturnValue({ id: "prog" });

    await createContext({
      ...baseOptions,
      tsc: { cwd: "/workspace", output: { dts: true } },
    });
    expect(getTscProgram()).toEqual({ id: "prog" });

    await dispose();

    expect(getTscProgram()).toBeUndefined();
    expect(getTscAffectedFiles()).toBeUndefined();
    expect(getTscDiagnostics()).toEqual([]);
  });
});

describe("createContext — tsc plugin", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("includes tsc plugin in esbuild context when tsc options provided", async () => {
    await createContext({
      ...baseOptions,
      tsc: { cwd: "/workspace", output: { dts: true } },
    });

    expect(esbuild.context).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [mockTscPlugin.plugin],
      }),
    );
  });

  it("creates esbuild context without plugins when no tsc options and no existing plugin", async () => {
    await createContext(baseOptions);

    expect(esbuild.context).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [],
      }),
    );
  });

  it("reuses existing tsc plugin when tsc options absent in subsequent createContext", async () => {
    // First: create with tsc
    await createContext({
      ...baseOptions,
      tsc: { cwd: "/workspace", output: { dts: true } },
    });

    // Dispose context only (not module-level dispose — use recreateContext pattern)
    vi.mocked(esbuild.context).mockClear();

    // Second: create without tsc — should reuse existing plugin
    await recreateContext(baseOptions);

    expect(esbuild.context).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [mockTscPlugin.plugin],
      }),
    );
  });

  it("passes tsc env and includeTests options to createTscPlugin", async () => {
    await createContext({
      ...baseOptions,
      tsc: {
        cwd: "/workspace",
        output: { dts: false },
        env: "node",
        includeTests: true,
      },
    });

    expect(createTscPlugin).toHaveBeenCalledWith({
      pkgDir: baseOptions.pkgDir,
      cwd: "/workspace",
      output: { dts: false },
      env: "node",
      includeTests: true,
    });
  });
});

describe("delegation methods", () => {
  afterEach(async () => {
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("getTscProgram returns plugin value when plugin exists", async () => {
    const fakeProgram = { getSourceFiles: () => [] };
    mockTscPlugin.getProgram.mockReturnValue(fakeProgram);

    await createContext({
      ...baseOptions,
      tsc: { cwd: "/workspace", output: { dts: true } },
    });

    expect(getTscProgram()).toBe(fakeProgram);
  });

  it("getTscAffectedFiles returns plugin value when plugin exists", async () => {
    const fakeFiles = new Set(["/src/main.ts"]);
    mockTscPlugin.getAffectedFiles.mockReturnValue(fakeFiles);

    await createContext({
      ...baseOptions,
      tsc: { cwd: "/workspace", output: { dts: true } },
    });

    expect(getTscAffectedFiles()).toBe(fakeFiles);
  });

  it("getTscDiagnostics returns plugin value when plugin exists", async () => {
    const fakeDiag = [{ category: 1, code: 2322, messageText: "err" }];
    mockTscPlugin.getDiagnostics.mockReturnValue(fakeDiag);

    await createContext({
      ...baseOptions,
      tsc: { cwd: "/workspace", output: { dts: true } },
    });

    expect(getTscDiagnostics()).toEqual(fakeDiag);
  });

});

describe("rebuild — tsc error merge", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("returns success when both esbuild and tsc have no errors", async () => {
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
    });
    mockTscPlugin.getErrors.mockReturnValue(undefined);

    await createContext({ ...baseOptions, tsc: { cwd: "/workspace", output: { dts: true } } });
    const result = await rebuild();

    expect(result).toEqual({
      success: true,
      errors: undefined,
      warnings: undefined,
    });
  });

  it("returns tsc errors only when esbuild succeeds but tsc fails", async () => {
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
    });
    mockTscPlugin.getErrors.mockReturnValue(["TS2322: type mismatch"]);

    await createContext({ ...baseOptions, tsc: { cwd: "/workspace", output: { dts: true } } });
    const result = await rebuild();

    expect(result).toEqual({
      success: false,
      errors: ["TS2322: type mismatch"],
      warnings: undefined,
    });
  });

  it("returns esbuild errors only when esbuild fails but tsc succeeds", async () => {
    mockRebuild.mockResolvedValue({
      errors: [{ text: "syntax error" }],
      warnings: [],
      outputFiles: [],
      metafile: undefined,
    });
    mockTscPlugin.getErrors.mockReturnValue(undefined);

    await createContext({ ...baseOptions, tsc: { cwd: "/workspace", output: { dts: true } } });
    const result = await rebuild();

    expect(result).toEqual({
      success: false,
      errors: ["syntax error"],
      warnings: undefined,
    });
  });

  it("merges esbuild and tsc errors when both fail", async () => {
    mockRebuild.mockResolvedValue({
      errors: [{ text: "esbuild error" }],
      warnings: [{ text: "warning" }],
      outputFiles: [],
      metafile: undefined,
    });
    mockTscPlugin.getErrors.mockReturnValue(["tsc error 1", "tsc error 2"]);

    await createContext({ ...baseOptions, tsc: { cwd: "/workspace", output: { dts: true } } });
    const result = await rebuild();

    expect(result).toEqual({
      success: false,
      errors: ["esbuild error", "tsc error 1", "tsc error 2"],
      warnings: ["warning"],
    });
  });

  it("returns esbuild-only result when no tsc plugin exists", async () => {
    mockRebuild.mockResolvedValue({
      errors: [{ text: "error" }],
      warnings: [],
      outputFiles: [],
      metafile: undefined,
    });

    await createContext(baseOptions);
    const result = await rebuild();

    expect(result).toEqual({
      success: false,
      errors: ["error"],
      warnings: undefined,
    });
  });
});

describe("recreateContext — tsc reset", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  it("does not fail when recreateContext is called without tsc plugin", async () => {
    await createContext(baseOptions);

    await expect(recreateContext(baseOptions)).resolves.not.toThrow();
    expect(hasContext()).toBe(true);
  });
});
