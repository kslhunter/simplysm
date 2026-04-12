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
const { createContext, rebuild, recreateContext, dispose, getMetafile, hasContext } =
  await import("../../src/workers/server-esbuild-context");

const baseOptions = {
  pkgDir: "/workspace/packages/my-server",
  entryPoints: ["/workspace/packages/my-server/src/main.ts"],
  external: [],
};

describe("server-esbuild-context lifecycle", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    vi.mocked(esbuild.context).mockClear();
    await dispose();
  });

  // Acceptance: create → rebuild → dispose 전체 생명주기
  it("manages esbuild context lifecycle: create → rebuild with metafile update → dispose", async () => {
    const mockMetafile = { inputs: { "src/main.ts": {} }, outputs: {} };
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: mockMetafile,
    });

    // Create
    await createContext(baseOptions);
    expect(hasContext()).toBe(true);
    expect(getMetafile()).toBeUndefined();

    // Rebuild
    const result = await rebuild();
    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(getMetafile()).toBe(mockMetafile);

    // Dispose
    await dispose();
    expect(hasContext()).toBe(false);
    expect(getMetafile()).toBeUndefined();
    expect(mockDispose).toHaveBeenCalledOnce();
  });

  // Acceptance: LOGIC-001 — 재생성 실패 시에도 old context 해제 + 안전 상태
  it("safely recreates context: disposes old even if new creation fails (LOGIC-001)", async () => {
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
    });

    await createContext(baseOptions);
    await rebuild(); // metafile 설정

    // 새 context 생성 실패
    vi.mocked(esbuild.context).mockRejectedValueOnce(new Error("context creation failed"));

    await expect(recreateContext(baseOptions)).rejects.toThrow("context creation failed");

    // Old context가 dispose됨
    expect(mockDispose).toHaveBeenCalled();
    // 안전한 상태
    expect(hasContext()).toBe(false);
    expect(getMetafile()).toBeUndefined();
    // 이후 rebuild는 null 반환 (tsc-only 경로)
    const result = await rebuild();
    expect(result).toBeNull();
  });
});
