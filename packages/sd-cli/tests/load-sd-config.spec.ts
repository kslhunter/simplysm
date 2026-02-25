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

  it("throws error if sd.config.ts file not found", async () => {
    vi.mocked(fsExists).mockResolvedValue(false);

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts file not found",
    );
  });

  it("throws error if no default export", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      someOtherExport: () => ({}),
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts must export a function as default",
    );
  });

  it("throws error if default export is not function", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: { packages: {} }, // object not function
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      "sd.config.ts must export a function as default",
    );
  });

  it("throws error if return value is wrong format (missing packages)", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({}), // missing packages property
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      /sd\.config\.ts return value is not in .* correct format/,
    );
  });

  it("throws error if return value is wrong format (packages is array)", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: [] }), // packages is array
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      /sd\.config\.ts return value is not in .* correct format/,
    );
  });

  it("throws error if return value is wrong format (packages is null)", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: null }),
    });

    await expect(loadSdConfig({ cwd: "/project", dev: false, opt: [] })).rejects.toThrow(
      /sd\.config\.ts return value is not in .* correct format/,
    );
  });

  it("returns correct config", async () => {
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

  it("empty packages object is valid", async () => {
    vi.mocked(fsExists).mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: {} }),
    });

    const config = await loadSdConfig({ cwd: "/project", dev: false, opt: [] });

    expect(config.packages).toEqual({});
  });

  it("handles async function default export correctly", async () => {
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
