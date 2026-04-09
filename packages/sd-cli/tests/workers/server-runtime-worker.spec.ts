import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import fsp from "fs/promises";

// Capture workerFns passed to createWorker
let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn((fns: Record<string, Function>) => {
    workerFns = fns as any;
    mockSend = vi.fn();
    return { send: mockSend };
  }),
}));

vi.mock("../../src/utils/worker-utils", () => ({
  registerCleanupHandlers: vi.fn(),
  setupWorkerConsola: vi.fn(),
}));

// @fastify/http-proxy mock
const mockProxyPlugin = vi.fn();
vi.mock("@fastify/http-proxy", () => ({
  default: mockProxyPlugin,
}));

// Port availability mock
let portCheckResults: boolean[] = [];
let portCheckIndex = 0;

vi.mock("net", () => ({
  default: {
    createServer: vi.fn(() => {
      const handlers: Record<string, Function> = {};
      return {
        once: (event: string, cb: Function) => {
          handlers[event] = cb;
        },
        listen: () => {
          const isAvailable = portCheckResults[portCheckIndex++] ?? true;
          if (isAvailable) {
            const _closeFn = (cb?: () => void) => {
              cb?.();
            };
            handlers["listening"]();
          } else {
            handlers["error"]();
          }
        },
        close: (cb?: () => void) => {
          cb?.();
        },
      };
    }),
  },
}));

// Import triggers createWorker
await import("../../src/workers/server-runtime.worker");

// Create a temp directory with mock main.js that exports globalThis.__sdCliTestServer
const mockMainDir = path.join(os.tmpdir(), `sd-cli-test-server-${Date.now()}`);
const mockMainJsPath = path.join(mockMainDir, "main.mjs");

const mockRegister = vi.fn().mockResolvedValue(undefined);

const mockServer = {
  options: { port: 3000 },
  listen: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  fastify: { register: mockRegister },
};

beforeAll(async () => {
  (globalThis as any).__sdCliTestServer = mockServer;
  await fsp.mkdir(mockMainDir, { recursive: true });
  await fsp.writeFile(
    mockMainJsPath,
    "export const server = globalThis.__sdCliTestServer;\n",
  );
});

afterAll(async () => {
  await fsp.rm(mockMainDir, { recursive: true, force: true }).catch(() => {});
  delete (globalThis as any).__sdCliTestServer;
});

describe("server-runtime.worker cleanup", () => {
  it("sets serverInstance to undefined before calling close() to prevent duplicate calls", async () => {
    // Start the server to set serverInstance
    portCheckResults = [true];
    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    // Get the cleanup function registered via registerCleanupHandlers
    const { registerCleanupHandlers } = await import("../../src/utils/worker-utils");
    const firstCall = vi.mocked(registerCleanupHandlers).mock.calls[0];
    expect(firstCall).toBeDefined();
    const cleanupFn = firstCall[0];

    // Track call order
    const callOrder: string[] = [];
    mockServer.close.mockImplementation(() => {
      callOrder.push("close");
      return Promise.resolve();
    });

    await cleanupFn();

    // close should have been called
    expect(callOrder).toContain("close");

    // Calling cleanup again should NOT call close again (serverInstance is already undefined)
    mockServer.close.mockClear();
    await cleanupFn();
    expect(mockServer.close).not.toHaveBeenCalled();
  });
});

