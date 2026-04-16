import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { collectDeps } from "../../../src/deps/replace-deps/collect-deps";
import { pathx } from "@simplysm/core-node";

describe("collectDeps", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = pathx.posix(fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-test-")));
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

  it("tests/ 패키지만 의존하면 workspaceDeps가 빈 배열이다", () => {
    createPkg("tests/orm", "@test/orm");
    createPkg("tests/service", "@test/service");
    createPkg("packages/my-lib", "@test/my-lib", {
      "@test/orm": "workspace:*",
      "@test/service": "workspace:*",
    });

    const result = collectDeps(pathx.posix(path.join(tmpDir, "packages/my-lib")), tmpDir);

    expect(result.workspaceDeps).toEqual([]);
  });

  it("의존성이 없는 패키지는 빈 결과를 반환한다", () => {
    createPkg("packages/my-lib", "@test/my-lib");

    const result = collectDeps(pathx.posix(path.join(tmpDir, "packages/my-lib")), tmpDir);

    expect(result.workspaceDeps).toEqual([]);
    expect(result.replaceDeps).toEqual([]);
  });
});
