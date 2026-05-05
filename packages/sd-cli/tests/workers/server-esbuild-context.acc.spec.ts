import { describe, it, expect, vi, afterEach } from "vitest";

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

// esbuild는 외부 npm으로 ESM namespace immutable이라 vi.mock 유지
vi.mock("esbuild", () => ({
  default: {
    context: vi.fn(() =>
      Promise.resolve({ rebuild: mockRebuild, dispose: mockDispose }),
    ),
  },
  formatMessagesSync: (messages: Array<{ text: string }>, _opts: unknown) =>
    messages.map((m) => m.text),
}));

import * as esbuildConfigMod from "../../src/esbuild/esbuild-config";
import * as tscPluginMod from "../../src/esbuild/esbuild-tsc-plugin";

vi.spyOn(esbuildConfigMod, "writeChangedOutputFiles").mockResolvedValue(undefined);
vi.spyOn(tscPluginMod, "createTscPlugin").mockReturnValue(mockTscPlugin as any);

const esbuild = (await import("esbuild")).default;
const { createTscPlugin } = tscPluginMod;
const {
  createContext, rebuild, recreateContext, dispose, getMetafile, hasContext,
  getTscProgram, getTscAffectedFiles, getTscDiagnostics,
} = await import("../../src/workers/server-esbuild-context");

const baseOptions = {
  pkgDir: "/workspace/packages/my-server",
  entryPoints: ["/workspace/packages/my-server/src/main.ts"],
  external: [],
};

const baseTscOptions = {
  cwd: "/workspace",
  output: { dts: true },
};

describe("server-esbuild-context lifecycle", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(createTscPlugin).mockClear();
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

describe("server-esbuild-context tsc integration lifecycle", () => {
  afterEach(async () => {
    mockRebuild.mockReset();
    mockDispose.mockReset();
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset();
    mockTscPlugin.resetBuilderProgram.mockReset();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(createTscPlugin).mockClear();
    await dispose();
  });

  // Acceptance: create with tsc → delegation works → dispose clears all
  it("manages tsc plugin lifecycle: create with tsc → delegation returns plugin values → dispose clears", async () => {
    const fakeProgram = { id: "fake-program" };
    const fakeAffectedFiles = new Set(["/src/main.ts"]);
    const fakeDiagnostics = [{ category: 1, code: 2322, messageText: "Type error" }];
    mockTscPlugin.getProgram.mockReturnValue(fakeProgram);
    mockTscPlugin.getAffectedFiles.mockReturnValue(fakeAffectedFiles);
    mockTscPlugin.getDiagnostics.mockReturnValue(fakeDiagnostics);

    // Create with tsc options
    await createContext({ ...baseOptions, tsc: baseTscOptions });
    expect(hasContext()).toBe(true);

    // Delegation methods return plugin values
    expect(getTscProgram()).toBe(fakeProgram);
    expect(getTscAffectedFiles()).toBe(fakeAffectedFiles);
    expect(getTscDiagnostics()).toEqual(fakeDiagnostics);

    // Dispose clears everything
    await dispose();
    expect(hasContext()).toBe(false);
    expect(getTscProgram()).toBeUndefined();
    expect(getTscAffectedFiles()).toBeUndefined();
    expect(getTscDiagnostics()).toEqual([]);
  });

  // Acceptance: create with tsc → recreate without tsc → plugin persists
  it("persists tsc plugin across context recreation when tsc options omitted", async () => {
    const fakeProgram = { id: "persisted-program" };
    mockTscPlugin.getProgram.mockReturnValue(fakeProgram);

    // Initial create with tsc
    await createContext({ ...baseOptions, tsc: baseTscOptions });
    expect(getTscProgram()).toBe(fakeProgram);

    // Recreate without tsc options — plugin persists
    await recreateContext(baseOptions);
    expect(hasContext()).toBe(true);
    expect(getTscProgram()).toBe(fakeProgram);
  });

  // Acceptance: create without tsc → no plugin → delegation returns defaults
  it("returns default values from delegation methods when no tsc plugin exists", async () => {
    await createContext(baseOptions);

    expect(hasContext()).toBe(true);
    expect(getTscProgram()).toBeUndefined();
    expect(getTscAffectedFiles()).toBeUndefined();
    expect(getTscDiagnostics()).toEqual([]);
  });

  // Acceptance: rebuild merges esbuild + tsc errors
  it("merges esbuild and tsc errors in rebuild result", async () => {
    mockRebuild.mockResolvedValue({
      errors: [{ text: "esbuild syntax error" }],
      warnings: [{ text: "deprecation" }],
      outputFiles: [],
      metafile: undefined,
    });
    mockTscPlugin.getErrors.mockReturnValue(["TS2322: type mismatch"]);

    await createContext({ ...baseOptions, tsc: baseTscOptions });
    const result = await rebuild();

    expect(result).toEqual({
      success: false,
      errors: ["esbuild syntax error", "TS2322: type mismatch"],
      warnings: ["deprecation"],
    });
  });

  // Acceptance: recreateContext resets tsc and persists plugin
  it("resets tsc builderProgram on recreateContext and persists plugin for next rebuild", async () => {
    mockRebuild.mockResolvedValue({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: {}, outputs: {} },
    });
    mockTscPlugin.getErrors.mockReturnValue(undefined);

    await createContext({ ...baseOptions, tsc: baseTscOptions });

    // recreateContext — resets tsc + creates new esbuild context
    await recreateContext(baseOptions);

    expect(mockTscPlugin.resetBuilderProgram).toHaveBeenCalled();
    expect(hasContext()).toBe(true);

    // rebuild still works with merged result
    const result = await rebuild();
    expect(result).toEqual({
      success: true,
      errors: undefined,
      warnings: undefined,
    });
  });

  // Acceptance: rebuild() reject 시 tsc 에러와 병합하여 정상 결과 반환
  it("merges tsc errors when context.rebuild() rejects instead of propagating throw", async () => {
    mockRebuild.mockResolvedValueOnce({
      errors: [],
      warnings: [],
      outputFiles: [],
      metafile: { inputs: { "src/main.ts": {} }, outputs: {} },
    });
    mockTscPlugin.getErrors.mockReturnValue(["TS2322: type mismatch"]);

    await createContext({ ...baseOptions, tsc: baseTscOptions });

    // 첫 빌드 성공 (metafile 설정)
    await rebuild();
    const savedMetafile = getMetafile();
    expect(savedMetafile).toBeDefined();

    // 두 번째 빌드 실패 — reject
    mockRebuild.mockRejectedValueOnce(new Error("Build failed with 1 error"));

    const result = await rebuild();

    // throw 전파 대신 정상 결과 반환 — esbuild + tsc 에러 병합
    expect(result).toEqual({
      success: false,
      errors: ["Build failed with 1 error", "TS2322: type mismatch"],
      warnings: undefined,
    });
    // 이전 metafile 유지
    expect(getMetafile()).toBe(savedMetafile);
  });

  // Acceptance: LOGIC-001 — recreateContext failure preserves tsc plugin reset
  it("resets tsc and disposes old context even when recreateContext fails (LOGIC-001)", async () => {
    await createContext({ ...baseOptions, tsc: baseTscOptions });

    // New context creation fails
    vi.mocked(esbuild.context).mockRejectedValueOnce(new Error("creation failed"));

    await expect(recreateContext(baseOptions)).rejects.toThrow("creation failed");

    expect(mockTscPlugin.resetBuilderProgram).toHaveBeenCalled();
    expect(mockDispose).toHaveBeenCalled();
    expect(hasContext()).toBe(false);
  });
});
