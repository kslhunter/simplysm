import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { pathx } from "@simplysm/core-node";
import {
  createCopyFilter,
  loadFilesField,
  NPM_DEFAULT_FILE_PATTERN,
} from "../../../src/deps/replace-deps/replace-deps";

describe("NPM_DEFAULT_FILE_PATTERN", () => {
  it("README 변형을 매칭한다", () => {
    expect(NPM_DEFAULT_FILE_PATTERN.test("README")).toBe(true);
    expect(NPM_DEFAULT_FILE_PATTERN.test("README.md")).toBe(true);
    expect(NPM_DEFAULT_FILE_PATTERN.test("readme.txt")).toBe(true);
  });

  it("LICENSE/LICENCE 변형을 매칭한다", () => {
    expect(NPM_DEFAULT_FILE_PATTERN.test("LICENSE")).toBe(true);
    expect(NPM_DEFAULT_FILE_PATTERN.test("LICENCE")).toBe(true);
    expect(NPM_DEFAULT_FILE_PATTERN.test("license.md")).toBe(true);
  });

  it("CHANGELOG/HISTORY 변형을 매칭한다", () => {
    expect(NPM_DEFAULT_FILE_PATTERN.test("CHANGELOG")).toBe(true);
    expect(NPM_DEFAULT_FILE_PATTERN.test("CHANGELOG.md")).toBe(true);
    expect(NPM_DEFAULT_FILE_PATTERN.test("HISTORY.md")).toBe(true);
  });

  it("관련없는 파일명은 매칭하지 않는다", () => {
    expect(NPM_DEFAULT_FILE_PATTERN.test("tsconfig.json")).toBe(false);
    expect(NPM_DEFAULT_FILE_PATTERN.test("CLAUDE.md")).toBe(false);
    expect(NPM_DEFAULT_FILE_PATTERN.test("package.json")).toBe(false);
  });
});

describe("createCopyFilter", () => {
  const sourcePath = "/source/pkg";

  it("allowedNames에 포함된 첫 번째 세그먼트는 허용한다", () => {
    const filter = createCopyFilter(sourcePath, new Set(["dist", "src"]));

    expect(filter(path.join(sourcePath, "dist"))).toBe(true);
    expect(filter(path.join(sourcePath, "src"))).toBe(true);
    expect(filter(path.join(sourcePath, "dist", "index.js"))).toBe(true);
    expect(filter(path.join(sourcePath, "src", "utils", "helper.ts"))).toBe(true);
  });

  it("allowedNames에 없는 항목은 거부한다", () => {
    const filter = createCopyFilter(sourcePath, new Set(["dist", "src"]));

    expect(filter(path.join(sourcePath, "tsconfig.json"))).toBe(false);
    expect(filter(path.join(sourcePath, "CLAUDE.md"))).toBe(false);
    expect(filter(path.join(sourcePath, "node_modules"))).toBe(false);
  });

  it("package.json은 항상 거부한다", () => {
    const filter = createCopyFilter(sourcePath, new Set(["dist", "src"]));

    expect(filter(path.join(sourcePath, "package.json"))).toBe(false);
  });

  it("npm 기본 파일 패턴은 allowedNames에 없어도 허용한다", () => {
    const filter = createCopyFilter(sourcePath, new Set(["dist"]));

    expect(filter(path.join(sourcePath, "README.md"))).toBe(true);
    expect(filter(path.join(sourcePath, "LICENSE"))).toBe(true);
    expect(filter(path.join(sourcePath, "CHANGELOG.md"))).toBe(true);
  });
});

describe("loadFilesField", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = pathx.posix(await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-load-files-")));
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it("files 필드가 있으면 문자열 배열을 반환한다", async () => {
    await fs.promises.writeFile(
      pathx.posix(path.join(tmpDir, "package.json")),
      JSON.stringify({ name: "test", files: ["dist", "src"] }),
    );

    const result = await loadFilesField(tmpDir);
    expect(result).toEqual(["dist", "src"]);
  });

  it("files 필드가 없으면 undefined를 반환한다", async () => {
    await fs.promises.writeFile(
      pathx.posix(path.join(tmpDir, "package.json")),
      JSON.stringify({ name: "test" }),
    );

    const result = await loadFilesField(tmpDir);
    expect(result).toBeUndefined();
  });
});
