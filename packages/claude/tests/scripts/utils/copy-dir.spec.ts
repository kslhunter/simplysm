import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { copyDir } from "../../../scripts/utils/copy-dir.js";

describe("copyDir()", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-copydir-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("디렉토리를 재귀적으로 복사한다", () => {
    const srcDir = path.join(tempDir, "src");
    const destDir = path.join(tempDir, "dest");

    fs.mkdirSync(path.join(srcDir, "subdir"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "file1.txt"), "content1");
    fs.writeFileSync(path.join(srcDir, "subdir", "file2.txt"), "content2");

    copyDir(srcDir, destDir);

    expect(fs.existsSync(path.join(destDir, "file1.txt"))).toBe(true);
    expect(fs.existsSync(path.join(destDir, "subdir", "file2.txt"))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, "file1.txt"), "utf-8")).toBe("content1");
    expect(fs.readFileSync(path.join(destDir, "subdir", "file2.txt"), "utf-8")).toBe("content2");
  });

  it("빈 디렉토리를 복사한다", () => {
    const srcDir = path.join(tempDir, "empty-src");
    const destDir = path.join(tempDir, "empty-dest");

    fs.mkdirSync(srcDir);

    copyDir(srcDir, destDir);

    expect(fs.existsSync(destDir)).toBe(true);
    expect(fs.readdirSync(destDir)).toHaveLength(0);
  });

  it("존재하지 않는 소스 디렉토리에서 에러를 throw한다", () => {
    const srcDir = path.join(tempDir, "non-existent");
    const destDir = path.join(tempDir, "dest");

    expect(() => copyDir(srcDir, destDir)).toThrow();
  });

  it("깊은 중첩 디렉토리를 복사한다", () => {
    const srcDir = path.join(tempDir, "deep-src");
    const destDir = path.join(tempDir, "deep-dest");

    fs.mkdirSync(path.join(srcDir, "a", "b", "c"), { recursive: true });
    fs.writeFileSync(path.join(srcDir, "a", "b", "c", "deep.txt"), "deep content");

    copyDir(srcDir, destDir);

    expect(fs.existsSync(path.join(destDir, "a", "b", "c", "deep.txt"))).toBe(true);
    expect(fs.readFileSync(path.join(destDir, "a", "b", "c", "deep.txt"), "utf-8")).toBe("deep content");
  });
});
