import { describe, it, expect, vi, beforeEach } from "vitest";

// Capacitor mock
const mockCapacitorInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
  build: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../src/capacitor/capacitor", () => ({
  Capacitor: {
    create: vi.fn().mockResolvedValue(mockCapacitorInstance),
  },
}));

// Electron mock
const mockElectronInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
  build: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../src/electron/electron", () => ({
  Electron: {
    create: vi.fn().mockResolvedValue(mockElectronInstance),
  },
}));

// loadSdConfig mock
vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: vi.fn(),
}));

const { Capacitor } = await import("../../src/capacitor/capacitor");
const { Electron } = await import("../../src/electron/electron");
const { loadSdConfig } = await import("../../src/utils/sd-config");
const { runDevice } = await import("../../src/commands/device");

describe("runDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCapacitorInstance.run.mockResolvedValue(undefined);
    mockElectronInstance.run.mockResolvedValue(undefined);
  });

  // Acceptance: Scenario "device 명령어로 Capacitor 앱 실행"
  it("runs Capacitor.create + run when capacitor config exists", async () => {
    vi.mocked(loadSdConfig).mockResolvedValue({
      packages: {
        "client-pda": {
          target: "client",
          server: 40480,
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        },
      },
    });

    await runDevice({ package: "client-pda", options: [] });

    expect(Capacitor.create).toHaveBeenCalledWith(
      expect.stringContaining("client-pda"),
      { appId: "com.test.app", appName: "TestApp" },
      undefined,
    );
    expect(mockCapacitorInstance.run).toHaveBeenCalledWith("http://localhost:40480");
  });

  // Acceptance: Scenario "device 명령어로 Electron 앱 실행"
  it("runs Electron.create + run when electron config exists", async () => {
    vi.mocked(loadSdConfig).mockResolvedValue({
      packages: {
        "my-client": {
          target: "client",
          server: 4200,
          electron: { appId: "com.test.electron" },
        },
      },
    });

    await runDevice({ package: "my-client", options: [] });

    expect(Electron.create).toHaveBeenCalledWith(
      expect.stringContaining("my-client"),
      { appId: "com.test.electron" },
      undefined,
    );
    expect(mockElectronInstance.run).toHaveBeenCalledWith("http://localhost:4200");
  });

  // Acceptance: Scenario "device 명령어에 URL 옵션 지정"
  it("uses provided URL instead of auto-generated one", async () => {
    vi.mocked(loadSdConfig).mockResolvedValue({
      packages: {
        "client-pda": {
          target: "client",
          server: 40480,
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        },
      },
    });

    await runDevice({ package: "client-pda", url: "http://192.168.1.100:4200", options: [] });

    expect(mockCapacitorInstance.run).toHaveBeenCalledWith("http://192.168.1.100:4200");
  });

  // Unit: electron이 capacitor보다 우선 (v13 동작)
  it("prefers electron over capacitor when both are configured", async () => {
    vi.mocked(loadSdConfig).mockResolvedValue({
      packages: {
        "my-client": {
          target: "client",
          server: 4200,
          capacitor: { appId: "com.test.app", appName: "TestApp" },
          electron: { appId: "com.test.electron" },
        },
      },
    });

    await runDevice({ package: "my-client", options: [] });

    expect(Electron.create).toHaveBeenCalled();
    expect(Capacitor.create).not.toHaveBeenCalled();
  });

  // Unit: 존재하지 않는 패키지 에러
  it("throws when package does not exist", async () => {
    vi.mocked(loadSdConfig).mockResolvedValue({
      packages: {
        "other-pkg": { target: "node" },
      },
    });

    await expect(runDevice({ package: "nonexistent", options: [] })).rejects.toThrow();
  });

  // Unit: client가 아닌 패키지 에러
  it("throws when package is not a client target", async () => {
    vi.mocked(loadSdConfig).mockResolvedValue({
      packages: {
        "my-server": { target: "server" },
      },
    });

    await expect(runDevice({ package: "my-server", options: [] })).rejects.toThrow();
  });
});
