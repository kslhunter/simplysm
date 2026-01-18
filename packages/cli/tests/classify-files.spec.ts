import { describe, expect, it } from "vitest";
import { classifyFiles } from "../src/commands/typecheck";
import type { SdConfig } from "../src/sd-config.types";

describe("classifyFiles", () => {
  const cwd = "/project";
  const config: SdConfig = {
    packages: {
      "core-common": { target: "neutral" },
      "core-node": { target: "node" },
      "core-browser": { target: "browser" },
    },
  };

  it("packages 디렉토리 파일을 올바르게 분류", () => {
    const fileNames = [
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-common/src/utils.ts",
      "/project/packages/core-node/src/index.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.size).toBe(2);
    expect(result.byPackage.get("core-common")?.info.target).toBe("neutral");
    expect(result.byPackage.get("core-common")?.files).toHaveLength(2);
    expect(result.byPackage.get("core-node")?.info.target).toBe("node");
    expect(result.byPackage.get("core-node")?.files).toHaveLength(1);
    expect(result.byTests.size).toBe(0);
    expect(result.root).toHaveLength(0);
  });

  it("tests 디렉토리 파일을 올바르게 분류", () => {
    const fileNames = [
      "/project/tests/orm/src/test.spec.ts",
      "/project/tests/service/src/test.spec.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.size).toBe(0);
    expect(result.byTests.size).toBe(2);
    expect(result.byTests.get("orm")?.info.name).toBe("orm");
    expect(result.byTests.get("service")?.info.name).toBe("service");
    expect(result.root).toHaveLength(0);
  });

  it("루트 파일을 올바르게 분류", () => {
    const fileNames = [
      "/project/sd.config.ts",
      "/project/vitest.config.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.size).toBe(0);
    expect(result.byTests.size).toBe(0);
    expect(result.root).toHaveLength(2);
    expect(result.root).toContain("/project/sd.config.ts");
    expect(result.root).toContain("/project/vitest.config.ts");
  });

  it("혼합된 파일을 올바르게 분류", () => {
    const fileNames = [
      "/project/packages/core-common/src/index.ts",
      "/project/tests/orm/src/test.spec.ts",
      "/project/sd.config.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.size).toBe(1);
    expect(result.byTests.size).toBe(1);
    expect(result.root).toHaveLength(1);
  });

  it("설정에 없는 패키지는 neutral 타겟으로 분류", () => {
    const fileNames = [
      "/project/packages/unknown-package/src/index.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.get("unknown-package")?.info.target).toBe("neutral");
  });

  it("빈 파일 목록 처리", () => {
    const result = classifyFiles([], cwd, config);

    expect(result.byPackage.size).toBe(0);
    expect(result.byTests.size).toBe(0);
    expect(result.root).toHaveLength(0);
  });
});
