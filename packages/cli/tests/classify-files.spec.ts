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
    // neutral은 node/browser 둘 다
    expect(result.byPackage.get("core-common")?.info.envs).toEqual(["node", "browser"]);
    expect(result.byPackage.get("core-common")?.files).toHaveLength(2);
    // node는 node만
    expect(result.byPackage.get("core-node")?.info.envs).toEqual(["node"]);
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

  it("설정에 없는 패키지는 node/browser 둘 다로 분류", () => {
    const fileNames = [
      "/project/packages/unknown-package/src/index.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.get("unknown-package")?.info.envs).toEqual(["node", "browser"]);
  });

  it("빈 파일 목록 처리", () => {
    const result = classifyFiles([], cwd, config);

    expect(result.byPackage.size).toBe(0);
    expect(result.byPackageTests.size).toBe(0);
    expect(result.byTests.size).toBe(0);
    expect(result.root).toHaveLength(0);
  });

  it("packages/*/tests 디렉토리 파일을 byPackageTests로 분류", () => {
    const fileNames = [
      "/project/packages/core-common/tests/utils.spec.ts",
      "/project/packages/core-node/tests/fs.spec.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.size).toBe(0);
    expect(result.byPackageTests.size).toBe(2);
    expect(result.byPackageTests.get("core-common")?.info.envs).toEqual(["node", "browser"]);
    expect(result.byPackageTests.get("core-node")?.info.envs).toEqual(["node"]);
  });

  it("packages의 src와 tests를 분리 분류", () => {
    const fileNames = [
      "/project/packages/core-common/src/index.ts",
      "/project/packages/core-common/tests/utils.spec.ts",
    ];

    const result = classifyFiles(fileNames, cwd, config);

    expect(result.byPackage.size).toBe(1);
    expect(result.byPackageTests.size).toBe(1);
  });

  it("scripts 타겟 패키지는 분류에서 제외", () => {
    const configWithScripts: SdConfig = {
      packages: {
        "some-scripts": { target: "scripts" },
        "core-common": { target: "neutral" },
      },
    };
    const fileNames = [
      "/project/packages/some-scripts/src/run.ts",
      "/project/packages/some-scripts/tests/run.spec.ts",
      "/project/packages/core-common/src/index.ts",
    ];

    const result = classifyFiles(fileNames, cwd, configWithScripts);

    expect(result.byPackage.size).toBe(1);
    expect(result.byPackage.has("some-scripts")).toBe(false);
    expect(result.byPackage.has("core-common")).toBe(true);
    expect(result.byPackageTests.size).toBe(0);
  });

  it("client 타겟 패키지는 browser 환경으로 분류", () => {
    const configWithClient: SdConfig = {
      packages: {
        "solid-demo": { target: "client", server: 3000 },
      },
    };
    const fileNames = [
      "/project/packages/solid-demo/src/main.tsx",
    ];

    const result = classifyFiles(fileNames, cwd, configWithClient);

    expect(result.byPackage.get("solid-demo")?.info.envs).toEqual(["browser"]);
  });
});
