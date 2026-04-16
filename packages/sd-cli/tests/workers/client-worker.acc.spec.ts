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

// Import triggers createWorker, capturing the functions
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

describe("client.worker build() — Acceptance", () => {
  // Scenario: esbuild BuildFailure의 상세 에러가 전파된다
  it("esbuild BuildFailure 발생 시 errors 배열의 text 필드가 반환 errors에 포함된다", async () => {
    const buildFailure = {
      message: "Build failed with 2 errors",
      errors: [
        { text: "Could not resolve 'missing-module'" },
        { text: "Syntax error in file.ts" },
      ],
    };
    mockRebuild.mockRejectedValueOnce(buildFailure);

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.success).toBe(false);
    // formatEsbuildMessages가 ANSI 색상 코드를 포함하므로 부분 문자열 매칭
    const errorsJoined = result.errors!.join("\n");
    expect(errorsJoined).toContain("Could not resolve 'missing-module'");
    expect(errorsJoined).toContain("Syntax error in file.ts");
    // 요약 메시지("Build failed with 2 errors")가 아닌 상세 에러만 포함
    expect(errorsJoined).not.toContain("Build failed with 2 errors");
  });

  // Scenario: 일반 Error 발생 시 기존 폴백이 동작한다
  it("일반 Error 발생 시 errNs.message()로 추출한 메시지가 errors에 포함된다", async () => {
    mockRebuild.mockRejectedValueOnce(new Error("Unexpected crash"));

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Unexpected crash");
  });
});

describe("client.worker build() — browserSupport 전달", () => {
  // Scenario: browserSupport가 ClientBuildInfo를 통해 전달된다
  it("browserSupport 설정이 createClientEsbuildContext에 legacyModule/browserslist/postcssPlugins로 전달된다", async () => {
    const { createClientEsbuildContext } = await import(
      "../../src/esbuild/esbuild-client-config"
    );

    const result = await workerFns["build"]({
      ...baseBuildInfo,
      browserSupport: {
        legacyModule: true,
        browserslist: "Chrome 61",
        postCss: { plugins: [["autoprefixer"]] },
      },
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(createClientEsbuildContext)).toHaveBeenCalledWith(
      expect.objectContaining({
        legacyModule: true,
        browserslist: "Chrome 61",
        postcssPlugins: [["autoprefixer"]],
      }),
    );
  });

  // Scenario: browserSupport 미설정 시 기본값으로 동작한다
  it("browserSupport 미설정 시 legacyModule=false, browserslist=undefined로 전달된다", async () => {
    const { createClientEsbuildContext } = await import(
      "../../src/esbuild/esbuild-client-config"
    );

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.success).toBe(true);
    expect(vi.mocked(createClientEsbuildContext)).toHaveBeenCalledWith(
      expect.objectContaining({
        legacyModule: false,
        browserslist: undefined,
        postcssPlugins: undefined,
      }),
    );
  });
});

