import { describe, expect, it } from "vitest";
import path from "path";
import type ts from "typescript";
import { getPackageSourceFiles, getPackageFiles } from "../src/utils/tsconfig";

describe("getPackageSourceFiles", () => {
  const sep = path.sep;

  it("패키지 src 디렉토리 내 파일만 필터링", () => {
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

  it("유사한 이름의 다른 패키지 파일 제외 (core vs core-common)", () => {
    const pkgDir = `/project/packages/core`;
    const parsedConfig = {
      fileNames: [
        `/project/packages/core/src/index.ts`,
        `/project/packages/core-common/src/index.ts`,
        `/project/packages/core-node/src/index.ts`,
      ],
    } as ts.ParsedCommandLine;

    const result = getPackageSourceFiles(pkgDir, parsedConfig);

    // core-common, core-node는 제외되고 core만 포함
    expect(result).toEqual([`/project/packages/core/src/index.ts`]);
  });

  it("src 디렉토리 외부 파일 제외 (tests, scripts 등)", () => {
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

  it("파일이 없으면 빈 배열 반환", () => {
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

  it("경로 구분자를 올바르게 처리", () => {
    // path.sep을 사용하여 플랫폼 독립적인 테스트
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

  it("TypeScript API의 forward slash 경로도 올바르게 필터링 (Windows 호환)", () => {
    // TypeScript API는 Windows에서도 forward slash 경로를 반환
    // pkgDir은 path.join으로 생성되어 OS-native 구분자 사용
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
  it("패키지 디렉토리 내 모든 파일 필터링 (src + tests)", () => {
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

  it("유사한 이름의 다른 패키지 파일 제외 (core vs core-common)", () => {
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

  it("파일이 없으면 빈 배열 반환", () => {
    const pkgDir = `/project/packages/empty`;
    const parsedConfig = {
      fileNames: [`/project/packages/core/src/index.ts`],
    } as ts.ParsedCommandLine;

    const result = getPackageFiles(pkgDir, parsedConfig);

    expect(result).toEqual([]);
  });

  it("TypeScript API의 forward slash 경로도 올바르게 필터링 (Windows 호환)", () => {
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
