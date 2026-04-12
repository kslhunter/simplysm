import { describe, it, expect, vi, afterEach } from "vitest";

//#region Mocks

const mockRebuild = vi.fn();
const mockDispose = vi.fn();

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

//#endregion

const esbuild = (await import("esbuild")).default;
const { writeChangedOutputFiles } = await import("../../src/esbuild/esbuild-config");
const { createContext, rebuild, recreateContext, dispose, getMetafile, hasContext } =
  await import("../../src/workers/server-esbuild-context");

const baseOptions = {
  pkgDir: "/workspace/packages/my-server",
  entryPoints: ["/workspace/packages/my-server/src/main.ts"],
  external: ["express"],
};

describe("createContext", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
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
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
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
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
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
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(writeChangedOutputFiles).mockClear();
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
});
