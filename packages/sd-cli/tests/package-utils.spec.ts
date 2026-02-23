import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { collectDeps } from "../src/utils/package-utils";
import fs from "fs";
import os from "os";
import path from "path";

describe("collectDeps", () => {
  let tmpDir: string;

  function writePkgJson(dir: string, content: object): void {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(content));
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "collectDeps-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("workspace direct deps를 수집한다", () => {
    // root package.json with scope
    writePkgJson(tmpDir, { name: "@myapp/root" });

    // workspace package: packages/core
    writePkgJson(path.join(tmpDir, "packages", "core"), {
      name: "@myapp/core",
    });

    // target package that depends on @myapp/core
    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: { "@myapp/core": "workspace:*" },
    });

    const result = collectDeps(pkgDir, tmpDir);
    expect(result.workspaceDeps).toEqual(["core"]);
    expect(result.replaceDeps).toEqual([]);
  });

  it("workspace transitive deps를 수집한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    // packages/utils (no deps)
    writePkgJson(path.join(tmpDir, "packages", "utils"), {
      name: "@myapp/utils",
    });

    // packages/core depends on @myapp/utils
    writePkgJson(path.join(tmpDir, "packages", "core"), {
      name: "@myapp/core",
      dependencies: { "@myapp/utils": "workspace:*" },
    });

    // packages/app depends on @myapp/core
    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: { "@myapp/core": "workspace:*" },
    });

    const result = collectDeps(pkgDir, tmpDir);
    expect(result.workspaceDeps).toContain("core");
    expect(result.workspaceDeps).toContain("utils");
    expect(result.replaceDeps).toEqual([]);
  });

  it("replaceDeps glob 패턴 매칭을 처리한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: { "@external/lib-a": "^1.0.0" },
    });

    const result = collectDeps(pkgDir, tmpDir, { "@external/*": "../external/packages/*" });
    expect(result.replaceDeps).toEqual(["@external/lib-a"]);
    expect(result.workspaceDeps).toEqual([]);
  });

  it("workspace → replaceDeps transitive tracking을 처리한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    // packages/core depends on @external/lib-a
    writePkgJson(path.join(tmpDir, "packages", "core"), {
      name: "@myapp/core",
      dependencies: { "@external/lib-a": "^1.0.0" },
    });

    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: { "@myapp/core": "workspace:*" },
    });

    const result = collectDeps(pkgDir, tmpDir, { "@external/*": "../external/packages/*" });
    expect(result.workspaceDeps).toEqual(["core"]);
    expect(result.replaceDeps).toEqual(["@external/lib-a"]);
  });

  it("replaceDeps → replaceDeps transitive tracking을 처리한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    // node_modules/@external/lib-a depends on @external/lib-b
    writePkgJson(path.join(tmpDir, "node_modules", "@external", "lib-a"), {
      name: "@external/lib-a",
      dependencies: { "@external/lib-b": "^1.0.0" },
    });

    // node_modules/@external/lib-b exists
    writePkgJson(path.join(tmpDir, "node_modules", "@external", "lib-b"), {
      name: "@external/lib-b",
    });

    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: { "@external/lib-a": "^1.0.0" },
    });

    const result = collectDeps(pkgDir, tmpDir, { "@external/*": "../external/packages/*" });
    expect(result.replaceDeps).toContain("@external/lib-a");
    expect(result.replaceDeps).toContain("@external/lib-b");
  });

  it("circular dependency에서 무한루프를 방지한다 (visited set)", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    // packages/a depends on @myapp/b
    writePkgJson(path.join(tmpDir, "packages", "a"), {
      name: "@myapp/a",
      dependencies: { "@myapp/b": "workspace:*" },
    });

    // packages/b depends on @myapp/a (circular)
    writePkgJson(path.join(tmpDir, "packages", "b"), {
      name: "@myapp/b",
      dependencies: { "@myapp/a": "workspace:*" },
    });

    const pkgDir = path.join(tmpDir, "packages", "a");
    const result = collectDeps(pkgDir, tmpDir);
    expect(result.workspaceDeps).toContain("b");
    // Should not infinite loop - a is already visited
  });

  it("replaceDeps exact 패턴 매칭을 처리한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: {
        "exact-pkg": "^1.0.0",
        "exact-pkg-extra": "^1.0.0",
      },
    });

    const result = collectDeps(pkgDir, tmpDir, { "exact-pkg": "../exact-pkg" });
    expect(result.replaceDeps).toEqual(["exact-pkg"]);
  });

  it("external 패키지는 무시한다", () => {
    writePkgJson(tmpDir, { name: "@myapp/root" });

    const pkgDir = path.join(tmpDir, "packages", "app");
    writePkgJson(pkgDir, {
      name: "@myapp/app",
      dependencies: {
        "lodash": "^4.0.0",
        "express": "^4.0.0",
        "@myapp/core": "workspace:*",
      },
    });

    writePkgJson(path.join(tmpDir, "packages", "core"), {
      name: "@myapp/core",
    });

    const result = collectDeps(pkgDir, tmpDir);
    expect(result.workspaceDeps).toEqual(["core"]);
    expect(result.replaceDeps).toEqual([]);
  });
});
