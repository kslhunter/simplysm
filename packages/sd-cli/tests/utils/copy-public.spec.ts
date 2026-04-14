import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "copy-public-unit-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("copyPublicFiles — outDir 매개변수", () => {
  it("outDir 지정 시 public/ 파일이 outDir에 복사된다", async () => {
    const pkgDir = path.join(tmpDir, "pkg");
    const publicDir = path.join(pkgDir, "public");
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, "test.txt"), "hello");

    const outDir = path.join(tmpDir, "custom-out");

    const { copyPublicFiles } = await import("../../src/utils/copy-public");
    await copyPublicFiles(pkgDir, false, outDir);

    expect(fs.readFileSync(path.join(outDir, "test.txt"), "utf-8")).toBe("hello");
  });

  it("outDir 지정 시 dist/에는 복사되지 않는다", async () => {
    const pkgDir = path.join(tmpDir, "pkg2");
    const publicDir = path.join(pkgDir, "public");
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, "test.txt"), "hello");

    const outDir = path.join(tmpDir, "custom-out2");

    const { copyPublicFiles } = await import("../../src/utils/copy-public");
    await copyPublicFiles(pkgDir, false, outDir);

    expect(fs.existsSync(path.join(pkgDir, "dist", "test.txt"))).toBe(false);
  });

  it("public/ 디렉토리가 없으면 outDir만 생성하고 에러 없이 완료된다", async () => {
    const pkgDir = path.join(tmpDir, "pkg-empty");
    fs.mkdirSync(pkgDir, { recursive: true });

    const outDir = path.join(tmpDir, "custom-out-empty");

    const { copyPublicFiles } = await import("../../src/utils/copy-public");
    await copyPublicFiles(pkgDir, false, outDir);

    expect(fs.existsSync(outDir)).toBe(true);
  });
});
