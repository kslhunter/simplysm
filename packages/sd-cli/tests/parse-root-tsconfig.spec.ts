import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import ts from "typescript";

// typescript 모킹
vi.mock("typescript", async (importOriginal) => {
  const actual = await importOriginal<typeof ts>();
  return {
    ...actual,
    default: {
      ...actual,
      readConfigFile: vi.fn(),
      parseJsonConfigFileContent: vi.fn(),
      flattenDiagnosticMessageText: actual.flattenDiagnosticMessageText,
      sys: actual.sys,
    },
  };
});

import { parseRootTsconfig } from "../src/utils/tsconfig";

describe("parseRootTsconfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("successfully parses valid tsconfig.json", () => {
    const cwd = "/project";
    const mockConfig = { compilerOptions: { strict: true } };
    const mockParsedConfig: ts.ParsedCommandLine = {
      options: { strict: true },
      fileNames: ["/project/src/index.ts"],
      errors: [],
    };

    vi.mocked(ts.readConfigFile).mockReturnValue({ config: mockConfig });
    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue(mockParsedConfig);

    const result = parseRootTsconfig(cwd);

    expect(ts.readConfigFile).toHaveBeenCalledWith(
      path.join("/project", "tsconfig.json"),
      ts.sys.readFile,
    );
    expect(result).toEqual(mockParsedConfig);
  });

  it("throws error when tsconfig.json fails to read", () => {
    const cwd = "/project";
    const mockError: ts.Diagnostic = {
      category: ts.DiagnosticCategory.Error,
      code: 5083,
      messageText: "Cannot read file",
      file: undefined,
      start: undefined,
      length: undefined,
    };

    vi.mocked(ts.readConfigFile).mockReturnValue({ error: mockError });

    expect(() => parseRootTsconfig(cwd)).toThrow("tsconfig.json 읽기 실패");
  });

  it("throws error when tsconfig.json fails to parse", () => {
    const cwd = "/project";
    const mockConfig = { compilerOptions: { strict: true } };
    const mockError: ts.Diagnostic = {
      category: ts.DiagnosticCategory.Error,
      code: 5024,
      messageText: "Invalid option",
      file: undefined,
      start: undefined,
      length: undefined,
    };

    vi.mocked(ts.readConfigFile).mockReturnValue({ config: mockConfig });
    vi.mocked(ts.parseJsonConfigFileContent).mockReturnValue({
      options: {},
      fileNames: [],
      errors: [mockError],
    });

    expect(() => parseRootTsconfig(cwd)).toThrow("tsconfig.json 파싱 실패");
  });
});
