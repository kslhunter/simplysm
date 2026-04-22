import { describe, it, expect, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import type { SdBuildPackageConfig, SdPackageConfig } from "../../src/sd-config.types";
import {
  validateTargets,
  discoverWorkspacePackages,
  hasAngularCoreDependency,
  mergeTestsPackagesIntoConfig,
} from "../../src/utils/package-utils";
import { iteratePackages } from "../../src/utils/package-classify";

describe("validateTargets", () => {
  const packages = {
    "core-node": { target: "node" },
    "core-common": { target: "neutral" },
    "storage": { target: "node" },
  };

  it("does nothing when targets is empty", () => {
    expect(() => validateTargets([], packages)).not.toThrow();
  });

  it("does nothing when all targets exist in packages", () => {
    expect(() => validateTargets(["core-node", "storage"], packages)).not.toThrow();
  });

  it("throws SdError for a single unknown target", () => {
    expect(() => validateTargets(["nonexistent"], packages)).toThrow(
      "Unknown target: nonexistent",
    );
  });

  it("throws SdError listing all unknown targets", () => {
    expect(() => validateTargets(["bad1", "bad2"], packages)).toThrow(
      "Unknown target: bad1, bad2",
    );
  });

  it("throws SdError when some targets are valid and some are not", () => {
    expect(() => validateTargets(["core-node", "nonexistent"], packages)).toThrow(
      "Unknown target: nonexistent",
    );
  });

  it("does not throw for packages with undefined config", () => {
    const packagesWithUndefined = {
      "core-node": { target: "node" },
      "empty-pkg": undefined,
    };
    expect(() => validateTargets(["core-node"], packagesWithUndefined)).not.toThrow();
  });

  it("allows targeting a package with undefined config", () => {
    const packagesWithUndefined: Record<string, unknown> = {
      "core-node": { target: "node" },
      "empty-pkg": undefined,
    };
    expect(() => validateTargets(["empty-pkg"], packagesWithUndefined)).not.toThrow();
  });
});

describe("discoverWorkspacePackages", () => {
  it("discovers packages and tests workspace directories", () => {
    const result = discoverWorkspacePackages(process.cwd());
    expect(result.get("core-common")).toBe("packages/core-common");
    expect(result.get("orm")).toBe("tests/orm");
    expect(result.get("service")).toBe("tests/service");
  });

  it("returns empty map when directory does not exist", () => {
    const result = discoverWorkspacePackages("/nonexistent/path");
    expect(result.size).toBe(0);
  });

  describe("duplicate name detection", () => {
    const tmpDir = path.join(process.cwd(), ".tmp", "test-workspace-dup");

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("throws when same directory name exists in both packages/ and tests/", () => {
      fs.mkdirSync(path.join(tmpDir, "packages", "foo"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "packages", "foo", "package.json"), "{}");
      fs.mkdirSync(path.join(tmpDir, "tests", "foo"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "tests", "foo", "package.json"), "{}");

      expect(() => discoverWorkspacePackages(tmpDir)).toThrow(
        "Duplicate workspace package name: foo",
      );
    });
  });
});

describe("mergeTestsPackagesIntoConfig", () => {
  // Acceptance: targets 없이 watch 실행 시 tests 패키지가 포함된다
  it("merges tests packages into config packages with target node", () => {
    const configPackages: Record<string, SdPackageConfig | undefined> = {
      "core-common": { target: "neutral" },
      "core-node": { target: "node" },
    };
    const workspacePackages = new Map([
      ["core-common", "packages/core-common"],
      ["core-node", "packages/core-node"],
      ["orm", "tests/orm"],
      ["service", "tests/service"],
    ]);

    const { merged, pathMap } = mergeTestsPackagesIntoConfig(configPackages, workspacePackages);

    // tests packages are included
    expect(merged["orm"]).toEqual({ target: "node" });
    expect(merged["service"]).toEqual({ target: "node" });
    // config packages are preserved
    expect(merged["core-common"]).toEqual({ target: "neutral" });
    expect(merged["core-node"]).toEqual({ target: "node" });
    // pathMap has correct paths
    expect(pathMap.get("core-common")).toBe("packages/core-common");
    expect(pathMap.get("orm")).toBe("tests/orm");
    expect(pathMap.get("service")).toBe("tests/service");
  });

  // Acceptance: tests 패키지를 target으로 지정하여 watch 실행 (validateTargets에서 통합 맵 사용)
  it("makes tests packages available for validateTargets", () => {
    const configPackages: Record<string, SdPackageConfig | undefined> = {
      "core-common": { target: "neutral" },
    };
    const workspacePackages = new Map([
      ["core-common", "packages/core-common"],
      ["orm", "tests/orm"],
    ]);

    const { merged } = mergeTestsPackagesIntoConfig(configPackages, workspacePackages);

    // validateTargets should not throw for tests package name
    expect(() => validateTargets(["orm"], merged as Record<string, unknown>)).not.toThrow();
  });

  // Unit: packages/ entries in workspacePackages are not added to merged (already in config)
  it("does not duplicate packages/ entries from workspacePackages", () => {
    const configPackages: Record<string, SdPackageConfig | undefined> = {
      "core-common": { target: "neutral" },
    };
    const workspacePackages = new Map([
      ["core-common", "packages/core-common"],
    ]);

    const { merged } = mergeTestsPackagesIntoConfig(configPackages, workspacePackages);

    expect(Object.keys(merged)).toEqual(["core-common"]);
    // original config is preserved, not overwritten
    expect(merged["core-common"]).toEqual({ target: "neutral" });
  });

  // Unit: empty workspacePackages returns config as-is
  it("returns config unchanged when no workspace packages", () => {
    const configPackages: Record<string, SdPackageConfig | undefined> = {
      "core-common": { target: "neutral" },
    };
    const workspacePackages = new Map<string, string>();

    const { merged, pathMap } = mergeTestsPackagesIntoConfig(configPackages, workspacePackages);

    expect(merged).toEqual(configPackages);
    expect(pathMap.get("core-common")).toBe("packages/core-common");
  });

  // Acceptance: 이름 충돌 시 에러 발생
  it("throws when config package name collides with tests package name", () => {
    const configPackages: Record<string, SdPackageConfig | undefined> = {
      "orm": { target: "node" },
    };
    const workspacePackages = new Map([
      ["orm", "tests/orm"],
    ]);

    expect(() => mergeTestsPackagesIntoConfig(configPackages, workspacePackages)).toThrow(
      /Duplicate package name.*orm/,
    );
  });
});

describe("iteratePackages", () => {
  // Acceptance: Scenario "공통 순회 함수가 패키지를 순회하고 target으로 필터링한다"
  it("filters null configs and returns non-null entries", () => {
    const packages = {
      "core-common": { target: "neutral" } as SdBuildPackageConfig,
      "empty-pkg": undefined,
      "core-node": { target: "node" } as SdBuildPackageConfig,
    };

    const result = iteratePackages(packages, []);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["core-common", "core-node"]);
  });

  it("filters by targets when targets is non-empty", () => {
    const packages = {
      "core-common": { target: "neutral" } as SdBuildPackageConfig,
      "core-node": { target: "node" } as SdBuildPackageConfig,
      "storage": { target: "node" } as SdBuildPackageConfig,
    };

    const result = iteratePackages(packages, ["core-common", "storage"]);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["core-common", "storage"]);
  });

  // Unit: returns all when targets is empty
  it("returns all non-null entries when targets is empty", () => {
    const packages = {
      "a": { target: "node" } as SdBuildPackageConfig,
      "b": { target: "browser" } as SdBuildPackageConfig,
    };

    const result = iteratePackages(packages, []);

    expect(result).toHaveLength(2);
  });

  // Unit: returns empty when all configs are null
  it("returns empty array when all configs are null/undefined", () => {
    const packages = {
      "a": undefined,
      "b": undefined,
    };

    const result = iteratePackages(packages, []);

    expect(result).toHaveLength(0);
  });
});

