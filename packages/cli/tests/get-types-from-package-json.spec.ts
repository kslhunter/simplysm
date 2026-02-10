import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// core-node 함수 모킹
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

  it("@types/* devDependencies를 types 목록으로 변환", async () => {
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

  it("package.json이 없으면 빈 배열 반환", async () => {
    const packageDir = "/project/packages/unknown";
    const mockFsExists = vi.mocked(fsExists);

    mockFsExists.mockResolvedValue(false);

    const result = await getTypesFromPackageJson(packageDir);

    expect(result).toEqual([]);
  });

  it("devDependencies가 없으면 빈 배열 반환", async () => {
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

  it("@types/*가 아닌 의존성은 필터링", async () => {
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

  it("scoped @types 패키지도 올바르게 처리", async () => {
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
