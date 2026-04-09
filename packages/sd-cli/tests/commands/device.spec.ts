import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Capacitor } from "../../src/capacitor/capacitor";
import { Electron } from "../../src/electron/electron";
import * as sdConfigModule from "../../src/utils/sd-config";
import { runDevice } from "../../src/commands/device";

const mocks = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  httpGet: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    readFileSync: (...args: any[]) => mocks.readFileSync(...args),
    existsSync: (...args: any[]) => mocks.existsSync(...args),
  },
  readFileSync: (...args: any[]) => mocks.readFileSync(...args),
  existsSync: (...args: any[]) => mocks.existsSync(...args),
}));

vi.mock("node:http", () => ({
  default: {
    get: (...args: any[]) => mocks.httpGet(...args),
  },
  get: (...args: any[]) => mocks.httpGet(...args),
}));

describe("runDevice", () => {
  const mockCapacitorInstance = {
    initialize: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue(undefined),
    build: vi.fn().mockResolvedValue(undefined),
  };
  const mockElectronInstance = {
    initialize: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue(undefined),
    build: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Capacitor, "create").mockResolvedValue(mockCapacitorInstance as any);
    vi.spyOn(Electron, "create").mockResolvedValue(mockElectronInstance as any);
    vi.spyOn(sdConfigModule, "loadSdConfig");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Acceptance: Scenario "device 명령어로 Capacitor 앱 실행"
  it("runs Capacitor.create + run when capacitor config exists", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "client-pda": {
          target: "client",
          server: 40480,
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        },
      },
    });

    await runDevice({ target: "client-pda", options: [] });

    expect(Capacitor.create).toHaveBeenCalledWith(
      expect.stringContaining("client-pda"),
      { appId: "com.test.app", appName: "TestApp" },
      undefined,
    );
    expect(mockCapacitorInstance.run).toHaveBeenCalledWith("http://localhost:40480/client-pda/");
  });

  // Acceptance: Scenario "device 명령어로 Electron 앱 실행"
  it("runs Electron.create + run when electron config exists", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "my-client": {
          target: "client",
          server: 4200,
          electron: { appId: "com.test.electron" },
        },
      },
    });

    await runDevice({ target: "my-client", options: [] });

    expect(Electron.create).toHaveBeenCalledWith(
      expect.stringContaining("my-client"),
      { appId: "com.test.electron" },
      undefined,
    );
    expect(mockElectronInstance.run).toHaveBeenCalledWith("http://localhost:4200/my-client/");
  });

  // Acceptance: Scenario "device 명령어에 URL 옵션 지정"
  it("uses provided URL instead of auto-generated one", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "client-pda": {
          target: "client",
          server: 40480,
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        },
      },
    });

    await runDevice({ target: "client-pda", url: "http://192.168.1.100:4200", options: [] });

    expect(mockCapacitorInstance.run).toHaveBeenCalledWith("http://192.168.1.100:4200");
  });

  // Unit: electron이 capacitor보다 우선 (v13 동작)
  it("prefers electron over capacitor when both are configured", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "my-client": {
          target: "client",
          server: 4200,
          capacitor: { appId: "com.test.app", appName: "TestApp" },
          electron: { appId: "com.test.electron" },
        },
      },
    });

    await runDevice({ target: "my-client", options: [] });

    expect(Electron.create).toHaveBeenCalled();
    expect(Capacitor.create).not.toHaveBeenCalled();
  });

  // Unit: 존재하지 않는 패키지 에러
  it("throws when package does not exist", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "other-pkg": { target: "node" },
      },
    });

    await expect(runDevice({ target: "nonexistent", options: [] })).rejects.toThrow();
  });

  // Unit: client가 아닌 패키지 에러
  it("throws when package is not a client target", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "my-server": { target: "server" },
      },
    });

    await expect(runDevice({ target: "my-server", options: [] })).rejects.toThrow();
  });

  // Acceptance: Scenario "server가 string일 때 서버 패키지의 .dev-port에서 포트 읽기"
  it("reads .dev-port from server package directory when server is a string", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "client-devtool": {
          target: "client",
          server: "my-server",
          electron: { appId: "com.test.electron" },
        },
      },
    });

    mocks.readFileSync.mockReturnValue("3000");

    // HTTP 헬스체크 성공 mock
    mocks.httpGet.mockImplementation((_url: string, cb: Function) => {
      const res = { resume: vi.fn() };
      cb(res);
      return { on: vi.fn(), setTimeout: vi.fn() };
    });

    await runDevice({ target: "client-devtool", options: [] });

    // 서버 패키지 경로의 .dev-port를 읽어야 함
    expect(mocks.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining("my-server"),
      "utf-8",
    );
    expect(mockElectronInstance.run).toHaveBeenCalledWith(
      "http://localhost:3000/client-devtool/",
    );
  });

  // Acceptance: Scenario "dev 서버 미실행 시 에러"
  it("throws when .dev-port file does not exist and server is a string", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "client-devtool": {
          target: "client",
          server: "my-server",
          electron: { appId: "com.test.electron" },
        },
      },
    });

    mocks.readFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    await expect(runDevice({ target: "client-devtool", options: [] })).rejects.toThrow(
      "dev 서버가 실행 중이 아닙니다",
    );
  });

  // Acceptance: Scenario "stale 포트 파일 존재 시 헬스체크 실패 에러"
  it("throws when .dev-port exists but health check fails", async () => {
    vi.mocked(sdConfigModule.loadSdConfig).mockResolvedValue({
      packages: {
        "client-devtool": {
          target: "client",
          server: "my-server",
          electron: { appId: "com.test.electron" },
        },
      },
    });

    mocks.readFileSync.mockReturnValue("5173");

    // HTTP 헬스체크 실패 mock
    mocks.httpGet.mockImplementation((_url: string, _cb: Function) => {
      const req = {
        on: vi.fn((event: string, handler: Function) => {
          if (event === "error") handler(new Error("ECONNREFUSED"));
        }),
        setTimeout: vi.fn(),
      };
      return req;
    });

    await expect(runDevice({ target: "client-devtool", options: [] })).rejects.toThrow(
      "dev 서버가 응답하지 않습니다",
    );
  });
});
