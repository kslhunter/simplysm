import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { parseWorkspaceGlobs, resolveReplaceDepEntries, setupReplaceDeps } from "../src/utils/replace-deps";
import fs from "fs";
import path from "path";
import os from "os";

describe("resolveReplaceDepEntries", () => {
  test("glob * 패턴이 캡처되어 소스 경로의 *에 치환된다", () => {
    const result = resolveReplaceDepEntries({ "@simplysm/*": "../simplysm/packages/*" }, [
      "@simplysm/solid",
      "@simplysm/core-common",
    ]);
    expect(result).toEqual([
      { targetName: "@simplysm/solid", sourcePath: "../simplysm/packages/solid" },
      { targetName: "@simplysm/core-common", sourcePath: "../simplysm/packages/core-common" },
    ]);
  });

  test("* 없는 정확한 패키지명도 매칭된다", () => {
    const result = resolveReplaceDepEntries({ "@other/lib": "../other-project/lib" }, ["@other/lib", "@other/unused"]);
    expect(result).toEqual([{ targetName: "@other/lib", sourcePath: "../other-project/lib" }]);
  });

  test("매칭되지 않는 패키지는 결과에 포함되지 않는다", () => {
    const result = resolveReplaceDepEntries({ "@simplysm/*": "../simplysm/packages/*" }, ["@other/lib"]);
    expect(result).toEqual([]);
  });

  test("여러 replaceDeps 항목이 모두 처리된다", () => {
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
  test("packages glob 배열을 파싱한다", () => {
    const yaml = `packages:\n  - "packages/*"\n  - "tools/*"`;
    expect(parseWorkspaceGlobs(yaml)).toEqual(["packages/*", "tools/*"]);
  });

  test("따옴표 없는 glob도 파싱한다", () => {
    const yaml = `packages:\n  - packages/*\n  - tools/*`;
    expect(parseWorkspaceGlobs(yaml)).toEqual(["packages/*", "tools/*"]);
  });

  test("빈 내용이면 빈 배열을 반환한다", () => {
    expect(parseWorkspaceGlobs("")).toEqual([]);
  });

  test("packages 섹션이 없으면 빈 배열을 반환한다", () => {
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

    // 대상 프로젝트 (app/node_modules/@simplysm/solid)
    const appRoot = path.join(tmpDir, "app");
    const nodeModulesTarget = path.join(appRoot, "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(nodeModulesTarget, { recursive: true });
    await fs.promises.writeFile(path.join(nodeModulesTarget, "index.js"), "old");
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  test("node_modules 내 패키지를 소스 디렉토리로 symlink 교체한다", async () => {
    const appRoot = path.join(tmpDir, "app");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    const targetPath = path.join(appRoot, "node_modules", "@simplysm", "solid");
    const stat = await fs.promises.lstat(targetPath);
    expect(stat.isSymbolicLink()).toBe(true);

    const linkTarget = await fs.promises.readlink(targetPath);
    const resolved = path.resolve(path.dirname(targetPath), linkTarget);
    expect(resolved).toBe(path.join(tmpDir, "simplysm", "packages", "solid"));
  });

  test("소스 경로가 없으면 해당 패키지를 스킵한다", async () => {
    const appRoot = path.join(tmpDir, "app");

    // no-exist 패키지의 node_modules 생성
    const noExistTarget = path.join(appRoot, "node_modules", "@simplysm", "no-exist");
    await fs.promises.mkdir(noExistTarget, { recursive: true });

    // 에러 없이 완료되어야 함
    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // solid은 symlink, no-exist는 그대로
    const solidStat = await fs.promises.lstat(path.join(appRoot, "node_modules", "@simplysm", "solid"));
    expect(solidStat.isSymbolicLink()).toBe(true);

    const noExistStat = await fs.promises.lstat(noExistTarget);
    expect(noExistStat.isDirectory()).toBe(true);
    expect(noExistStat.isSymbolicLink()).toBe(false);
  });

  test("workspace 패키지의 node_modules도 처리한다", async () => {
    const appRoot = path.join(tmpDir, "app");

    // workspace 패키지 구조 생성
    const pkgNodeModules = path.join(appRoot, "packages", "client", "node_modules", "@simplysm", "solid");
    await fs.promises.mkdir(pkgNodeModules, { recursive: true });
    await fs.promises.writeFile(path.join(pkgNodeModules, "index.js"), "old");

    // pnpm-workspace.yaml 생성
    await fs.promises.writeFile(path.join(appRoot, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");

    await setupReplaceDeps(appRoot, {
      "@simplysm/*": "../simplysm/packages/*",
    });

    // workspace 패키지의 node_modules도 symlink 교체 확인
    const stat = await fs.promises.lstat(pkgNodeModules);
    expect(stat.isSymbolicLink()).toBe(true);
  });
});
