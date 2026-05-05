import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  getTypesFromPackageJson,
  getCompilerOptionsForEnv,
  toTypecheckEnvs,
} from "../../src/utils/tsconfig";

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), "typecheck-env-"));
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function makePkgDir(devDependencies?: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpRoot, "pkg-"));
  if (devDependencies) {
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ devDependencies }));
  }
  return dir;
}

function makePkgDirWithJson(json: object): string {
  const dir = mkdtempSync(path.join(tmpRoot, "pkg-"));
  writeFileSync(path.join(dir, "package.json"), JSON.stringify(json));
  return dir;
}

describe("getCompilerOptionsForEnv", () => {
  // Scenario: node env에서 DOM 및 WebWorker lib 제거
  it("removes DOM and WebWorker libs in node env", () => {
    const pkgDir = makePkgDir(); // package.json 없음
    const base = { lib: ["lib.esnext.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.webworker.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "node", pkgDir);
    expect(result.lib).toEqual(["lib.esnext.d.ts"]);
  });

  // Scenario: node env에서 사용자 커스텀 lib 보존
  it("preserves custom libs in node env", () => {
    const pkgDir = makePkgDir();
    const base = { lib: ["lib.esnext.d.ts", "lib.webworker.d.ts", "lib.scripthost.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "node", pkgDir);
    expect(result.lib).toEqual(["lib.esnext.d.ts", "lib.scripthost.d.ts"]);
  });

  // Scenario: browser env에서 lib 변화 없음
  it("does not modify lib in browser env", () => {
    const pkgDir = makePkgDir();
    const base = { lib: ["lib.esnext.d.ts", "lib.webworker.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", pkgDir);
    expect(result.lib).toEqual(["lib.esnext.d.ts", "lib.webworker.d.ts"]);
  });

  // Scenario: node env에서 types 변화 없음
  it("does not set types in node env", () => {
    const pkgDir = makePkgDir();
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "node", pkgDir);
    expect(result.types).toBeUndefined();
  });

  // Scenario: browser env에서 @types/node 제거
  it("removes @types/node in browser env via devDeps", () => {
    const pkgDir = makePkgDir({ "@types/node": "^20", "@types/ws": "^8" });
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", pkgDir);
    expect(result.types).toEqual(["ws"]);
  });

  // Scenario: browser env에서 @types/node만 있는 경우
  it("returns empty types when only @types/node in browser env", () => {
    const pkgDir = makePkgDir({ "@types/node": "^20" });
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", pkgDir);
    expect(result.types).toEqual([]);
  });

  // Scenario: browser env에서 @types가 없는 경우
  it("returns empty types when no @types in browser env", () => {
    const pkgDir = makePkgDir({ vitest: "^1" });
    const base = { lib: ["lib.esnext.d.ts"] };
    const result = getCompilerOptionsForEnv(base, "browser", pkgDir);
    expect(result.types).toEqual([]);
  });
});

describe("getTypesFromPackageJson", () => {
  it("extracts @types packages from devDependencies", () => {
    const pkgDir = makePkgDir({ "@types/node": "^20", "@types/ws": "^8", "vitest": "^1" });
    expect(getTypesFromPackageJson(pkgDir)).toEqual(["node", "ws"]);
  });

  it("returns empty array when package.json does not exist", () => {
    const pkgDir = mkdtempSync(path.join(tmpRoot, "pkg-empty-"));
    expect(getTypesFromPackageJson(pkgDir)).toEqual([]);
  });

  it("returns empty array when no devDependencies", () => {
    const pkgDir = makePkgDirWithJson({ name: "test" });
    expect(getTypesFromPackageJson(pkgDir)).toEqual([]);
  });

  it("handles scoped @types packages", () => {
    const pkgDir = makePkgDir({ "@types/ssh2-sftp-client": "^9" });
    expect(getTypesFromPackageJson(pkgDir)).toEqual(["ssh2-sftp-client"]);
  });
});

describe("toTypecheckEnvs", () => {
  it("returns ['node'] for node target", () => {
    expect(toTypecheckEnvs("node")).toEqual(["node"]);
  });

  it("returns ['node'] for server target", () => {
    expect(toTypecheckEnvs("server")).toEqual(["node"]);
  });

  it("returns ['browser'] for browser target", () => {
    expect(toTypecheckEnvs("browser")).toEqual(["browser"]);
  });

  it("returns ['browser'] for client target", () => {
    expect(toTypecheckEnvs("client")).toEqual(["browser"]);
  });

  it("returns ['node', 'browser'] for neutral target", () => {
    expect(toTypecheckEnvs("neutral")).toEqual(["node", "browser"]);
  });

  it("returns ['node', 'browser'] for undefined target", () => {
    expect(toTypecheckEnvs(undefined)).toEqual(["node", "browser"]);
  });
});
