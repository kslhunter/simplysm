import { describe, it, expect, vi, beforeEach } from "vitest";

//#region Mocks

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

// vite mocks
const mockCreateServer = vi.fn();
const mockViteBuild = vi.fn();

vi.mock("vite", () => ({
  createServer: (...args: any[]) => mockCreateServer(...args),
  build: (...args: any[]) => mockViteBuild(...args),
}));

// createClientViteConfig mock
const mockCreateClientViteConfig = vi.fn();
vi.mock("../../src/utils/vite-config.js", () => ({
  createClientViteConfig: (...args: any[]) => mockCreateClientViteConfig(...args),
}));

// vite-scope-watch-plugin mock
vi.mock("../../src/utils/vite-scope-watch-plugin.js", () => ({
  sdScopeWatchPlugin: vi.fn(),
}));

// fs mock
const mockRmSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(false);
const mockReadFileSync = vi.fn().mockReturnValue('{"name": "@scope/my-client"}');
const mockStatSync = vi.fn().mockReturnValue({ isDirectory: () => false });

vi.mock("node:fs", () => ({
  default: {
    rmSync: (...args: any[]) => mockRmSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    statSync: (...args: any[]) => mockStatSync(...args),
  },
  rmSync: (...args: any[]) => mockRmSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  statSync: (...args: any[]) => mockStatSync(...args),
}));

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn((fns: Record<string, Function>) => {
    workerFns = fns as any;
    mockSend = vi.fn();
    return { send: mockSend };
  }),
}));

vi.mock("@simplysm/core-common", () => ({
  err: { message: (e: any) => e?.message ?? String(e) },
}));

