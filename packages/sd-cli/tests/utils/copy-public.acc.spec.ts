import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "copy-public-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("copyPublicFiles — outDir 지원", () => {
  it("outDir 지정 시 해당 경로에 public 파일이 복사된다", async () => {
    // Given: public/ 디렉토리에 파일이 있고, outDir이 지정됨
    const pkgDir = path.join(tmpDir, "my-pkg");
    const publicDir = path.join(pkgDir, "public");
    fs.mkdirSync(path.join(publicDir, "assets"), { recursive: true });
    fs.writeFileSync(path.join(publicDir, "favicon.ico"), "icon-data");
    fs.writeFileSync(path.join(publicDir, "assets", "logo.png"), "logo-data");

    const outDir = path.join(tmpDir, ".capacitor", "www");

    // When: copyPublicFiles를 outDir와 함께 호출
    const { copyPublicFiles } = await import("../../src/utils/copy-public");
    await copyPublicFiles(pkgDir, false, outDir);

    // Then: outDir에 파일이 복사됨
    expect(fs.existsSync(path.join(outDir, "favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "assets", "logo.png"))).toBe(true);
    expect(fs.readFileSync(path.join(outDir, "favicon.ico"), "utf-8")).toBe("icon-data");
  });

  it("outDir 미지정 시 dist/에 복사된다 (기존 동작 유지)", async () => {
    // Given: public/ 디렉토리에 파일이 있고, outDir이 미지정
    const pkgDir = path.join(tmpDir, "my-pkg2");
    const publicDir = path.join(pkgDir, "public");
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, "index.css"), "body{}");

    // When: copyPublicFiles를 outDir 없이 호출
    const { copyPublicFiles } = await import("../../src/utils/copy-public");
    await copyPublicFiles(pkgDir, false);

    // Then: dist/에 파일이 복사됨
    expect(fs.existsSync(path.join(pkgDir, "dist", "index.css"))).toBe(true);
    expect(fs.readFileSync(path.join(pkgDir, "dist", "index.css"), "utf-8")).toBe("body{}");
  });
});
