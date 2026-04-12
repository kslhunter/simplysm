import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "node:fs";
import path from "path";
import os from "os";

const { applyPwa, createPwaHtmlTransform } = await import(
  "../../src/esbuild/esbuild-pwa"
);

describe("applyPwa — manifest 생성", () => {
  let tmpDir: string;
  let pkgDir: string;
  let distDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-pwa-unit-"));
    pkgDir = path.join(tmpDir, "pkg");
    distDir = path.join(pkgDir, "dist");
  });

  beforeEach(() => {
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(distDir, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("manifest에 icons 필드 없이 생성 (원본 아이콘 없을 때)", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "no-icon-app",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
    });

    const manifest = JSON.parse(
      fs.readFileSync(path.join(distDir, "manifest.webmanifest"), "utf-8"),
    ) as Record<string, unknown>;
    expect(manifest["icons"]).toBeUndefined();
    expect(manifest["name"]).toBe("no-icon-app");
  });
});

describe("applyPwa — mode/pwa 가드", () => {
  let tmpDir: string;
  let pkgDir: string;
  let distDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-pwa-guard-"));
    pkgDir = path.join(tmpDir, "pkg");
    distDir = path.join(pkgDir, "dist");
  });

  beforeEach(() => {
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(distDir, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("dev 모드에서는 아무 파일도 생성하지 않는다", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "test",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "dev",
    });

    expect(fs.existsSync(path.join(distDir, "manifest.webmanifest"))).toBe(false);
  });

  it("pwa: false이면 아무 파일도 생성하지 않는다", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "test",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
      pwa: false,
    });

    expect(fs.existsSync(path.join(distDir, "manifest.webmanifest"))).toBe(false);
  });
});

describe("applyPwa — ngsw-config.json 자동 생성", () => {
  let tmpDir: string;
  let pkgDir: string;
  let distDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-pwa-ngsw-"));
    pkgDir = path.join(tmpDir, "pkg");
    distDir = path.join(pkgDir, "dist");
  });

  beforeEach(() => {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(distDir, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );
    const ngswPath = path.join(pkgDir, "ngsw-config.json");
    if (fs.existsSync(ngswPath)) {
      fs.unlinkSync(ngswPath);
    }
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("ngsw-config.json 부재 시 기본 파일을 프로젝트에 생성한다", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "test",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
    });

    const ngswPath = path.join(pkgDir, "ngsw-config.json");
    expect(fs.existsSync(ngswPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(ngswPath, "utf-8")) as Record<string, unknown>;
    expect(config["index"]).toBe("/index.html");
    const groups = config["assetGroups"] as Array<{ name: string }>;
    expect(groups.map((g) => g.name)).toEqual(["app", "assets"]);
  });

  it("ngsw-config.json 존재 시 덮어쓰지 않는다", async () => {
    const ngswPath = path.join(pkgDir, "ngsw-config.json");
    const customConfig = { index: "/custom.html", assetGroups: [] };
    fs.writeFileSync(ngswPath, JSON.stringify(customConfig));

    await applyPwa({
      pkgDir,
      pkgName: "test",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
    });

    const config = JSON.parse(fs.readFileSync(ngswPath, "utf-8")) as Record<string, unknown>;
    expect(config["index"]).toBe("/custom.html");
  });
});

describe("createPwaHtmlTransform — HTML 변환", () => {
  it("head에 manifest link, body에 SW 등록 스크립트 주입", async () => {
    const transform = createPwaHtmlTransform();
    const input = "<!DOCTYPE html><html><head><title>App</title></head><body><div>content</div></body></html>";
    const output = await transform(input);

    expect(output).toContain('<link rel="manifest" href="manifest.webmanifest">');
    expect(output).toContain("ngsw-worker.js");
    expect(output).toContain("sd-pwa-update-ready");
  });

  it("등록 스크립트에 controllerchange 핸들러와 SKIP_WAITING 포함", async () => {
    const transform = createPwaHtmlTransform();
    const output = await transform("<html><head></head><body></body></html>");

    expect(output).toContain("controllerchange");
    expect(output).toContain("location.reload()");
    expect(output).toContain("SKIP_WAITING");
  });
});
