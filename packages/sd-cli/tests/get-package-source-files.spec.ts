import { describe, expect, it } from "vitest";
import path from "path";
import type ts from "typescript";
import { getPackageSourceFiles, getPackageFiles } from "../src/utils/tsconfig";

describe("getPackageSourceFiles", () => {
  const sep = path.sep;

  it("filters files within package src directory only", () => {
    const pkgDir = `/project/packages/core-common`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-common/src/utils/string.ts`,
        `/project/packages/core-common/tests/utils.spec.ts`,
        `/project/packages/core-node/src/index.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    expect(result).toEqual([
      `/project/packages/core-common/src/index.ts`,
      `/project/packages/core-common/src/utils/string.ts`,
    ]);
  });

  it("excludes files from similar package names (core vs core-common)", () => {
    const pkgDir = `/project/packages/core`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core/src/index.ts`,
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-node/src/index.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    // core-common, core-node are excluded, only core is included
    expect(result).toEqual([`/project/packages/core/src/index.ts`]);
  });

  it("excludes files outside src directory (tests, scripts, etc)", () => {
    const pkgDir = `/project/packages/cli`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/cli/src/index.ts`,
        `/project/packages/cli/src/commands/lint.ts`,
        `/project/packages/cli/tests/lint.spec.ts`,
        `/project/packages/cli/scripts/build.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    expect(result).toEqual([
      `/project/packages/cli/src/index.ts`,
      `/project/packages/cli/src/commands/lint.ts`,
    ]);
  });

  it("returns empty array if no files", () => {
    const pkgDir = `/project/packages/empty`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core/src/index.ts`,
        `/project/packages/core-common/src/index.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    expect(result).toEqual([]);
  });

  it("handles path separators correctly", () => {
    // use path.sep for platform-independent test
    const pkgDir = `${sep}project${sep}packages${sep}core`;
    const parsedConfig = {
      fileNames: [
        `${sep}project${sep}packages${sep}core${sep}src${sep}index.ts`,
        `${sep}project${sep}packages${sep}core-common${sep}src${sep}index.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    expect(result).toEqual([`${sep}project${sep}packages${sep}core${sep}src${sep}index.ts`]);
  });

  it("handles forward slash paths from TypeScript API correctly (Windows compatible)", () => {
    // TypeScript API returns forward slash paths even on Windows
    // pkgDir is created with path.join using OS-native separator
    const pkgDir = path.resolve("/project/packages/core-common");
    const parsedConfig = {
      fileNames: [
        "/project/packages/core-common/src/index.ts",
        "/project/packages/core-common/src/utils/string.ts",
        "/project/packages/core-common/tests/utils.spec.ts",
        "/project/packages/core-node/src/index.ts",
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    expect(result).toHaveLength(2);
    expect(result.every((f) => f.includes("core-common") && f.includes("src"))).toBe(true);
  });
});

describe("getPackageFiles", () => {
  it("filters all files within package directory (src + tests)", () => {
    const pkgDir = `/project/packages/core-common`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-common/src/utils/string.ts`,
        `/project/packages/core-common/tests/utils.spec.ts`,
        `/project/packages/core-common/tests/setup/helpers.ts`,
        `/project/packages/core-node/src/index.ts`,
        `/project/packages/core-node/tests/fs.spec.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([
      `/project/packages/core-common/src/index.ts`,
      `/project/packages/core-common/src/utils/string.ts`,
      `/project/packages/core-common/tests/utils.spec.ts`,
      `/project/packages/core-common/tests/setup/helpers.ts`,
    ]);
  });

  it("excludes files from similar package names (core vs core-common)", () => {
    const pkgDir = `/project/packages/core`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core/src/index.ts`,
        `/project/packages/core/tests/utils.spec.ts`,
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-common/tests/utils.spec.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([
      `/project/packages/core/src/index.ts`,
      `/project/packages/core/tests/utils.spec.ts`,
    ]);
  });

  it("returns empty array if no files", () => {
    const pkgDir = `/project/packages/empty`;
    const parsedConfig = {
      fileNames: [`/project/packages/core/src/index.ts`],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([]);
  });

  it("handles forward slash paths from TypeScript API correctly (Windows compatible)", () => {
    const pkgDir = path.resolve("/project/packages/core-common");
    const parsedConfig = {
      fileNames: [
        "/project/packages/core-common/src/index.ts",
        "/project/packages/core-common/tests/utils.spec.ts",
        "/project/packages/core-node/src/index.ts",
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toHaveLength(2);
    expect(result.every((f) => f.includes("core-common"))).toBe(true);
  });
});
