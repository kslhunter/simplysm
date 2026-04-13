import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/deps/replace-deps/collect-deps", () => ({
  collectDeps: vi.fn(),
}));

const { collectDeps } = await import("../../src/deps/replace-deps/collect-deps");
const { buildWatchPaths } = await import("../../src/workers/build-watch-paths");

const mockCollectDeps = vi.mocked(collectDeps);

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("buildWatchPaths", () => {
  it("passes replaceDeps config to collectDeps", () => {
    mockCollectDeps.mockReturnValue({ workspaceDeps: [], replaceDeps: [] });

    const config = { "@ext/*": "../ext" };
    buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*.ts"],
      replaceDeps: config,
    });

    expect(mockCollectDeps).toHaveBeenCalledWith("/ws/packages/lib", "/ws", config);
  });

  it("includes src globs for pkgDir and each workspace dep", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: ["dep-a", "dep-b"],
      replaceDeps: [],
    });

    const { watchPaths } = buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*.ts"],
    });

    // 자체 src
    expect(watchPaths.some((p) => p.includes("lib/src/**/*.ts"))).toBe(true);
    // dep-a src
    expect(watchPaths.some((p) => p.includes("dep-a/src/**/*.ts"))).toBe(true);
    // dep-b src
    expect(watchPaths.some((p) => p.includes("dep-b/src/**/*.ts"))).toBe(true);
  });

  it("includes replaceDeps dist paths from both cwd and pkgDir", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: [],
      replaceDeps: ["@scope/pkg"],
    });

    const { watchPaths } = buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*.ts"],
    });

    // cwd node_modules
    expect(
      watchPaths.some((p) =>
        p.includes("/ws/node_modules/@scope/pkg/dist/**/*.{js,mjs,cjs,d.ts,d.mts,d.cts}"),
      ),
    ).toBe(true);
    // pkgDir node_modules
    expect(
      watchPaths.some((p) =>
        p.includes("lib/node_modules/@scope/pkg/dist/**/*.{js,mjs,cjs,d.ts,d.mts,d.cts}"),
      ),
    ).toBe(true);
  });

  it("includes d.ts extensions in replaceDeps paths for non-scoped packages", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: [],
      replaceDeps: ["some-lib"],
    });

    const { watchPaths } = buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*.ts"],
    });

    const dtsGlob = "*.{js,mjs,cjs,d.ts,d.mts,d.cts}";
    expect(
      watchPaths.some((p) => p.includes(`/ws/node_modules/some-lib/dist/**/${dtsGlob}`)),
    ).toBe(true);
    expect(
      watchPaths.some((p) => p.includes(`lib/node_modules/some-lib/dist/**/${dtsGlob}`)),
    ).toBe(true);
  });

  it("includes extraDirs globs for each directory", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: ["dep-a"],
      replaceDeps: [],
    });

    const { watchPaths } = buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*.{ts,scss,css}"],
      extraDirs: [{ dir: "scss", globs: ["*.{scss,css}"] }],
    });

    // 자체 scss
    expect(watchPaths.some((p) => p.includes("lib/scss/**/*.{scss,css}"))).toBe(true);
    // dep-a scss
    expect(watchPaths.some((p) => p.includes("dep-a/scss/**/*.{scss,css}"))).toBe(true);
  });

  it("returns deps result from collectDeps", () => {
    const depsResult = { workspaceDeps: ["x"], replaceDeps: ["y"] };
    mockCollectDeps.mockReturnValue(depsResult);

    const { deps } = buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*.ts"],
    });

    expect(deps).toEqual(depsResult);
  });

  it("works without extraDirs and replaceDeps", () => {
    mockCollectDeps.mockReturnValue({ workspaceDeps: [], replaceDeps: [] });

    const { watchPaths } = buildWatchPaths({
      pkgDir: "/ws/packages/lib",
      cwd: "/ws",
      srcGlobs: ["*"],
    });

    expect(watchPaths).toHaveLength(1);
    expect(watchPaths[0]).toContain("lib/src/**/*");
  });
});
