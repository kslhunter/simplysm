import { describe, it, expect } from "vitest";
import path from "node:path";

describe("root config rootDir", () => {
  it("packageDir이 process.cwd() 기반 경로를 포함해야 한다", async () => {
    const configModule = await import("../src/configs/root.js");
    const configs = configModule.default;

    // packageDir 옵션이 있는 import/no-extraneous-dependencies 룰 찾기
    const configWithPackageDir = configs.find((c: any) => {
      const rule = c.rules?.["import/no-extraneous-dependencies"];
      return Array.isArray(rule) && rule[1]?.packageDir;
    });
    expect(configWithPackageDir).toBeDefined();

    const [, ruleOptions] = configWithPackageDir.rules["import/no-extraneous-dependencies"];
    expect(ruleOptions.packageDir).toContain(process.cwd());
  });

  it("packageDir에 packages/ 하위 패키지 경로가 포함되어야 한다", async () => {
    const configModule = await import("../src/configs/root.js");
    const configs = configModule.default;

    const configWithPackageDir = configs.find((c: any) => {
      const rule = c.rules?.["import/no-extraneous-dependencies"];
      return Array.isArray(rule) && rule[1]?.packageDir;
    });
    const [, ruleOptions] = configWithPackageDir.rules["import/no-extraneous-dependencies"];

    // process.cwd()/packages/ 하위 디렉토리가 최소 1개 포함
    const packagesDir = path.join(process.cwd(), "packages");
    const subPackageDirs = ruleOptions.packageDir.filter(
      (d: string) => d !== process.cwd() && d.startsWith(packagesDir),
    );
    expect(subPackageDirs.length).toBeGreaterThan(0);
  });
});