describe("server-runtime.worker start", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    mockSend.mockClear();
    mockServer.listen.mockClear();
    mockServer.close.mockClear();
    mockRegister.mockClear();
    mockProxyPlugin.mockClear();
    mockServer.options.port = 3000;
    portCheckResults = [];
    portCheckIndex = 0;
  });

  afterEach(async () => {
    // Restore modified env vars
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    // .dev-port 정리
    await fsp.unlink(path.join(mockMainDir, ".dev-port")).catch(() => {});
  });

  function trackEnv(key: string): void {
    savedEnv[key] = process.env[key];
  }

  it("injects env vars into process.env before server start", async () => {
    trackEnv("TEST_DB_HOST");
    trackEnv("TEST_API_KEY");

    await workerFns["start"]({
      mainJsPath: mockMainJsPath,
      env: { TEST_DB_HOST: "localhost", TEST_API_KEY: "secret123" },
    });

    expect(process.env["TEST_DB_HOST"]).toBe("localhost");
    expect(process.env["TEST_API_KEY"]).toBe("secret123");
  });

  it("calls server.listen() and sends serverReady event with port", async () => {
    portCheckResults = [true]; // Port 3000 available

    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    expect(mockServer.listen).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith("serverReady", { port: 3000 });
  });

  it("auto-increments port on conflict and updates server.options.port", async () => {
    portCheckResults = [false, false, true]; // 3000 taken, 3001 taken, 3002 available
    mockServer.options.port = 3000;

    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    expect(mockServer.options.port).toBe(3002);
    expect(mockSend).toHaveBeenCalledWith("serverReady", { port: 3002 });
  });

  it("sends error event when all ports are unavailable (20 retries)", async () => {
    portCheckResults = Array(20).fill(false);
    mockServer.options.port = 3000;

    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    expect(mockSend).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({
        message: expect.stringContaining("No available port"),
      }),
    );
    expect(mockSend).not.toHaveBeenCalledWith("serverReady", expect.anything());
  });

  // Acceptance: Scenario "서버 런타임에 클라이언트 프록시 등록"
  it("registers @fastify/http-proxy for each client port before listen", async () => {
    portCheckResults = [true];

    await workerFns["start"]({
      mainJsPath: mockMainJsPath,
      clientPorts: { "client-a": 54321, "client-b": 54322 },
    });

    expect(mockRegister).toHaveBeenCalledTimes(2);
    expect(mockRegister).toHaveBeenCalledWith(
      mockProxyPlugin,
      expect.objectContaining({
        prefix: "/client-a",
        upstream: "http://127.0.0.1:54321",
        rewritePrefix: "/client-a",
        websocket: true,
      }),
    );
    expect(mockRegister).toHaveBeenCalledWith(
      mockProxyPlugin,
      expect.objectContaining({
        prefix: "/client-b",
        upstream: "http://127.0.0.1:54322",
        rewritePrefix: "/client-b",
        websocket: true,
      }),
    );
    expect(mockSend).toHaveBeenCalledWith("serverReady", { port: 3000 });
  });

  // Unit: no proxy when clientPorts is undefined
  it("does not register proxy when clientPorts is undefined", async () => {
    portCheckResults = [true];

    await workerFns["start"]({
      mainJsPath: mockMainJsPath,
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // Unit: empty clientPorts
  it("does not register proxy when clientPorts is empty", async () => {
    portCheckResults = [true];

    await workerFns["start"]({
      mainJsPath: mockMainJsPath,
      clientPorts: {},
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "서버 listen 완료 후 .dev-port 기록"
  it("writes .dev-port file with server port after listen", async () => {
    portCheckResults = [true];
    mockServer.options.port = 3000;

    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    const portFile = path.join(mockMainDir, ".dev-port");
    const content = await fsp.readFile(portFile, "utf-8");
    expect(content).toBe("3000");
  });

  // Unit: 포트 충돌로 다른 포트 사용 시 실제 포트 기록
  it("writes actual port to .dev-port when port auto-incremented", async () => {
    portCheckResults = [false, false, true]; // 3000, 3001 taken, 3002 available
    mockServer.options.port = 3000;

    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    const portFile = path.join(mockMainDir, ".dev-port");
    const content = await fsp.readFile(portFile, "utf-8");
    expect(content).toBe("3002");
  });

  // Unit: cleanup 시 .dev-port 삭제
  it("removes .dev-port file during cleanup", async () => {
    portCheckResults = [true];
    await workerFns["start"]({ mainJsPath: mockMainJsPath });

    const portFile = path.join(mockMainDir, ".dev-port");
    expect(fs.existsSync(portFile)).toBe(true);

    const { registerCleanupHandlers } = await import("../../src/utils/worker-utils");
    const cleanupFn = vi.mocked(registerCleanupHandlers).mock.calls[0][0];
    await cleanupFn();

    expect(fs.existsSync(portFile)).toBe(false);
  });

  it("sends error event when main.js does not export server", async () => {
    // Create a temp file without server export
    const noServerPath = path.join(os.tmpdir(), `sd-cli-test-no-server-${Date.now()}.mjs`);
    await fsp.writeFile(noServerPath, "export const notAServer = true;\n");

    try {
      await workerFns["start"]({ mainJsPath: noServerPath });

      expect(mockSend).toHaveBeenCalledWith(
        "error",
        expect.objectContaining({
          message: expect.stringContaining("must export a server instance"),
        }),
      );
    } finally {
      await fsp.unlink(noServerPath).catch(() => {});
    }
  });
});
