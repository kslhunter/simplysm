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

  it("returns all packages except scripts when targets is empty", () => {
    const result = filterPackagesByTargets(mockPackages, []);

    expect(Object.keys(result)).toHaveLength(4);
    expect(result["core-common"]).toBeDefined();
    expect(result["core-node"]).toBeDefined();
    expect(result["core-browser"]).toBeDefined();
    expect(result["solid-demo"]).toBeDefined();
    expect(result["claude"]).toBeUndefined();
    expect(result["empty-pkg"]).toBeUndefined();
  });

  it("excludes scripts target even when specified in targets", () => {
    const result = filterPackagesByTargets(mockPackages, ["claude"]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("filters specific packages only", () => {
    const result = filterPackagesByTargets(mockPackages, ["core-common", "core-node"]);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result["core-common"]).toEqual({ target: "neutral" });
    expect(result["core-node"]).toEqual({ target: "node" });
  });

  it("returns empty result when specifying non-existent package", () => {
    const result = filterPackagesByTargets(mockPackages, ["non-existent"]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("ignores undefined package config", () => {
    const result = filterPackagesByTargets(mockPackages, ["empty-pkg"]);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("filters client target packages", () => {
    const result = filterPackagesByTargets(mockPackages, ["solid-demo"]);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result["solid-demo"]).toEqual({ target: "client", server: 3000 });
  });

  it("handles empty packages object", () => {
    const result = filterPackagesByTargets({}, []);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it("handles case where all packages are scripts", () => {
    const scriptsOnly: Record<string, SdPackageConfig> = {
      pkg1: { target: "scripts" },
      pkg2: { target: "scripts" },
    };
    const result = filterPackagesByTargets(scriptsOnly, []);

    expect(Object.keys(result)).toHaveLength(0);
  });
});
