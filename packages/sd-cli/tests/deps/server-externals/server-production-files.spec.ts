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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-pnpm-lock-"));
  tmpDirs.push(dir);
  fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), content);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseLockfileVersions", () => {
  it("reads unscoped and scoped entries from pnpm-lock.yaml", () => {
    const cwd = createLock(`lockfileVersion: '9.0'
packages:
  is-number@7.0.0:
    resolution: {integrity: sha512-a}
  '@types/node@24.13.2':
    resolution: {integrity: sha512-b}
  fsevents@2.3.3:
    resolution: {integrity: sha512-d}
    os: [darwin]
`);

    const map = parseLockfileVersions(cwd);

    expect(map.get("is-number")).toBe("7.0.0");
    expect(map.get("@types/node")).toBe("24.13.2");
    expect(map.get("fsevents")).toBe("2.3.3");
  });

  it("strips peer suffix from package keys", () => {
    const cwd = createLock(`lockfileVersion: '9.0'
packages:
  'react-dom@19.2.7(react@19.2.7)':
    resolution: {integrity: sha512-a}
`);

    expect(parseLockfileVersions(cwd).get("react-dom")).toBe("19.2.7");
  });
});

describe("resolveLockedVersions", () => {
  it("throws when an external dependency is missing from pnpm-lock.yaml", () => {
    const cwd = createLock(`lockfileVersion: '9.0'
packages:
  is-number@7.0.0:
    resolution: {integrity: sha512-a}
`);

    expect(() => resolveLockedVersions(cwd, ["missing"])).toThrow("pnpm-lock.yaml");
  });
});
