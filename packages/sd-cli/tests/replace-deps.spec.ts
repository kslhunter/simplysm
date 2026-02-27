import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  parseWorkspaceGlobs,
  resolveReplaceDepEntries,
  setupReplaceDeps,
  watchReplaceDeps,
} from "../src/utils/replace-deps";
import fs from "fs";
import path from "path";
import os from "os";

describe("resolveReplaceDepEntries", () => {
  test("captures glob * pattern and substitutes it in source path", () => {
    const result = resolveReplaceDepEntries({ "@simplysm/*": "../simplysm/packages/*" }, [
      "@simplysm/solid",
      "@simplysm/core-common",
    ]);
    expect(result).toEqual([
      { targetName: "@simplysm/solid", sourcePath: "../simplysm/packages/solid" },
      { targetName: "@simplysm/core-common", sourcePath: "../simplysm/packages/core-common" },
    ]);
  });

  test("matches exact package names without *", () => {
    const result = resolveReplaceDepEntries({ "@other/lib": "../other-project/lib" }, [
      "@other/lib",
      "@other/unused",
    ]);
    expect(result).toEqual([{ targetName: "@other/lib", sourcePath: "../other-project/lib" }]);
  });

  test("non-matching packages are not included in results", () => {
    const result = resolveReplaceDepEntries({ "@simplysm/*": "../simplysm/packages/*" }, [
      "@other/lib",
    ]);
    expect(result).toEqual([]);
  });

  test("processes multiple replaceDeps entries", () => {
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

describe("parseWorkspaceGlobs", () => {
  test("parses packages glob array", () => {
    const yaml = `packages:\n  - "packages/*"\n  - "tools/*"`;
    expect(parseWorkspaceGlobs(yaml)).toEqual(["packages/*", "tools/*"]);
  });

  test("parses glob without quotes", () => {
    const yaml = `packages:\n  - packages/*\n  - tools/*`;
    expect(parseWorkspaceGlobs(yaml)).toEqual(["packages/*", "tools/*"]);
  });

  test("returns empty array for empty content", () => {
    expect(parseWorkspaceGlobs("")).toEqual([]);
  });

  test("returns empty array if packages section is missing", () => {
    const yaml = `# some comment\nsomething: value`;
    expect(parseWorkspaceGlobs(yaml)).toEqual([]);
  });
});

describe("setupReplaceDeps", () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Create test project structure in temporary directory
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-"));

    // Source package (simplysm/packages/solid)
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 1;");
    await fs.promises.writeFile(path.join(sourceDir, "README.md"), "readme");

    // Create items to be excluded
    await fs.promises.mkdir(path.join(sourceDir, "node_modules"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "node_modules", "dep.js"), "dep");
    await fs.promises.writeFile(path.join(sourceDir, "package.json"), '{"name":"solid"}');
    await fs.promises.mkdir(path.join(sourceDir, ".cache"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, ".cache", "file.txt"), "cache");
    await fs.promises.mkdir(path.join(sourceDir, "tests"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "tests", "test.spec.ts"), "test");

    // Target project (app/node_modules/@simplysm/solid)
    // pnpm style: app/node_modules/@simplysm/solid → symlink to .pnpm store
    const appRoot = path.join(tmpDir, "app");

    // .pnpm store directory (where actual contents are)
    const pnpmStoreTarget = path.join(
      appRoot,
      "node_modules",
      ".pnpm",
      "@simplysm+solid@1.0.0",
      "node_modules",
      "@simplysm",
      "solid",
    );
    await fs.promises.mkdir(pnpmStoreTarget, { recursive: true });
    await fs.promises.writeFile(path.join(pnpmStoreTarget, "index.js"), "old");

    // node_modules/@simplysm/solid → symlink to .pnpm store
    const nodeModulesSymlink = path.join(appRoot, "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(path.dirname(nodeModulesSymlink), { recursive: true });
    const relativeToStore = path.relative(path.dirname(nodeModulesSymlink), pnpmStoreTarget);
    await fs.promises.symlink(relativeToStore, nodeModulesSymlink, "dir");
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  test("replaces package in node_modules by copying from source directory", async () => {
    const appRoot = path.join(tmpDir, "app");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    const targetPath = path.join(appRoot, "node_modules", "@simplysm", "solid");

    // Symlink is preserved
    const stat = await fs.promises.lstat(targetPath);
    expect(stat.isSymbolicLink()).toBe(true);

    // Verify source files are copied to symlink's actual path (.pnpm store)
    const realPath = await fs.promises.realpath(targetPath);
    const indexContent = await fs.promises.readFile(path.join(realPath, "index.js"), "utf-8");
    expect(indexContent).toBe("export default 1;");

    const readmeContent = await fs.promises.readFile(path.join(targetPath, "README.md"), "utf-8");
    expect(readmeContent).toBe("readme");
  });

  test("excludes node_modules, package.json, .cache, and tests when copying", async () => {
    const appRoot = path.join(tmpDir, "app");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    const targetPath = path.join(appRoot, "node_modules", "@simplysm", "solid");

    // Files to be copied
    expect(fs.existsSync(path.join(targetPath, "index.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, "README.md"))).toBe(true);

    // Items to be excluded
    expect(fs.existsSync(path.join(targetPath, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(targetPath, "package.json"))).toBe(false);
    expect(fs.existsSync(path.join(targetPath, ".cache"))).toBe(false);
    expect(fs.existsSync(path.join(targetPath, "tests"))).toBe(false);
  });

  test("skips package if source path does not exist", async () => {
    const appRoot = path.join(tmpDir, "app");

    // Create .pnpm store for no-exist package
    const pnpmStoreNoExist = path.join(
      appRoot,
      "node_modules",
      ".pnpm",
      "@simplysm+no-exist@1.0.0",
      "node_modules",
      "@simplysm",
      "no-exist",
    );
    await fs.promises.mkdir(pnpmStoreNoExist, { recursive: true });
    await fs.promises.writeFile(path.join(pnpmStoreNoExist, "index.js"), "no-exist-old");

    // node_modules/@simplysm/no-exist → symlink to .pnpm store
    const noExistSymlink = path.join(appRoot, "node_modules", "@simplysm", "no-exist");
    await fs.promises.mkdir(path.dirname(noExistSymlink), { recursive: true });
    const relativeToStore = path.relative(path.dirname(noExistSymlink), pnpmStoreNoExist);
    await fs.promises.symlink(relativeToStore, noExistSymlink, "dir");

    // Should complete without error
    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // solid symlink is preserved, no-exist symlink remains unchanged
    const solidPath = path.join(appRoot, "node_modules", "@simplysm", "solid");
    const solidStat = await fs.promises.lstat(solidPath);
    expect(solidStat.isSymbolicLink()).toBe(true);

    const noExistStat = await fs.promises.lstat(noExistSymlink);
    expect(noExistStat.isSymbolicLink()).toBe(true);
  });

  test("processes node_modules in workspace packages", async () => {
    const appRoot = path.join(tmpDir, "app");

    // Create workspace package structure (.pnpm store style)
    const pkgPnpmStore = path.join(
      appRoot,
      "packages",
      "client",
      "node_modules",
      ".pnpm",
      "@simplysm+solid@1.0.0",
      "node_modules",
      "@simplysm",
      "solid",
    );
    await fs.promises.mkdir(pkgPnpmStore, { recursive: true });
    await fs.promises.writeFile(path.join(pkgPnpmStore, "index.js"), "old");

    // node_modules/@simplysm/solid → symlink to .pnpm store
    const pkgNodeModulesSymlink = path.join(
      appRoot,
      "packages",
      "client",
      "node_modules",
      "@simplysm",
      "solid",
    );
    await fs.promises.mkdir(path.dirname(pkgNodeModulesSymlink), { recursive: true });
    const relativeToStore = path.relative(path.dirname(pkgNodeModulesSymlink), pkgPnpmStore);
    await fs.promises.symlink(relativeToStore, pkgNodeModulesSymlink, "dir");

    // Create pnpm-workspace.yaml
    await fs.promises.writeFile(
      path.join(appRoot, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // Workspace package's node_modules symlink is also preserved
    const stat = await fs.promises.lstat(pkgNodeModulesSymlink);
    expect(stat.isSymbolicLink()).toBe(true);

    // Verify source files are copied to symlink's actual path
    const realPath = await fs.promises.realpath(pkgNodeModulesSymlink);
    const indexContent = await fs.promises.readFile(path.join(realPath, "index.js"), "utf-8");
    expect(indexContent).toBe("export default 1;");
  });
});

describe("watchReplaceDeps", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-watch-replace-"));

    // Source package (simplysm/packages/solid)
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 1;");

    // Target project (.pnpm store style)
    const appRoot = path.join(tmpDir, "app");
    const pnpmStoreTarget = path.join(
      appRoot,
      "node_modules",
      ".pnpm",
      "@simplysm+solid@1.0.0",
      "node_modules",
      "@simplysm",
      "solid",
    );
    await fs.promises.mkdir(pnpmStoreTarget, { recursive: true });
    await fs.promises.writeFile(path.join(pnpmStoreTarget, "index.js"), "old");

    const nodeModulesSymlink = path.join(appRoot, "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(path.dirname(nodeModulesSymlink), { recursive: true });
    const relativeToStore = path.relative(path.dirname(nodeModulesSymlink), pnpmStoreTarget);
    await fs.promises.symlink(relativeToStore, nodeModulesSymlink, "dir");
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  test("copies source files to target when modified after watch starts", async () => {
    const appRoot = path.join(tmpDir, "app");
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    const targetPath = path.join(appRoot, "node_modules", "@simplysm", "solid");

    const { dispose } = await watchReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // Modify source file
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 2;");
    await new Promise((resolve) => setTimeout(resolve, 500)); // 300ms delay + buffer

    const indexContent = await fs.promises.readFile(path.join(targetPath, "index.js"), "utf-8");
    expect(indexContent).toBe("export default 2;");

    dispose();
  });
});