describe("hasAngularCoreDependency", () => {
  const tmpDir = path.join(process.cwd(), ".tmp", "test-angular-dep");

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Acceptance: Scenario "dependencies에 @angular/core가 있으면 Angular 패키지"
  it("returns true when dependencies contains @angular/core", () => {
    const pkgDir = path.join(tmpDir, "deps-angular");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        dependencies: { "@angular/core": "^21.0.0", "rxjs": "^7" },
      }),
    );

    expect(hasAngularCoreDependency(pkgDir)).toBe(true);
  });

  // Acceptance: Scenario "peerDependencies에 @angular/core가 있으면 Angular 패키지"
  it("returns true when peerDependencies contains @angular/core", () => {
    const pkgDir = path.join(tmpDir, "peer-angular");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        peerDependencies: { "@angular/core": "^21.0.0" },
      }),
    );

    expect(hasAngularCoreDependency(pkgDir)).toBe(true);
  });

  // Acceptance: Scenario "@angular/core가 없으면 비-Angular 패키지"
  it("returns false when @angular/core is not in dependencies or peerDependencies", () => {
    const pkgDir = path.join(tmpDir, "no-angular");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        dependencies: { "rxjs": "^7" },
        devDependencies: { "@angular/compiler": "^21.0.0" },
      }),
    );

    expect(hasAngularCoreDependency(pkgDir)).toBe(false);
  });

  // Unit: returns false when package.json does not exist
  it("returns false when package.json does not exist", () => {
    const pkgDir = path.join(tmpDir, "nonexistent");

    expect(hasAngularCoreDependency(pkgDir)).toBe(false);
  });

  // Unit: returns false when no dependencies at all
  it("returns false when no dependencies or peerDependencies", () => {
    const pkgDir = path.join(tmpDir, "empty-deps");
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "test" }),
    );

    expect(hasAngularCoreDependency(pkgDir)).toBe(false);
  });
});
