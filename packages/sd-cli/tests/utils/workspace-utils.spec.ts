import { describe, expect, it, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  collectWorkspacePackages,
  findWorkspaceRoot,
  parsePackageJsonWorkspaces,
} from "../../src/utils/workspace-utils";

const tmpDirs: string[] = [];

function createTmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-workspace-utils-"));
  tmpDirs.push(dir);
  return dir;
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("parsePackageJsonWorkspaces", () => {
  it("supports array form", () => {
    expect(parsePackageJsonWorkspaces(["packages/*", "tests/*"])).toEqual([
      "packages/*",
      "tests/*",
    ]);
  });

  it("supports object packages form", () => {
    expect(parsePackageJsonWorkspaces({ packages: ["packages/*", "!packages/skip"] })).toEqual([
      "packages/*",
      "!packages/skip",
    ]);
  });
});

describe("collectWorkspacePackages", () => {
  it("collects package directories and ignores negative patterns", () => {
    const root = createTmpRoot();
    writeJson(path.join(root, "package.json"), {
      private: true,
      workspaces: ["packages/*", "tests/*", "!packages/skip"],
    });
    writeJson(path.join(root, "packages", "core", "package.json"), {
      name: "@scope/core",
    });
    writeJson(path.join(root, "packages", "skip", "package.json"), {
      name: "@scope/skip",
    });
    writeJson(path.join(root, "tests", "orm", "package.json"), { name: "orm" });
    fs.mkdirSync(path.join(root, "packages", "no-package"), { recursive: true });

    const result = collectWorkspacePackages(root).map((item) => ({
      dirName: item.dirName,
      packageName: item.packageName,
      relPath: item.relPath,
    }));

    expect(result).toEqual([
      { dirName: "core", packageName: "@scope/core", relPath: "packages/core" },
      { dirName: "orm", packageName: "orm", relPath: "tests/orm" },
    ]);
  });
});

describe("findWorkspaceRoot", () => {
  it("finds nearest package.json with workspaces", () => {
    const root = createTmpRoot();
    writeJson(path.join(root, "package.json"), {
      private: true,
      workspaces: ["packages/*"],
    });
    const nested = path.join(root, "packages", "app", "src");
    fs.mkdirSync(nested, { recursive: true });

    expect(findWorkspaceRoot(nested)).toBe(root.replace(/\\/g, "/"));
  });
});
