import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { collectDeps } from "../../../src/deps/replace-deps/collect-deps";
import { pathx } from "@simplysm/core-node";

describe("collectDeps — packages/ 외 워크스페이스 제외", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = pathx.posix(fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-test-")));
    // 워크스페이스 루트 선언 (discoverWorkspacePackages는 pnpm-workspace.yaml 기반)
    fs.writeFileSync(
      pathx.posix(path.join(tmpDir, "pnpm-workspace.yaml")),
      "packages:\n  - packages/*\n  - tests/*\n  - plugins/*\n",
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createPkg(relDir: string, name: string, deps: Record<string, string> = {}): void {
    const dir = pathx.posix(path.join(tmpDir, relDir));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      pathx.posix(path.join(dir, "package.json")),
      JSON.stringify({ name, dependencies: deps }),
    );
  }

  // Scenario: packages/ 패키지는 워크스페이스 맵에 포함된다
  it("packages/ 패키지를 workspaceDeps에 포함한다", () => {
    createPkg("packages/core-common", "@test/core-common");
    createPkg("packages/my-lib", "@test/my-lib", { "@test/core-common": "workspace:*" });

    const result = collectDeps(pathx.posix(path.join(tmpDir, "packages/my-lib")), tmpDir);

    expect(result.workspaceDeps).toContain("core-common");
  });

  // Scenario: tests/ 패키지는 워크스페이스 맵에서 제외된다
  it("tests/ 패키지를 workspaceDeps에 포함하지 않는다", () => {
    createPkg("packages/my-lib", "@test/my-lib", { "@test/orm": "workspace:*" });
    createPkg("tests/orm", "@test/orm");

    const result = collectDeps(pathx.posix(path.join(tmpDir, "packages/my-lib")), tmpDir);

    expect(result.workspaceDeps).not.toContain("orm");
  });

  // Scenario: 패키지의 dependency에 tests/ 패키지가 있으면 workspaceDeps에서 무시된다
  it("dependency에 tests/ 패키지가 있어도 workspaceDeps에서 무시한다", () => {
    createPkg("packages/core-common", "@test/core-common");
    createPkg("tests/orm", "@test/orm");
    createPkg("packages/my-lib", "@test/my-lib", {
      "@test/core-common": "workspace:*",
      "@test/orm": "workspace:*",
    });

    const result = collectDeps(pathx.posix(path.join(tmpDir, "packages/my-lib")), tmpDir);

    expect(result.workspaceDeps).toContain("core-common");
    expect(result.workspaceDeps).not.toContain("orm");
  });

  // Scenario: plugins/ 패키지도 packages/ 가 아니므로 workspaceDeps에서 제외된다
  it("dependency에 plugins/ 패키지가 있어도 workspaceDeps에서 무시한다", () => {
    createPkg("packages/my-lib", "@test/my-lib", { "@test/sd": "workspace:*" });
    createPkg("plugins/sd", "@test/sd");

    const result = collectDeps(pathx.posix(path.join(tmpDir, "packages/my-lib")), tmpDir);

    expect(result.workspaceDeps).not.toContain("sd");
  });
});
