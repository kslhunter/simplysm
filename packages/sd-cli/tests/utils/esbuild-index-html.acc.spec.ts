import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const { generateIndexHtml } = await import("../../src/esbuild/esbuild-index-html");

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-index-html-"));

  // fixture index.html
  fs.writeFileSync(
    path.join(tmpDir, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
<head><title>Test App</title></head>
<body><app-root></app-root></body>
</html>`,
  );

  // fixture dist/ 디렉토리 + 빌드 산출물 (SRI 테스트용)
  const distDir = path.join(tmpDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "main.js"), "console.log('main');");
  fs.writeFileSync(path.join(distDir, "polyfills.js"), "console.log('polyfills');");
  fs.writeFileSync(path.join(distDir, "main.css"), "body { margin: 0; }");
  fs.writeFileSync(path.join(distDir, "chunk-ABC.js"), "console.log('chunk');");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createMetafile() {
  const distDir = path.join(tmpDir, "dist");
  return {
    inputs: {},
    outputs: {
      [path.join(distDir, "main.js").replace(/\\/g, "/")]: {
        bytes: 100,
        inputs: {},
        imports: [],
        exports: [],
        entryPoint: "src/main.ts",
        cssBundle: path.join(distDir, "main.css").replace(/\\/g, "/"),
      },
      [path.join(distDir, "polyfills.js").replace(/\\/g, "/")]: {
        bytes: 50,
        inputs: {},
        imports: [],
        exports: [],
        entryPoint: "src/polyfills.ts",
      },
      [path.join(distDir, "main.css").replace(/\\/g, "/")]: {
        bytes: 20,
        inputs: {},
        imports: [],
        exports: [],
      },
      [path.join(distDir, "chunk-ABC.js").replace(/\\/g, "/")]: {
        bytes: 80,
        inputs: {},
        imports: [],
        exports: [],
      },
      [path.join(distDir, "main.js.map").replace(/\\/g, "/")]: {
        bytes: 200,
        inputs: {},
        imports: [],
        exports: [],
      },
    },
  };
}

describe("generateIndexHtml — Acceptance", () => {
  it("entry JS 파일에 대해 <script type=\"module\"> 태그를 생성한다", async () => {
    const result = await generateIndexHtml({
      indexPath: path.join(tmpDir, "index.html"),
      metafile: createMetafile(),
      outdir: path.join(tmpDir, "dist"),
      baseHref: "/my-app/",
      mode: "dev",
      entryNames: ["main", "polyfills"],
    });

    expect(result.errors).toHaveLength(0);
    expect(result.content).toContain("<script");
    expect(result.content).toContain('src="main.js"');
    expect(result.content).toContain('src="polyfills.js"');
    // chunk는 entrypoints에 없으므로 직접 script 태그가 생성되지 않음
    expect(result.content).not.toContain('src="chunk-ABC.js"');
  });

  it("CSS 파일에 대해 <link rel=\"stylesheet\"> 태그를 생성한다", async () => {
    const result = await generateIndexHtml({
      indexPath: path.join(tmpDir, "index.html"),
      metafile: createMetafile(),
      outdir: path.join(tmpDir, "dist"),
      mode: "dev",
      entryNames: ["main"],
    });

    expect(result.content).toContain('rel="stylesheet"');
    expect(result.content).toContain("main.css");
  });

  it("baseHref가 <base> 태그로 설정된다", async () => {
    const result = await generateIndexHtml({
      indexPath: path.join(tmpDir, "index.html"),
      metafile: createMetafile(),
      outdir: path.join(tmpDir, "dist"),
      baseHref: "/my-app/",
      mode: "dev",
      entryNames: ["main"],
    });

    expect(result.content).toContain('<base href="/my-app/">');
  });

  it("postTransform이 HTML 변환에 적용된다", async () => {
    const hmrScript = "<script>/* HMR client */</script>";

    const result = await generateIndexHtml({
      indexPath: path.join(tmpDir, "index.html"),
      metafile: createMetafile(),
      outdir: path.join(tmpDir, "dist"),
      mode: "dev",
      entryNames: ["main"],
      postTransform: (content) => {
        return Promise.resolve(content.replace("</body>", hmrScript + "</body>"));
      },
    });

    expect(result.content).toContain("/* HMR client */");
  });

  it("build 모드에서 SRI integrity 속성이 포함된다", async () => {
    const result = await generateIndexHtml({
      indexPath: path.join(tmpDir, "index.html"),
      metafile: createMetafile(),
      outdir: path.join(tmpDir, "dist"),
      mode: "build",
      entryNames: ["main"],
    });

    expect(result.content).toContain("integrity=");
  });

  it("warnings와 errors가 전파된다", async () => {
    const result = await generateIndexHtml({
      indexPath: path.join(tmpDir, "index.html"),
      metafile: createMetafile(),
      outdir: path.join(tmpDir, "dist"),
      mode: "dev",
      entryNames: ["main"],
    });

    expect(result.warnings).toBeDefined();
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
