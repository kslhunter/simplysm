import { describe, expect, test } from "vitest";
import { resolveReplaceDepEntries } from "../src/utils/replace-deps";

describe("resolveReplaceDepEntries", () => {
  test("glob * 패턴이 캡처되어 소스 경로의 *에 치환된다", () => {
    const result = resolveReplaceDepEntries({ "@simplysm/*": "../simplysm/packages/*" }, [
      "@simplysm/solid",
      "@simplysm/core-common",
    ]);
    expect(result).toEqual([
      { targetName: "@simplysm/solid", sourcePath: "../simplysm/packages/solid" },
      { targetName: "@simplysm/core-common", sourcePath: "../simplysm/packages/core-common" },
    ]);
  });

  test("* 없는 정확한 패키지명도 매칭된다", () => {
    const result = resolveReplaceDepEntries({ "@other/lib": "../other-project/lib" }, ["@other/lib", "@other/unused"]);
    expect(result).toEqual([{ targetName: "@other/lib", sourcePath: "../other-project/lib" }]);
  });

  test("매칭되지 않는 패키지는 결과에 포함되지 않는다", () => {
    const result = resolveReplaceDepEntries({ "@simplysm/*": "../simplysm/packages/*" }, ["@other/lib"]);
    expect(result).toEqual([]);
  });

  test("여러 replaceDeps 항목이 모두 처리된다", () => {
    const result = resolveReplaceDepEntries(
      {
        "@simplysm/*": "../simplysm/packages/*",
        "@other/lib": "../other/lib",
      },
      ["@simplysm/solid", "@other/lib"],
    );
    expect(result).toEqual([
      { targetName: "@simplysm/solid", sourcePath: "../simplysm/packages/solid" },
      { targetName: "@other/lib", sourcePath: "../other/lib" },
    ]);
  });
});
