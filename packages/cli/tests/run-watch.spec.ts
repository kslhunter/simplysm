import { describe, expect, it } from "vitest";
import { filterPackagesByTargets } from "../src/utils/package-utils";
import type { SdPackageConfig } from "../src/sd-config.types";

describe("filterPackagesByTargets", () => {
  const mockPackages: Record<string, SdPackageConfig | undefined> = {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "core-browser": { target: "browser" },
    "solid-demo": { target: "client", server: 3000 },
    "claude": { target: "scripts" },
    "empty-pkg": undefined,
  };

  it("빈 targets일 때 scripts 제외한 모든 패키지 반환", () => {
    const result = filterPackagesByTargets(mockPackages, []);

    expect(Object.keys(result)).toHaveLength(4);
    expect(result["core-common"]).toBeDefined();
    expect(result["core-node"]).toBeDefined();
    expect(result["core-browser"]).toBeDefined();
    expect(result["solid-demo"]).toBeDefined();
    expect(result["claude"]).toBeUndefined();
    expect(result["empty-pkg"]).toBeUndefined();
  });

  it("scripts 타겟은 targets에 지정해도 제외", () => {
    const result = filterPackagesByTargets(mockPackages, ["claude"]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("특정 패키지만 필터링", () => {
    const result = filterPackagesByTargets(mockPackages, ["core-common", "core-node"]);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result["core-common"]).toEqual({ target: "neutral" });
    expect(result["core-node"]).toEqual({ target: "node" });
  });

  it("존재하지 않는 패키지 지정 시 빈 결과", () => {
    const result = filterPackagesByTargets(mockPackages, ["non-existent"]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("undefined 패키지 설정은 무시", () => {
    const result = filterPackagesByTargets(mockPackages, ["empty-pkg"]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("client 타겟 패키지 필터링", () => {
    const result = filterPackagesByTargets(mockPackages, ["solid-demo"]);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result["solid-demo"]).toEqual({ target: "client", server: 3000 });
  });

  it("빈 packages 객체", () => {
    const result = filterPackagesByTargets({}, []);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("모든 패키지가 scripts인 경우", () => {
    const scriptsOnly: Record<string, SdPackageConfig> = {
      pkg1: { target: "scripts" },
      pkg2: { target: "scripts" },
    };
    const result = filterPackagesByTargets(scriptsOnly, []);

    expect(Object.keys(result)).toHaveLength(0);
  });
});
