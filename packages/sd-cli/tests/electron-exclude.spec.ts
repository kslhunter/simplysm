import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWriteJson, mockReadJson } = vi.hoisted(() => ({
  mockWriteJson: vi.fn().mockResolvedValue(undefined),
  mockReadJson: vi.fn(),
}));

vi.mock("@simplysm/core-node", () => ({
  fsx: {
    readJson: mockReadJson,
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeJson: mockWriteJson,
  },
}));

vi.mock("consola", () => {
  const withTag = () => ({ debug: vi.fn(), warn: vi.fn() });
  const consola = { withTag };
  return { default: consola, consola };
});

import { Electron } from "../src/electron/electron";

describe("Electron exclude packages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadJson.mockResolvedValue({
      name: "@test/app",
      version: "1.0.0",
      dependencies: { "jeep-sqlite": "^0.0.1" },
    });
  });

  it("exclude 패키지가 .electron/src/package.json dependencies에 추가된다", async () => {
    const electron = await Electron.create("/test/packages/app", {
      appId: "com.test.app",
    }, ["jeep-sqlite"]);

    await (electron as unknown as { _setupPackageJson(p: string): Promise<void> })._setupPackageJson("/test/packages/app/.electron/src");

    expect(mockWriteJson).toHaveBeenCalled();
    const writtenConfig = mockWriteJson.mock.calls[0][1] as {
      dependencies: Record<string, string>;
    };
    expect(writtenConfig.dependencies["jeep-sqlite"]).toBe("^0.0.1");
  });

  it("exclude 없이 생성해도 정상 동작한다", async () => {
    const electron = await Electron.create("/test/packages/app", {
      appId: "com.test.app",
    });

    await (electron as unknown as { _setupPackageJson(p: string): Promise<void> })._setupPackageJson("/test/packages/app/.electron/src");

    expect(mockWriteJson).toHaveBeenCalled();
    const writtenConfig = mockWriteJson.mock.calls[0][1] as {
      dependencies: Record<string, string>;
    };
    expect(writtenConfig.dependencies["jeep-sqlite"]).toBeUndefined();
  });
});
