import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "node:fs";
import path from "path";
import os from "os";
import sharp from "sharp";

const { applyPwa, createPwaHtmlTransform } = await import(
  "../../src/esbuild/esbuild-pwa"
);

describe("applyPwa — Acceptance", () => {
  let tmpDir: string;
  let pkgDir: string;
  let distDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-pwa-acc-"));
    pkgDir = path.join(tmpDir, "pkg");
    distDir = path.join(pkgDir, "dist");
  });

  beforeEach(() => {
    // 각 테스트마다 깨끗한 dist/ 생성
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(path.join(pkgDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "test-app", version: "1.0.0" }),
    );
    fs.writeFileSync(
      path.join(distDir, "index.html"),
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );
    // ngsw-config.json 정리 (자동 생성 테스트를 위해)
    const ngswPath = path.join(pkgDir, "ngsw-config.json");
    if (fs.existsSync(ngswPath)) {
      fs.unlinkSync(ngswPath);
    }
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("manifest 기본값 — pkgName과 기본 설정으로 manifest.webmanifest 생성", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "test-app",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
    });

    const manifestPath = path.join(distDir, "manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, unknown>;
    expect(manifest["name"]).toBe("test-app");
    expect(manifest["short_name"]).toBe("test-app");
    expect(manifest["display"]).toBe("standalone");
    expect(manifest["theme_color"]).toBe("#ffffff");
    expect(manifest["background_color"]).toBe("#ffffff");
    expect(manifest["start_url"]).toBe(".");
    expect(manifest["scope"]).toBe(".");
  });

  it("manifest 커스텀 — 지정된 필드만 오버라이드, 나머지 기본값 유지", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "test-app",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
      pwa: {
        manifest: { name: "My App", theme_color: "#ff0000" },
      },
    });

    const manifest = JSON.parse(
      fs.readFileSync(path.join(distDir, "manifest.webmanifest"), "utf-8"),
    ) as Record<string, unknown>;
    expect(manifest["name"]).toBe("My App");
    expect(manifest["short_name"]).toBe("test-app");
    expect(manifest["theme_color"]).toBe("#ff0000");
    expect(manifest["background_color"]).toBe("#ffffff");
  });

  it("아이콘 자동 생성 — public/icon.png에서 192x192, 512x512 생성 및 dist/로 복사", async () => {
    // public/icon.png 생성 (100x100 테스트 이미지)
    const publicDir = path.join(pkgDir, "public");
    fs.mkdirSync(publicDir, { recursive: true });
    const testImage = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toBuffer();
    fs.writeFileSync(path.join(publicDir, "icon.png"), testImage);

    await applyPwa({
      pkgDir,
      pkgName: "test-app",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
    });

    // dist/icons/ 에 아이콘이 복사되었는지 확인
    expect(fs.existsSync(path.join(distDir, "icons", "icon-192x192.png"))).toBe(true);
    expect(fs.existsSync(path.join(distDir, "icons", "icon-512x512.png"))).toBe(true);

    // manifest에 아이콘 경로가 포함되는지 확인
    const manifest = JSON.parse(
      fs.readFileSync(path.join(distDir, "manifest.webmanifest"), "utf-8"),
    ) as Record<string, unknown>;
    const icons = manifest["icons"] as Array<{ src: string; sizes: string }>;
    expect(icons).toHaveLength(2);
    expect(icons[0].src).toBe("icons/icon-192x192.png");
    expect(icons[1].src).toBe("icons/icon-512x512.png");

    // 정리: public/icons/ 삭제 (다른 테스트 영향 방지)
    fs.rmSync(path.join(publicDir, "icons"), { recursive: true, force: true });
    fs.unlinkSync(path.join(publicDir, "icon.png"));
  });

  it("커스텀 아이콘 — pwa.manifest.icons 설정 시 자동 생성 건너뜀", async () => {
    const customIcons = [{ src: "custom/icon.png", sizes: "256x256", type: "image/png" }];

    await applyPwa({
      pkgDir,
      pkgName: "test-app",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
      pwa: { manifest: { icons: customIcons } },
    });

    const manifest = JSON.parse(
      fs.readFileSync(path.join(distDir, "manifest.webmanifest"), "utf-8"),
    ) as Record<string, unknown>;
    const icons = manifest["icons"] as Array<{ src: string }>;
    expect(icons).toHaveLength(1);
    expect(icons[0].src).toBe("custom/icon.png");
  });

  it("augmentAppWithServiceWorker 통합 — ngsw.json + ngsw-worker.js 생성", async () => {
    await applyPwa({
      pkgDir,
      pkgName: "test-app",
      cwd: tmpDir,
      outdir: distDir,
      baseHref: "/",
      mode: "build",
    });

    // ngsw.json 생성 확인
    const ngswJsonPath = path.join(distDir, "ngsw.json");
    expect(fs.existsSync(ngswJsonPath)).toBe(true);
    const ngswJson = JSON.parse(fs.readFileSync(ngswJsonPath, "utf-8")) as Record<string, unknown>;
    expect(ngswJson["configVersion"]).toBeDefined();
    expect(ngswJson["assetGroups"]).toBeDefined();

    // ngsw-worker.js 복사 확인
    expect(fs.existsSync(path.join(distDir, "ngsw-worker.js"))).toBe(true);

    // ngsw-config.json 자동 생성 확인
    expect(fs.existsSync(path.join(pkgDir, "ngsw-config.json"))).toBe(true);
  });
});

describe("createPwaHtmlTransform — Acceptance", () => {
  it("HTML에 manifest link와 SW 등록 스크립트를 올바른 위치에 주입", async () => {
    const transform = createPwaHtmlTransform();
    const input = [
      "<!DOCTYPE html>",
      "<html><head><title>App</title></head>",
      "<body><div id=\"app\"></div></body></html>",
    ].join("\n");

    const output = await transform(input);

    // manifest link는 </head> 앞에 위치
    const headEnd = output.indexOf("</head>");
    const manifestPos = output.indexOf('<link rel="manifest"');
    expect(manifestPos).toBeGreaterThan(-1);
    expect(manifestPos).toBeLessThan(headEnd);

    // SW 등록 스크립트는 </body> 앞에 위치
    const bodyEnd = output.indexOf("</body>");
    const scriptPos = output.indexOf("ngsw-worker.js");
    expect(scriptPos).toBeGreaterThan(-1);
    expect(scriptPos).toBeLessThan(bodyEnd);

    // sd-pwa-update-ready 이벤트와 SKIP_WAITING 포함
    expect(output).toContain("sd-pwa-update-ready");
    expect(output).toContain("SKIP_WAITING");
    expect(output).toContain("controllerchange");
  });
});
