import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../../../..");
const angularPkgDir = resolve(workspaceRoot, "packages/angular");

// Scenario 1: loadPaths 헬퍼가 동일한 경로를 반환한다
describe("buildScssLoadPaths", () => {
  it("returns [pkgDir/scss, cwd/node_modules] for given NgtscBuildInfo", async () => {
    const { buildScssLoadPaths } = await import("../../src/utils/ngtsc-build-core");

    const info = {
      name: "angular",
      cwd: workspaceRoot,
      pkgDir: angularPkgDir,
      output: { js: true, dts: false },
    };

    const result = buildScssLoadPaths(info);

    expect(result).toEqual([
      join(angularPkgDir, "scss"),
      join(workspaceRoot, "node_modules"),
    ]);
  });

  // Unit: different cwd produces different node_modules path
  it("uses cwd from info to construct node_modules path", async () => {
    const { buildScssLoadPaths } = await import("../../src/utils/ngtsc-build-core");

    const customCwd = "/custom/workspace";
    const customPkgDir = "/custom/workspace/packages/my-pkg";

    const result = buildScssLoadPaths({
      name: "test",
      cwd: customCwd,
      pkgDir: customPkgDir,
      output: { js: true, dts: false },
    });

    expect(result).toEqual([
      join(customPkgDir, "scss"),
      join(customCwd, "node_modules"),
    ]);
  });
});

