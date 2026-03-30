import { describe, it, expect, afterEach } from "vitest";
import { getVersion } from "../../src/utils/build-env";
import path from "path";
import fs from "fs/promises";
import os from "os";

describe("getVersion", () => {
  const tmpDirs: string[] = [];

  async function createTmpDir(pkgJson: Record<string, unknown>): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sd-cli-test-"));
    tmpDirs.push(dir);
    await fs.writeFile(path.join(dir, "package.json"), JSON.stringify(pkgJson));
    return dir;
  }

  afterEach(async () => {
    for (const dir of tmpDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it("returns version from package.json", async () => {
    const dir = await createTmpDir({ version: "14.0.0" });
    expect(await getVersion(dir)).toBe("14.0.0");
  });

  it("returns '0.0.0' when version field is missing", async () => {
    const dir = await createTmpDir({ name: "test-pkg" });
    expect(await getVersion(dir)).toBe("0.0.0");
  });
});
