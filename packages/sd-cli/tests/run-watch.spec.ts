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

});
