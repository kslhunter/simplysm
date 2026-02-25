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
    // 임시 디렉토리에 테스트용 프로젝트 구조 생성
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-"));

    // 소스 패키지 (simplysm/packages/solid)
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 1;");
    await fs.promises.writeFile(path.join(sourceDir, "README.md"), "readme");

    // 제외되어야 할 항목들 생성
    await fs.promises.mkdir(path.join(sourceDir, "node_modules"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "node_modules", "dep.js"), "dep");
    await fs.promises.writeFile(path.join(sourceDir, "package.json"), '{"name":"solid"}');
    await fs.promises.mkdir(path.join(sourceDir, ".cache"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, ".cache", "file.txt"), "cache");
    await fs.promises.mkdir(path.join(sourceDir, "tests"), { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "tests", "test.spec.ts"), "test");

    // 대상 프로젝트 (app/node_modules/@simplysm/solid)
    // pnpm 스타일: app/node_modules/@simplysm/solid → .pnpm 스토어로 symlink
    const appRoot = path.join(tmpDir, "app");

    // .pnpm 스토어 디렉토리 (실제 내용이 있는 곳)
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

    // node_modules/@simplysm/solid → .pnpm 스토어로 symlink
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

    // symlink는 유지됨
    const stat = await fs.promises.lstat(targetPath);
    expect(stat.isSymbolicLink()).toBe(true);

    // symlink의 실제 경로(.pnpm 스토어)에 소스 파일이 복사되었는지 확인
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

    // 복사되어야 할 파일
    expect(fs.existsSync(path.join(targetPath, "index.js"))).toBe(true);
    expect(fs.existsSync(path.join(targetPath, "README.md"))).toBe(true);

    // 제외되어야 할 항목들
    expect(fs.existsSync(path.join(targetPath, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(targetPath, "package.json"))).toBe(false);
    expect(fs.existsSync(path.join(targetPath, ".cache"))).toBe(false);
    expect(fs.existsSync(path.join(targetPath, "tests"))).toBe(false);
  });

  test("skips package if source path does not exist", async () => {
    const appRoot = path.join(tmpDir, "app");

    // no-exist 패키지의 .pnpm 스토어 생성
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

    // node_modules/@simplysm/no-exist → .pnpm 스토어로 symlink
    const noExistSymlink = path.join(appRoot, "node_modules", "@simplysm", "no-exist");
    await fs.promises.mkdir(path.dirname(noExistSymlink), { recursive: true });
    const relativeToStore = path.relative(path.dirname(noExistSymlink), pnpmStoreNoExist);
    await fs.promises.symlink(relativeToStore, noExistSymlink, "dir");

    // 에러 없이 완료되어야 함
    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // solid은 symlink 유지, no-exist도 symlink 그대로
    const solidPath = path.join(appRoot, "node_modules", "@simplysm", "solid");
    const solidStat = await fs.promises.lstat(solidPath);
    expect(solidStat.isSymbolicLink()).toBe(true);

    const noExistStat = await fs.promises.lstat(noExistSymlink);
    expect(noExistStat.isSymbolicLink()).toBe(true);
  });

  test("processes node_modules in workspace packages", async () => {
    const appRoot = path.join(tmpDir, "app");

    // workspace 패키지 구조 생성 (.pnpm 스토어 방식)
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

    // node_modules/@simplysm/solid → .pnpm 스토어로 symlink
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

    // pnpm-workspace.yaml 생성
    await fs.promises.writeFile(
      path.join(appRoot, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // workspace 패키지의 node_modules도 symlink 유지
    const stat = await fs.promises.lstat(pkgNodeModulesSymlink);
    expect(stat.isSymbolicLink()).toBe(true);

    // symlink의 실제 경로에 소스 파일이 복사되었는지 확인
    const realPath = await fs.promises.realpath(pkgNodeModulesSymlink);
    const indexContent = await fs.promises.readFile(path.join(realPath, "index.js"), "utf-8");
    expect(indexContent).toBe("export default 1;");
  });
});

describe("watchReplaceDeps", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-watch-replace-"));

    // 소스 패키지 (simplysm/packages/solid)
    const sourceDir = path.join(tmpDir, "simplysm", "packages", "solid");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 1;");

    // 대상 프로젝트 (.pnpm 스토어 방식)
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

    // 소스 파일 변경
    await fs.promises.writeFile(path.join(sourceDir, "index.js"), "export default 2;");
    await new Promise((resolve) => setTimeout(resolve, 500)); // 300ms delay + buffer

    const indexContent = await fs.promises.readFile(path.join(targetPath, "index.js"), "utf-8");
    expect(indexContent).toBe("export default 2;");

    dispose();
  });
});
