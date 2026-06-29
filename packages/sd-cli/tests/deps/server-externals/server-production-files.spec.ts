import { describe, expect, it, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  parseLockfileVersions,
  resolveLockedVersions,
} from "../../../src/deps/server-externals/server-production-files";

const tmpDirs: string[] = [];

function createLock(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-bun-lock-"));
  tmpDirs.push(dir);
  fs.writeFileSync(path.join(dir, "bun.lock"), content);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseLockfileVersions", () => {
  it("reads unscoped, scoped, alias, and optional entries from bun.lock", () => {
    const cwd = createLock(`{
  "lockfileVersion": 1,
  "packages": {
    "is-number": ["is-number@7.0.0", "", {}, "sha512-a"],
    "@types/node": ["@types/node@24.13.2", "", {}, "sha512-b"],
    "alias-pkg": ["is-number@6.0.0", "", {}, "sha512-c"],
    "fsevents": ["fsevents@2.3.3", "", { "os": "darwin" }, "sha512-d"],
  }
}`);

    const map = parseLockfileVersions(cwd);

    expect(map.get("is-number")).toBe("7.0.0");
    expect(map.get("@types/node")).toBe("24.13.2");
    expect(map.get("alias-pkg")).toBe("6.0.0");
    expect(map.get("fsevents")).toBe("2.3.3");
  });

  it("strips peer suffix from package references", () => {
    const cwd = createLock(`{
  "lockfileVersion": 1,
  "packages": {
    "react-dom": ["react-dom@19.2.7(react@19.2.7)", "", {}, "sha512-a"],
  }
}`);

    expect(parseLockfileVersions(cwd).get("react-dom")).toBe("19.2.7");
  });
});

describe("resolveLockedVersions", () => {
  it("throws when an external dependency is missing from bun.lock", () => {
    const cwd = createLock(`{
  "lockfileVersion": 1,
  "packages": {
    "is-number": ["is-number@7.0.0", "", {}, "sha512-a"],
  }
}`);

    expect(() => resolveLockedVersions(cwd, ["missing"])).toThrow("bun.lock");
  });
});
