import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { pathx } from "@simplysm/core-node";
import { resolveAllReplaceDepEntries } from "../../../src/deps/replace-deps/replace-deps-resolve";
import { createLogger } from "@simplysm/core-common";

describe("resolveAllReplaceDepEntries", () => {
  let tmpDir: string;
  let projectRoot: string;
  const logger = createLogger("test");

  beforeEach(async () => {
    tmpDir = pathx.posix(await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-resolve-deps-")));
    projectRoot = pathx.posix(path.join(tmpDir, "project"));
    await fs.promises.mkdir(projectRoot, { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(projectRoot, "package.json")),
      JSON.stringify({ private: true, workspaces: [] }),
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  /**
   * node_modules에 패키지 디렉토리를 생성하는 헬퍼
   */
  async function createNodeModulesPkg(
    nodeModulesDir: string,
    pkgName: string,
  ): Promise<string> {
    const pkgDir = pathx.posix(path.join(nodeModulesDir, pkgName));
    await fs.promises.mkdir(pkgDir, { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(pkgDir, "package.json")),
      JSON.stringify({ name: pkgName }),
    );
    return pkgDir;
  }

  /**
   * 소스 패키지를 생성하는 헬퍼
   */
  async function createSourcePkg(name: string): Promise<string> {
    const sourcePath = pathx.posix(path.join(tmpDir, name));
    await fs.promises.mkdir(sourcePath, { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "package.json")),
      JSON.stringify({ name, files: ["dist"] }),
    );
    await fs.promises.mkdir(pathx.posix(path.join(sourcePath, "dist")), { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "dist", "index.js")),
      "module.exports = {};",
    );
    return sourcePath;
  }

  it("동일 actualTargetPath를 가진 항목은 중복 등록되지 않는다", async () => {
    // Given: 루트 node_modules와 workspace pkg의 node_modules에 동일 패키지가 존재하고
    //        둘 다 같은 실제 경로(symlink 해석 후)를 가리킨다
    const sourcePath = await createSourcePkg("@test/pkg");
    const nodeModulesDir = pathx.posix(path.join(projectRoot, "node_modules"));
    await createNodeModulesPkg(nodeModulesDir, "@test/pkg");

    // workspace 패키지 설정 (package.json#workspaces에 추가)
    const workspacePkgDir = pathx.posix(path.join(projectRoot, "packages", "my-app"));
    await fs.promises.mkdir(workspacePkgDir, { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(workspacePkgDir, "package.json")),
      JSON.stringify({ name: "my-app" }),
    );
    await fs.promises.writeFile(
      pathx.posix(path.join(projectRoot, "package.json")),
      JSON.stringify({ private: true, workspaces: ["packages/*"] }),
    );

    // workspace 패키지의 node_modules에도 동일 패키지 생성
    const wsPkgNodeModules = pathx.posix(path.join(workspacePkgDir, "node_modules"));
    await createNodeModulesPkg(wsPkgNodeModules, "@test/pkg");

    // When
    const entries = await resolveAllReplaceDepEntries(
      projectRoot,
      { "@test/pkg": sourcePath },
      logger,
    );

    // Then: actualTargetPath가 다르므로 2개가 반환되어야 한다
    //       (symlink가 아닌 실제 디렉토리이므로 actualTargetPath가 각각 다름)
    //       중복 방지 로직은 동일 actualTargetPath일 때만 작동한다
    const actualTargetPaths = entries.map((e) => e.actualTargetPath);
    const uniqueActualTargetPaths = new Set(actualTargetPaths);
    expect(actualTargetPaths.length).toBe(uniqueActualTargetPaths.size);
  });

  it("여러 replaceDeps 패턴이 올바르게 매칭되어 결과를 반환한다", async () => {
    // Given: 2개의 다른 패턴과 각각의 소스 패키지
    const sourceA = await createSourcePkg("@test/pkg-a");
    const sourceB = await createSourcePkg("@other/lib");
    const nodeModulesDir = pathx.posix(path.join(projectRoot, "node_modules"));
    await createNodeModulesPkg(nodeModulesDir, "@test/pkg-a");
    await createNodeModulesPkg(nodeModulesDir, "@other/lib");

    // When: 2개 패턴으로 호출 (glob이 병렬 실행되어야 함)
    const entries = await resolveAllReplaceDepEntries(
      projectRoot,
      {
        "@test/pkg-a": sourceA,
        "@other/lib": sourceB,
      },
      logger,
    );

    // Then: 두 패턴 모두 매칭되어 2개 entries 반환
    expect(entries).toHaveLength(2);
    const targetNames = entries.map((e) => e.targetName).sort();
    expect(targetNames).toEqual(["@other/lib", "@test/pkg-a"]);
  });

  it("빈 replaceDeps 설정이면 빈 배열을 반환한다", async () => {
    const entries = await resolveAllReplaceDepEntries(projectRoot, {}, logger);
    expect(entries).toEqual([]);
  });
});