vi.mock("consola", () => ({
  consola: {
    withTag: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

vi.mock("../../src/utils/worker-utils.js", () => ({
  registerCleanupHandlers: vi.fn(),
  applyDebugLevel: vi.fn(),
}));

//#endregion

// Dynamic import after mocking
await import("../../src/workers/client.worker");

//#region Helpers

function createBaseInfo() {
  return {
    name: "my-client",
    cwd: "/workspace",
    pkgDir: "/workspace/packages/my-client",
  };
}

/** RollupWatcher mock 생성 */
function createMockWatcher() {
  const handlers: Record<string, Function[] | undefined> = {};
  return {
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] ??= [];
      handlers[event].push(handler);
    }),
    close: vi.fn().mockResolvedValue(undefined),
    emit(event: string, data: unknown) {
      for (const handler of handlers[event] ?? []) {
        handler(data);
      }
    },
  };
}

//#endregion

beforeEach(() => {
  vi.clearAllMocks();
  mockExistsSync.mockReturnValue(false);
  mockReadFileSync.mockReturnValue('{"name": "@scope/my-client"}');
  mockCreateClientViteConfig.mockResolvedValue({ plugins: [] });
});

describe("client.worker", () => {
  describe("startWatch — legacy mode", () => {
    // Acceptance: Scenario "legacyModule 활성화 + startWatch 호출 시 viteBuild watch 모드 실행"
    it("calls viteBuild instead of createServer when legacyModule is true", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        // Simulate immediate END event (first build complete)
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      const result = await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
      });

      expect(mockViteBuild).toHaveBeenCalled();
      expect(mockCreateServer).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    // Acceptance: Scenario "legacyModule 미설정 + startWatch 호출 시 기존 dev server 실행"
    it("calls createServer when legacyModule is not set", async () => {
      const mockServer = {
        listen: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        httpServer: { address: () => ({ port: 4200 }) },
      };
      mockCreateServer.mockResolvedValue(mockServer);

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        port: 4200,
      });

      expect(mockCreateServer).toHaveBeenCalled();
      expect(mockViteBuild).not.toHaveBeenCalled();

      // cleanup module-level viteServer
      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "createClientViteConfig에 onBuildStart/onBuild 전달"
    it("sends buildStart and build events via onBuildStart/onBuild callbacks", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
      });

      // Verify createClientViteConfig was called with callbacks
      const configCall = mockCreateClientViteConfig.mock.calls[0][0];
      expect(configCall.onBuildStart).toBeTypeOf("function");
      expect(configCall.onBuild).toBeTypeOf("function");

      // Simulate callbacks firing (as sdAngularPlugin would)
      configCall.onBuildStart();
      expect(mockSend).toHaveBeenCalledWith("buildStart", {});

      const buildResult = { success: true, errors: [] };
      configCall.onBuild(buildResult);
      expect(mockSend).toHaveBeenCalledWith("build", buildResult);
    });

    // Acceptance: Scenario "watcher ERROR 이벤트 수신 시 error 발행"
    it("sends error event and resolves with failure on watcher ERROR", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(
          () =>
            mockWatcher.emit("event", {
              code: "ERROR",
              error: { message: "Build failed" },
            }),
          0,
        );
        return Promise.resolve(mockWatcher);
      });

      const result = await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Build failed");
      expect(mockSend).toHaveBeenCalledWith("error", { message: "Build failed" });
    });

    // Acceptance: Scenario "config에 watch: true, pwa: false 전달"
    it("passes watch: true and pwa: false to createClientViteConfig", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
      });

      expect(mockCreateClientViteConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "dev",
          watch: true,
          pwa: false,
          legacyModule: true,
        }),
      );
    });

    // Acceptance: Scenario "첫 빌드 시 dist 디렉토리를 비운다"
    it("clears dist directory before starting legacy watch", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
      });

      expect(mockRmSync).toHaveBeenCalledWith(
        expect.stringContaining("dist"),
        expect.objectContaining({ recursive: true, force: true }),
      );
    });
  });

  describe("stopWatch — legacy mode", () => {
    // Acceptance: Scenario "stopWatch 호출 시 watcher를 닫는다"
    it("closes RollupWatcher on stopWatch", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
      });

      await workerFns["stopWatch"]();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    // Acceptance: Scenario "watcher 없는 상태에서 stopWatch 호출 시 안전하게 무시한다"
    it("handles stopWatch without prior startWatch", async () => {
      await expect(workerFns["stopWatch"]()).resolves.toBeUndefined();
    });
  });

  describe("startWatch — legacy HTTP server (Feature 1.3)", () => {
    // Acceptance: Scenario "HTTP 서버로 index.html 접속"
    it("serves dist/index.html on /{name}/ request", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      // dist/index.html을 읽을 수 있도록 fs mock 설정
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("index.html")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      const htmlContent = "<html><body><h1>Hello</h1></body></html>";
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("index.html")) return htmlContent;
        return "";
      });

      const result = await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      expect(result.success).toBe(true);

      // serverReady 이벤트가 port와 함께 발행되어야 함
      expect(mockSend).toHaveBeenCalledWith("serverReady", expect.objectContaining({ port: expect.any(Number) }));

      // 실제 HTTP 요청으로 검증
      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;
      expect(port).toBeTypeOf("number");

      const res = await fetch(`http://127.0.0.1:${port}/my-client/`);
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain("<h1>Hello</h1>");

      // cleanup
      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "정적 파일(JS, CSS, 이미지) 요청"
    it("serves static files with correct Content-Type", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      const jsContent = "console.log('hello');";
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("main.js")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("main.js")) return jsContent;
        return "";
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      const res = await fetch(`http://127.0.0.1:${port}/my-client/main.js`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/javascript");
      const body = await res.text();
      expect(body).toBe(jsContent);

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "존재하지 않는 파일 요청 시 SPA fallback"
    it("falls back to index.html for non-existent paths", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      const htmlContent = "<html><body>SPA</body></html>";
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("index.html")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("index.html")) return htmlContent;
        return "";
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      const res = await fetch(`http://127.0.0.1:${port}/my-client/some/route`);
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain("SPA");

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "HTTP 서버 listen 완료 시 serverReady 이벤트 발행"
    it("emits serverReady event with port after HTTP server listen", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      mockExistsSync.mockReturnValue(false);

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const serverReadyCalls = mockSend.mock.calls.filter((c: any[]) => c[0] === "serverReady");
      expect(serverReadyCalls.length).toBe(1);
      expect(serverReadyCalls[0][1].port).toBeTypeOf("number");
      expect(serverReadyCalls[0][1].port).toBeGreaterThan(0);

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "stopWatch 호출 시 HTTP 서버와 RollupWatcher 모두 정리"
    it("closes both HTTP server and RollupWatcher on stopWatch", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      mockExistsSync.mockReturnValue(false);

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      await workerFns["stopWatch"]();

      expect(mockWatcher.close).toHaveBeenCalled();

      // HTTP 서버가 닫혔으므로 연결 불가해야 함
      await expect(fetch(`http://127.0.0.1:${port}/my-client/`)).rejects.toThrow();
    });
  });

  describe("startWatch — legacy HTTP server MIME type (mime library)", () => {
    // Acceptance: Scenario ".wasm 파일이 올바른 MIME 타입으로 서빙된다"
    it("serves .wasm files with application/wasm Content-Type", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      const wasmContent = new Uint8Array([0, 97, 115, 109]); // minimal wasm magic bytes
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("module.wasm")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("module.wasm")) return wasmContent;
        return "";
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      const res = await fetch(`http://127.0.0.1:${port}/my-client/module.wasm`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/wasm");

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "알 수 없는 확장자는 octet-stream으로 fallback한다"
    it("falls back to application/octet-stream for unknown extensions", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("data.xyz123")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("data.xyz123")) return "binary data";
        return "";
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      const res = await fetch(`http://127.0.0.1:${port}/my-client/data.xyz123`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/octet-stream");

      await workerFns["stopWatch"]();
    });
  });

  describe("startWatch — legacy live reload (Feature 1.3)", () => {
    // Acceptance: Scenario "index.html 서빙 시 reload 스크립트 자동 삽입"
    it("injects live reload script into HTML responses", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      const htmlContent = "<html><body><h1>App</h1></body></html>";
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("index.html")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("index.html")) return htmlContent;
        return "";
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      const res = await fetch(`http://127.0.0.1:${port}/my-client/`);
      const body = await res.text();

      // live reload 스크립트가 주입되어야 함
      expect(body).toContain("__live-reload");
      expect(body).toContain("<script>");
      // 원본 HTML 내용도 유지되어야 함
      expect(body).toContain("<h1>App</h1>");
      // 스크립트가 </body> 직전에 삽입되어야 함
      expect(body).toMatch(/<script>[\s\S]*<\/script>\s*<\/body>/);

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "비-HTML 파일 서빙 시 스크립트 미주입"
    it("does not inject script into non-HTML files", async () => {
      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      const jsContent = "console.log('hello');";
      mockExistsSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("main.js")) return true;
        if (typeof p === "string" && p.endsWith("polyfills.ts")) return false;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === "string" && p.endsWith("package.json")) return '{"name": "@scope/my-client"}';
        if (typeof p === "string" && p.endsWith("main.js")) return jsContent;
        return "";
      });

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      const res = await fetch(`http://127.0.0.1:${port}/my-client/main.js`);
      const body = await res.text();
      expect(body).toBe(jsContent);
      expect(body).not.toContain("<script>");

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "RollupWatcher END 이벤트 시 연결된 브라우저가 reload"
    it("sends reload signal via SSE on RollupWatcher END event", async () => {
      const http = await import("node:http");

      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      mockExistsSync.mockReturnValue(false);

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      // SSE 연결 수립 (node:http 사용)
      const sseData = await new Promise<string>((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/my-client/__live-reload`, (res) => {
          expect(res.headers["content-type"]).toContain("text/event-stream");

          res.on("data", (chunk: Buffer) => {
            const text = chunk.toString();
            if (text.includes("reload")) {
              resolve(text);
              res.destroy();
            }
          });
        });
        req.on("error", () => { /* SSE 연결 종료 시 무시 */ });

        // SSE 연결이 수립된 후 재빌드 END 이벤트 발행 (비동기 지연)
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 100);
      });

      expect(sseData).toContain("data: reload");

      await workerFns["stopWatch"]();
    });

    // Acceptance: Scenario "RollupWatcher ERROR 이벤트 시 reload 미전송"
    it("does not send reload signal on RollupWatcher ERROR event", async () => {
      const http = await import("node:http");

      const mockWatcher = createMockWatcher();
      mockViteBuild.mockImplementation(() => {
        setTimeout(() => mockWatcher.emit("event", { code: "END" }), 0);
        return Promise.resolve(mockWatcher);
      });

      mockExistsSync.mockReturnValue(false);

      await workerFns["startWatch"]({
        ...createBaseInfo(),
        browserSupport: { legacyModule: true },
        port: 0,
      });

      const port = mockSend.mock.calls.find((c: any[]) => c[0] === "serverReady")?.[1]?.port;

      // SSE 연결 수립 (node:http 사용)
      const receivedData: string[] = [];
      const req = http.get(`http://127.0.0.1:${port}/my-client/__live-reload`, (res) => {
        res.on("data", (chunk: Buffer) => {
          receivedData.push(chunk.toString());
        });

        // SSE 연결 후 ERROR 이벤트 발생 (reload 미전송이어야 함)
        mockWatcher.emit("event", { code: "ERROR", error: { message: "test error" } });
      });
      req.on("error", () => { /* SSE 연결 종료 시 무시 */ });

      // 잠시 대기하여 데이터 수신 확인
      await new Promise((resolve) => setTimeout(resolve, 100));
      req.destroy();

      // reload 데이터가 없어야 함
      const allData = receivedData.join("");
      expect(allData).not.toContain("reload");

      await workerFns["stopWatch"]();
    });
  });
});
