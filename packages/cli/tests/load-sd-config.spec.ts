import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockJitiImport = vi.fn();

vi.mock("@simplysm/core-node", () => ({
  fsExists: vi.fn(),
}));

vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: mockJitiImport,
  })),
}));

import { fsExists } from "@simplysm/core-node";
import { loadSdConfig } from "../src/utils/sd-config";

describe("loadSdConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sd.config.ts 파일이 없으면 에러", async () => {
    vi.mocked(fsExists).mockResolvedValue(false);

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts 파일을 찾을 수 없습니다",
    );
  });

  it("default export가 없으면 에러", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      someOtherExport: () => ({}),
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts는 함수를 default export해야 합니다",
    );
  });

  it("default export가 함수가 아니면 에러", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: { packages: {} }, // 함수가 아닌 객체
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts는 함수를 default export해야 합니다",
    );
  });

  it("반환값이 올바른 형식이 아니면 에러 (packages 없음)", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({}), // packages 속성 없음
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts의 반환값이 올바른 형식이 아닙니다",
    );
  });

  it("반환값이 올바른 형식이 아니면 에러 (packages가 배열)", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: [] }), // packages가 배열
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts의 반환값이 올바른 형식이 아닙니다",
    );
  });

  it("반환값이 올바른 형식이 아니면 에러 (packages가 null)", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: null }),
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts의 반환값이 올바른 형식이 아닙니다",
    );
  });

  it("올바른 설정 반환", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({
        packages: {
          "core-common": { target: "neutral" },
          "core-node": { target: "node" },
        },
      }),
    });

    const config = await loadSdConfig({ cwd: "/project", dev: false, opt: [] });

    expect(config.packages).toEqual({
      "core-common": { target: "neutral" },
      "core-node": { target: "node" },
    });
  });

  it("빈 packages 객체도 유효", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: {} }),
    });

    const config = await loadSdConfig({ cwd: "/project", dev: false, opt: [] });

    expect(config.packages).toEqual({});
  });

  it("async 함수를 default export한 경우도 정상 처리", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/require-await
      default: async () => ({
        packages: {
          "core-common": { target: "neutral" },
        },
      }),
    });

    const config = await loadSdConfig({ cwd: "/project", dev: false, opt: [] });

    expect(config.packages).toEqual({
      "core-common": { target: "neutral" },
    });
  });
});
