import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWriteJson, mockReadJson, mockExists } = vi.hoisted(() => ({
  mockWriteJson: vi.fn().mockResolvedValue(undefined),
  mockReadJson: vi.fn(),
  mockExists: vi.fn(),
}));

vi.mock("@simplysm/core-node", () => ({
  fsx: {
    readJson: mockReadJson,
    exists: mockExists,
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeJson: mockWriteJson,
    write: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("consola", () => {
  const withTag = () => ({ debug: vi.fn(), warn: vi.fn() });
  const consola = { withTag };
  return { default: consola, consola };
});

vi.mock("sharp", () => ({ default: vi.fn() }));
vi.mock("execa", () => ({ execa: vi.fn() }));

import { Capacitor } from "../src/capacitor/capacitor";

describe("Capacitor exclude packages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadJson.mockImplementation((filePath: string) => {
      if (filePath.includes(".capacitor")) {
        return Promise.resolve({ name: "", version: "", dependencies: {} });
      }
      return Promise.resolve({
        name: "@test/app",
        version: "1.0.0",
        dependencies: { "jeep-sqlite": "^0.0.1" },
      });
    });
    mockExists.mockImplementation((filePath: string) => {
      if (filePath.endsWith("package.json")) return Promise.resolve(true);
      return Promise.resolve(false);
    });
  });

  it("exclude 패키지가 .capacitor/package.json dependencies에 추가된다", async () => {
    const cap = await Capacitor.create("/test/packages/app", {
      appId: "com.test.app",
      appName: "Test App",
    }, ["jeep-sqlite"]);

    await (cap as unknown as { _setupNpmConf(): Promise<boolean> })._setupNpmConf();

    expect(mockWriteJson).toHaveBeenCalled();
    const writtenConfig = mockWriteJson.mock.calls[0][1] as {
      dependencies: Record<string, string>;
    };
    expect(writtenConfig.dependencies["jeep-sqlite"]).toBe("^0.0.1");
  });

  it("exclude 없이 생성해도 정상 동작한다", async () => {
    const cap = await Capacitor.create("/test/packages/app", {
      appId: "com.test.app",
      appName: "Test App",
    });

    await (cap as unknown as { _setupNpmConf(): Promise<boolean> })._setupNpmConf();

    expect(mockWriteJson).toHaveBeenCalled();
    const writtenConfig = mockWriteJson.mock.calls[0][1] as {
      dependencies: Record<string, string>;
    };
    expect(writtenConfig.dependencies["jeep-sqlite"]).toBeUndefined();
  });
});
