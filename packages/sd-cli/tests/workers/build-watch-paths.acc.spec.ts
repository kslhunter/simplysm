import { describe, it, expect, vi, beforeEach } from "vitest";

// collectDeps는 파일 시스템에 의존하므로 모킹
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
  // Scenario: library-build의 감시 경로가 공통 함수로 생성된다
  it("generates watchPaths for library-build pattern (srcGlobs=['*.ts'])", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: ["core-common"],
      replaceDeps: ["@external/lib"],
    });

    const result = buildWatchPaths({
      pkgDir: "/workspace/packages/my-lib",
      cwd: "/workspace",
      srcGlobs: ["*.ts"],
      replaceDeps: { "@external/*": "../external" },
    });

    // 자체 src
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("my-lib/src/**/*.ts"),
    );
    // workspace dep src
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("core-common/src/**/*.ts"),
    );
    // replaceDeps dist (cwd + pkgDir 두 위치)
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("node_modules/@external/lib/dist/**/*.{js,mjs,cjs}"),
    );
    // deps 결과 반환
    expect(result.deps.workspaceDeps).toEqual(["core-common"]);
    expect(result.deps.replaceDeps).toEqual(["@external/lib"]);
  });

  // Scenario: ngtsc-build의 감시 경로가 scss 디렉토리를 포함하여 생성된다
  it("generates watchPaths for ngtsc-build pattern with extraDirs", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: ["core-common"],
      replaceDeps: [],
    });

    const result = buildWatchPaths({
      pkgDir: "/workspace/packages/angular-lib",
      cwd: "/workspace",
      srcGlobs: ["*.{ts,scss,css}"],
      extraDirs: [{ dir: "scss", globs: ["*.{scss,css}"] }],
    });

    // 자체 src + scss
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("angular-lib/src/**/*.{ts,scss,css}"),
    );
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("angular-lib/scss/**/*.{scss,css}"),
    );
    // workspace dep src + scss
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("core-common/src/**/*.{ts,scss,css}"),
    );
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("core-common/scss/**/*.{scss,css}"),
    );
  });

  // Scenario: server-build의 감시 경로가 모든 파일을 대상으로 생성된다
  it("generates watchPaths for server-build pattern (srcGlobs=['*'])", () => {
    mockCollectDeps.mockReturnValue({
      workspaceDeps: ["core-node"],
      replaceDeps: [],
    });

    const result = buildWatchPaths({
      pkgDir: "/workspace/packages/server",
      cwd: "/workspace",
      srcGlobs: ["*"],
    });

    // 자체 src
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("server/src/**/*"),
    );
    // workspace dep src
    expect(result.watchPaths).toContainEqual(
      expect.stringContaining("core-node/src/**/*"),
    );
  });
});
