import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { loadIgnorePatterns } from "../src/commands/lint";
import path from "path";

// Mock core-node functions and jiti
vi.mock("@simplysm/core-node", () => ({
  fsExists: vi.fn(),
  pathPosix: vi.fn(),
}));

const mockJitiImportFn = vi.fn();
vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: mockJitiImportFn,
  })),
}));

import { fsExists } from "@simplysm/core-node";

describe("loadIgnorePatterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts globalIgnores pattern from eslint.config.ts", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**", "dist/**"] }, { files: ["**/*.ts"], rules: {} }],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["node_modules/**", "dist/**"]);
  });

  it("does not extract as globalIgnores if files is present", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [
        { ignores: ["global/**"] },
        { files: ["**/*.ts"], ignores: ["local/**"], rules: {} },
      ],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["global/**"]);
    expect(patterns).not.toContain("local/**");
  });

  it("throws error if config file not found", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockResolvedValue(false);

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow("Cannot find ESLint config file");
  });

  it("throws error if config is not array", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: { rules: {} },
    });

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow("ESLint config is not an array");
  });

  it("merges multiple globalIgnores settings", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["node_modules/**"] }, { ignores: ["dist/**", ".cache/**"] }],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["node_modules/**", "dist/**", ".cache/**"]);
  });

  it("handles config that directly exports array", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.js"));
    });

    mockJitiImportFn.mockResolvedValue([{ ignores: ["build/**"] }]);

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["build/**"]);
  });

  it("throws error if config has no default and is not array", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      config: [{ ignores: ["test/**"] }],
    });

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow(
      "ESLint config file is not valid format",
    );
  });

  it("uses mts file if eslint.config.ts not found", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      // eslint.config.ts does not exist, only eslint.config.mts
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.mts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [{ ignores: ["mts-ignore/**"] }],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["mts-ignore/**"]);
    expect(mockJitiImportFn).toHaveBeenCalledWith(expect.stringContaining("eslint.config.mts"));
  });

  it("returns empty pattern array if empty array exported", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockResolvedValue({
      default: [],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual([]);
  });

  it("propagates error if jiti import fails", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(fsExists);

    mockExists.mockImplementation((filePath: string) => {
      return Promise.resolve(filePath === path.join(cwd, "eslint.config.ts"));
    });

    mockJitiImportFn.mockRejectedValue(new Error("Syntax error in config file"));

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow("Syntax error in config file");
  });
});
