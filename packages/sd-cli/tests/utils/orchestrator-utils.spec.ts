import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SdConfig } from "../../src/sd-config.types";

import * as sdConfigMod from "../../src/utils/sd-config";
import * as packageUtilsMod from "../../src/utils/package-utils";

const mocks = {
  loadSdConfig: vi.spyOn(sdConfigMod, "loadSdConfig"),
  validateTargets: vi.spyOn(packageUtilsMod, "validateTargets"),
};

import { loadAndValidateConfig } from "../../src/utils/orchestrator-utils";

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

    expect(result).toBe(config);
  });

  // Acceptance: dev:true 모드 동작 확인
  it("works with dev:true", async () => {
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
