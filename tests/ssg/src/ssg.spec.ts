import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildSsrBundle } from "../../../packages/sd-cli/src/esbuild/esbuild-ssr-config";
import { prerenderRoutes } from "../../../packages/sd-cli/src/ssg/prerender";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixture");
const WORKSPACE_ROOT = path.resolve(__dirname, "..", "..", "..");

const SHELL_HTML = [
  "<!DOCTYPE html>",
  '<html lang="ko">',
  "<head>",
  '<meta charset="utf-8">',
  '<base href="/ssg-fixture/">',
  "<title>SSG fixture</title>",
  "</head>",
  "<body>",
  "<app-root></app-root>",
  "</body>",
  "</html>",
].join("\n");

describe("SSG(빌드 타임 프리렌더) 통합", () => {
  let tmpDir: string;
  let bundlePath: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sd-ssg-test-"));
    const result = await buildSsrBundle({
      pkgDir: FIXTURE_DIR,
      cwd: WORKSPACE_ROOT,
      outdir: path.join(tmpDir, "ssg-bundle"),
    });
    bundlePath = result.bundlePath;
  }, 120000);

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("라우트별 HTML이 생성되고 서버 렌더된 콘텐츠를 포함한다", async () => {
    const outdir = path.join(tmpDir, "dist");
    await prerenderRoutes({
      bundlePath,
      routes: ["/", "/about"],
      documentHtml: SHELL_HTML,
      basePath: "/ssg-fixture/",
      outdir,
    });

    const homeHtml = fs.readFileSync(path.join(outdir, "index.html"), "utf-8");
    expect(homeHtml).toContain("SSG 홈페이지");

    const aboutHtml = fs.readFileSync(path.join(outdir, "about", "index.html"), "utf-8");
    expect(aboutHtml).toContain("회사 소개");
  });

  it("hydration 직렬화 마커(ngh)가 포함된다", async () => {
    const outdir = path.join(tmpDir, "dist-hydration");
    await prerenderRoutes({
      bundlePath,
      routes: ["/"],
      documentHtml: SHELL_HTML,
      basePath: "/ssg-fixture/",
      outdir,
    });

    const homeHtml = fs.readFileSync(path.join(outdir, "index.html"), "utf-8");
    expect(homeHtml).toContain("ngh=");
  });

  it('"/"로 시작하지 않는 라우트는 에러로 중단한다', async () => {
    const outdir = path.join(tmpDir, "dist-invalid");
    await expect(
      prerenderRoutes({
        bundlePath,
        routes: ["about"],
        documentHtml: SHELL_HTML,
        basePath: "/ssg-fixture/",
        outdir,
      }),
    ).rejects.toThrow('"/"로 시작');
  });
});
