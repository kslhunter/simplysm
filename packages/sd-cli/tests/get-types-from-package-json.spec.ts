import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// Mock core-node functions
vi.mock("@simplysm/core-node", () => ({
  fsExists: vi.fn(),
  fsReadJson: vi.fn(),
  pathPosix: vi.fn((p: string) => p.replace(/\\/g, "/")),
}));

import { fsExists, fsReadJson } from "@simplysm/core-node";
import { getTypesFromPackageJson } from "../src/utils/tsconfig";

describe("getTypesFromPackageJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts @types/* devDependencies to types list", async () => {
    const packageDir = "/project/packages/core-common";
    const mockFsExists = vi.mocked(fsExists);
    const mockFsReadJson = vi.mocked(fsReadJson);

    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/express": "^4.17.0",
        "typescript": "^5.0.0",
        "vitest": "^1.0.0",
      },
    });

    const result = await getTypesFromPackageJson(packageDir);

    expect(mockFsExists).toHaveBeenCalledWith(path.join(packageDir, "package.json"));
    expect(result).toEqual(["node", "express"]);
  });

  it("returns empty array if package.json does not exist", async () => {
    const packageDir = "/project/packages/unknown";
    const mockFsExists = vi.mocked(fsExists);

    mockFsExists.mockResolvedValue(false);

    const result = await getTypesFromPackageJson(packageDir);

    expect(result).toEqual([]);
  });

  it("returns empty array if devDependencies does not exist", async () => {
    const packageDir = "/project/packages/core-common";
    const mockFsExists = vi.mocked(fsExists);
    const mockFsReadJson = vi.mocked(fsReadJson);

    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      name: "@simplysm/core-common",
      version: "1.0.0",
    });

    const result = await getTypesFromPackageJson(packageDir);

    expect(result).toEqual([]);
  });

  it("filters out dependencies that are not @types/*", async () => {
    const packageDir = "/project/packages/core-common";
    const mockFsExists = vi.mocked(fsExists);
    const mockFsReadJson = vi.mocked(fsReadJson);

    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      devDependencies: {
        typescript: "^5.0.0",
        vitest: "^1.0.0",
        eslint: "^9.0.0",
      },
    });

    const result = await getTypesFromPackageJson(packageDir);

    expect(result).toEqual([]);
  });

  it("handles scoped @types packages correctly", async () => {
    const packageDir = "/project/packages/core-common";
    const mockFsExists = vi.mocked(fsExists);
    const mockFsReadJson = vi.mocked(fsReadJson);

    mockFsExists.mockResolvedValue(true);
    mockFsReadJson.mockResolvedValue({
      devDependencies: {
        "@types/node": "^20.0.0",
        "@types/babel__core": "^7.0.0",
      },
    });

    const result = await getTypesFromPackageJson(packageDir);

    expect(result).toEqual(["node", "babel__core"]);
  });
});
