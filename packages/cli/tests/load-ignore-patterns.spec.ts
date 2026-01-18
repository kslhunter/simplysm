import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { loadIgnorePatterns } from "../src/commands/lint";
import path from "path";

// FsUtils와 jiti를 모킹
vi.mock("@simplysm/core-node", () => ({
  FsUtils: {
    exists: vi.fn(),
  },
  PathUtils: {
    posix: vi.fn(),
  },
}));

const mockJitiImportFn = vi.fn();
vi.mock("jiti", () => ({
  createJiti: vi.fn(() => ({
    import: mockJitiImportFn,
  })),
}));

import { FsUtils } from "@simplysm/core-node";

describe("loadIgnorePatterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("eslint.config.ts에서 globalIgnores 패턴을 추출", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [
        { ignores: ["node_modules/**", "dist/**"] },
        { files: ["**/*.ts"], rules: {} },
      ],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["node_modules/**", "dist/**"]);
  });

  it("files가 있는 설정은 globalIgnores로 추출하지 않음", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
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

  it("설정 파일이 없으면 에러 발생", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockReturnValue(false);

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow("ESLint 설정 파일을 찾을 수 없습니다");
  });

  it("설정이 배열이 아니면 에러 발생", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: { rules: {} },
    });

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow("ESLint 설정이 배열이 아닙니다");
  });

  it("여러 globalIgnores 설정을 병합", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      default: [
        { ignores: ["node_modules/**"] },
        { ignores: ["dist/**", ".cache/**"] },
      ],
    });

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["node_modules/**", "dist/**", ".cache/**"]);
  });

  it("배열을 직접 export하는 설정도 처리", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.js");
    });

    mockJitiImportFn.mockResolvedValue([
      { ignores: ["build/**"] },
    ]);

    const patterns = await loadIgnorePatterns(cwd);

    expect(patterns).toEqual(["build/**"]);
  });

  it("default도 없고 배열도 아닌 설정은 에러 발생", async () => {
    const cwd = "/project";
    const mockExists = vi.mocked(FsUtils.exists);

    mockExists.mockImplementation((filePath: string) => {
      return filePath === path.join(cwd, "eslint.config.ts");
    });

    mockJitiImportFn.mockResolvedValue({
      config: [{ ignores: ["test/**"] }],
    });

    await expect(loadIgnorePatterns(cwd)).rejects.toThrow(
      "ESLint 설정 파일이 올바른 형식이 아닙니다",
    );
  });
});
