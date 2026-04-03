import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SdConfig } from "../../src/sd-config.types";

//#region Mocks

const mocks = vi.hoisted(() => ({
  loadSdConfig: vi.fn(),
  validateTargets: vi.fn(),
}));

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: mocks.loadSdConfig,
}));

vi.mock("../../src/utils/package-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/package-utils")>();
  return {
    ...actual,
    validateTargets: mocks.validateTargets,
  };
});

vi.mock("consola", () => {
  const fns = (): Record<string, unknown> => ({
    debug: vi.fn(), start: vi.fn(), success: vi.fn(),
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), log: vi.fn(),
    withTag: vi.fn(() => fns()),
    level: 0,
  });
  const c = fns();
  return { consola: c, default: c };
});

const { loadAndValidateConfig } = await import("../../src/utils/orchestrator-utils");

//#endregion

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadAndValidateConfig", () => {
  // Acceptance: Scenario "BuildOrchestrator가 공유 초기화 유틸을 사용한다"
  it("loads config and validates targets", async () => {
    const config: SdConfig = {
      packages: { "core-common": { target: "neutral" } as any },
    };
    mocks.loadSdConfig.mockResolvedValue(config);

    const result = await loadAndValidateConfig({
      cwd: "/test",
      dev: false,
      options: [],
      targets: ["core-common"],
    });

    expect(mocks.loadSdConfig).toHaveBeenCalledWith({
      cwd: "/test",
      dev: false,
      opt: [],
    });
    expect(mocks.validateTargets).toHaveBeenCalledWith(
      ["core-common"],
      config.packages,
    );
    expect(result).toBe(config);
  });

  // Acceptance: Scenario "DevWatchOrchestrator가 공유 초기화 유틸을 사용한다"
  it("works with dev:true for DevWatchOrchestrator", async () => {
    const config: SdConfig = {
      packages: { "demo-server": { target: "server" } as any },
    };
    mocks.loadSdConfig.mockResolvedValue(config);

    const result = await loadAndValidateConfig({
      cwd: "/test",
      dev: true,
      options: ["key=value"],
      targets: [],
    });

    expect(mocks.loadSdConfig).toHaveBeenCalledWith({
      cwd: "/test",
      dev: true,
      opt: ["key=value"],
    });
    expect(mocks.validateTargets).toHaveBeenCalledWith([], config.packages);
    expect(result).toBe(config);
  });

  // Unit: propagates loadSdConfig error
  it("propagates loadSdConfig error", async () => {
    mocks.loadSdConfig.mockRejectedValue(new Error("config error"));

    await expect(
      loadAndValidateConfig({ cwd: "/test", dev: false, options: [], targets: [] }),
    ).rejects.toThrow("config error");
  });

  // Unit: propagates validateTargets error
  it("propagates validateTargets error", async () => {
    mocks.loadSdConfig.mockResolvedValue({ packages: {} });
    mocks.validateTargets.mockImplementation(() => {
      throw new Error("Unknown target: bad");
    });

    await expect(
      loadAndValidateConfig({ cwd: "/test", dev: false, options: [], targets: ["bad"] }),
    ).rejects.toThrow("Unknown target: bad");
  });
});
