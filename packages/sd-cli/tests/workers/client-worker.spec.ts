import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as coreNode from "@simplysm/core-node";
import * as sharedWorkerLifecycle from "../../src/workers/shared-worker-lifecycle";
import * as esbuildClientConfig from "../../src/esbuild/esbuild-client-config";
import * as esbuildIndexHtml from "../../src/esbuild/esbuild-index-html";
import * as esbuildPwa from "../../src/esbuild/esbuild-pwa";
import * as devHttpServer from "../../src/dev-server/dev-http-server";
import * as hmrService from "../../src/dev-server/hmr-service";
import * as hmrClientScript from "../../src/dev-server/hmr-client-script";
import * as copyPublic from "../../src/utils/copy-public";
import * as sdConfig from "../../src/utils/sd-config";

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

const mockRebuild = vi.fn();
const mockDispose = vi.fn();

vi.spyOn(coreNode, "createWorker").mockImplementation((fns: Record<string, Function>) => {
  workerFns = fns as any;
  mockSend = vi.fn();
  return { send: mockSend } as any;
});

vi.spyOn(sharedWorkerLifecycle, "setupWorkerLifecycle").mockImplementation(() => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn() },
  guardStartWatch: vi.fn(),
}) as any);

vi.spyOn(esbuildClientConfig, "createClientEsbuildContext").mockResolvedValue({
  context: { rebuild: mockRebuild, dispose: mockDispose, watch: vi.fn() },
  sourceFileCache: {},
} as any);

vi.spyOn(esbuildIndexHtml, "generateIndexHtml").mockResolvedValue({
  content: "<html></html>", errors: [], warnings: [],
});

vi.spyOn(esbuildPwa, "applyPwa").mockResolvedValue(undefined);
vi.spyOn(esbuildPwa, "createPwaHtmlTransform").mockReturnValue(undefined as any);

vi.spyOn(devHttpServer, "createDevHttpServer").mockReturnValue(undefined as any);
vi.spyOn(hmrService, "createHmrService").mockReturnValue(undefined as any);
vi.spyOn(hmrClientScript, "createHmrPostTransform").mockReturnValue(undefined as any);

vi.spyOn(copyPublic, "copyPublicFiles").mockResolvedValue(undefined);
vi.spyOn(copyPublic, "watchPublicFiles").mockReturnValue(undefined as any);

vi.spyOn(sdConfig, "loadSdConfig").mockResolvedValue({
  packages: { "my-app": { target: "client", server: "my-server" } },
} as any);

await import("../../src/workers/client.worker");

let tmpRoot: string;
let baseBuildInfo: { name: string; cwd: string; pkgDir: string };

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "client-worker-"));
  const pkgDir = path.join(tmpRoot, "packages", "my-app");
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "@scope/my-app" }));
  baseBuildInfo = { name: "my-app", cwd: tmpRoot, pkgDir };
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

beforeEach(() => {
  vi.clearAllMocks();
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
