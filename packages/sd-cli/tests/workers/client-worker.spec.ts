import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

const mockRebuild = vi.fn();
const mockDispose = vi.fn();
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn((fns: Record<string, Function>) => {
    workerFns = fns as any;
    mockSend = vi.fn();
    return { send: mockSend };
  }),
}));

vi.mock("../../src/workers/shared-worker-lifecycle", () => ({
  setupWorkerLifecycle: vi.fn(() => ({
    logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
    guardStartWatch: vi.fn(),
  })),
}));

vi.mock("../../src/esbuild/esbuild-client-config", () => ({
  createClientEsbuildContext: vi.fn(() =>
    Promise.resolve({
      context: { rebuild: mockRebuild, dispose: mockDispose, watch: vi.fn() },
      sourceFileCache: {},
    }),
  ),
}));

vi.mock("../../src/esbuild/esbuild-index-html", () => ({
  generateIndexHtml: vi.fn(() =>
    Promise.resolve({ content: "<html></html>", errors: [], warnings: [] }),
  ),
}));

vi.mock("../../src/esbuild/esbuild-pwa", () => ({
  applyPwa: vi.fn(() => Promise.resolve()),
  createPwaHtmlTransform: vi.fn(),
}));

vi.mock("../../src/dev-server/dev-http-server", () => ({
  createDevHttpServer: vi.fn(),
}));

vi.mock("../../src/dev-server/hmr-service", () => ({
  createHmrService: vi.fn(),
}));

vi.mock("../../src/dev-server/hmr-client-script", () => ({
  createHmrPostTransform: vi.fn(),
}));

vi.mock("../../src/utils/copy-public", () => ({
  copyPublicFiles: vi.fn(() => Promise.resolve()),
  watchPublicFiles: vi.fn(),
}));

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: vi.fn(() =>
    Promise.resolve({
      packages: { "my-app": { target: "client", server: "my-server" } },
    }),
  ),
}));

vi.mock("node:fs", () => ({
  default: {
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    writeFileSync: vi.fn(),
    existsSync: (...args: any[]) => mockExistsSync(...args),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
  },
}));

//#endregion

await import("../../src/workers/client.worker");

const baseBuildInfo = {
  name: "my-app",
  cwd: "/workspace",
  pkgDir: "/workspace/packages/my-app",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFileSync.mockImplementation((filePath: any) => {
    if (String(filePath).endsWith("package.json")) {
      return JSON.stringify({ name: "@scope/my-app" });
    }
    return "";
  });
  mockExistsSync.mockReturnValue(false);
  mockRebuild.mockResolvedValue({
    metafile: { outputs: {} },
    errors: [],
    warnings: [],
  });
});

describe("client.worker build() — 에러 처리", () => {
  it("BuildFailure에 errors 배열이 비어있으면 message 폴백을 사용한다", async () => {
    const emptyBuildFailure = new Error("Build failed with 0 errors");
    (emptyBuildFailure as any).errors = [];
    mockRebuild.mockRejectedValueOnce(emptyBuildFailure);

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Build failed with 0 errors");
  });

  it("non-Error 값(string) throw 시에도 errors에 문자열이 포함된다", async () => {
    mockRebuild.mockRejectedValueOnce("plain string error");

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("plain string error");
  });
});
