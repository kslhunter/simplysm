import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExists = vi.fn();
const mockJitiImport = vi.fn();

vi.mock("@simplysm/core-node", () => ({
  fsx: {
    exists: (...args: unknown[]) => mockExists(...args),
  },
}));

vi.mock("jiti", () => ({
  createJiti: () => ({
    import: (...args: unknown[]) => mockJitiImport(...args),
  }),
}));

const { loadSdConfig } = await import("../../src/utils/sd-config");

describe("loadSdConfig", () => {
  const baseParams = { cwd: "/project", dev: true, options: [] as string[] };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns SdConfig on valid config", async () => {
    mockExists.mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ packages: { core: { target: "node" } } }),
    });

    const config = await loadSdConfig(baseParams);
    expect(config.packages).toBeDefined();
    expect(config.packages["core"]).toEqual({ target: "node" });
  });

  it("throws when sd.config.ts does not exist", async () => {
    mockExists.mockResolvedValue(false);

    await expect(loadSdConfig(baseParams)).rejects.toThrow("sd.config.ts file not found");
  });

  it("throws when default export is not a function", async () => {
    mockExists.mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({ default: "not-a-function" });

    await expect(loadSdConfig(baseParams)).rejects.toThrow("must export a function as default");
  });

  it("throws when module has no default export", async () => {
    mockExists.mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({ notDefault: true });

    await expect(loadSdConfig(baseParams)).rejects.toThrow("must export a function as default");
  });

  it("throws when config has no packages property", async () => {
    mockExists.mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({
      default: () => ({ noPkgs: true }),
    });

    await expect(loadSdConfig(baseParams)).rejects.toThrow("not in the correct format");
  });

  it("passes params to the config function", async () => {
    const configFn = vi.fn(() => ({ packages: { a: { target: "node" } } }));
    mockExists.mockResolvedValue(true);
    mockJitiImport.mockResolvedValue({ default: configFn });

    const params = { cwd: "/project", dev: true, options: ["key=val"] };
    await loadSdConfig(params);

    expect(configFn).toHaveBeenCalledWith(params);
  });
});
