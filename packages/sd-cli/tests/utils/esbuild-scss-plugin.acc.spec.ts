import { describe, it, expect, beforeAll, afterAll } from "vitest";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import os from "os";
import { createScssPlugin } from "../../src/esbuild/esbuild-scss-plugin";

describe("createScssPlugin — Acceptance", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scss-plugin-test-"));

    // --- 기본 SCSS 컴파일 fixtures ---
    fs.writeFileSync(
      path.join(tmpDir, "main-basic.js"),
      `import "./global.scss";`,
    );
    fs.writeFileSync(
      path.join(tmpDir, "global.scss"),
      `$color: red;\n.body { color: $color; }`,
    );

    // --- loadPaths fixtures ---
    fs.mkdirSync(path.join(tmpDir, "scss", "commons"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "scss", "commons", "_variables.scss"),
      `$primary: blue;`,
    );
    fs.writeFileSync(
      path.join(tmpDir, "reset.scss"),
      `@use "commons/variables" as vars;\n.reset { color: vars.$primary; }`,
    );
    fs.writeFileSync(
      path.join(tmpDir, "main-loadpaths.js"),
      `import "./reset.scss";`,
    );

    // --- 에러 fixtures ---
    fs.writeFileSync(
      path.join(tmpDir, "error.scss"),
      `.body { color: $undefined-var; }`,
    );
    fs.writeFileSync(
      path.join(tmpDir, "main-error.js"),
      `import "./error.scss";`,
    );
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Scenario: SCSS 파일이 CSS로 컴파일되어 번들에 포함된다
  it("SCSS side-effect import가 sass 컴파일되어 CSS 번들에 포함된다", async () => {
    const result = await esbuild.build({
      entryPoints: [path.join(tmpDir, "main-basic.js")],
      bundle: true,
      write: false,
      outdir: path.join(tmpDir, "out-basic"),
      logLevel: "silent",
      plugins: [createScssPlugin({ loadPaths: [] })],
    });

    const cssOutput = result.outputFiles.find((f) => f.path.endsWith(".css"));
    expect(cssOutput).toBeDefined();
    expect(cssOutput!.text).toContain("color: red");
  });

  // Scenario: SCSS @use/@import는 loadPaths로 해석된다
  it("SCSS @use가 loadPaths로 해석되어 변수가 CSS에 반영된다", async () => {
    const result = await esbuild.build({
      entryPoints: [path.join(tmpDir, "main-loadpaths.js")],
      bundle: true,
      write: false,
      outdir: path.join(tmpDir, "out-loadpaths"),
      logLevel: "silent",
      plugins: [
        createScssPlugin({ loadPaths: [path.join(tmpDir, "scss")] }),
      ],
    });

    const cssOutput = result.outputFiles.find((f) => f.path.endsWith(".css"));
    expect(cssOutput).toBeDefined();
    expect(cssOutput!.text).toContain("color: blue");
  });

  // Scenario: SCSS 컴파일 에러가 esbuild 에러로 전파된다
  it("SCSS 컴파일 에러가 esbuild 에러로 전파되며 파일/라인 정보를 포함한다", async () => {
    try {
      await esbuild.build({
        entryPoints: [path.join(tmpDir, "main-error.js")],
        bundle: true,
        write: false,
        outdir: path.join(tmpDir, "out-error"),
        logLevel: "silent",
        plugins: [createScssPlugin({ loadPaths: [] })],
      });
      expect.fail("빌드가 실패해야 한다");
    } catch (e: any) {
      expect(e.errors).toBeDefined();
      expect(e.errors.length).toBeGreaterThan(0);

      const error = e.errors[0];
      expect(error.text).toBeDefined();
      expect(error.location).toBeDefined();
      expect(error.location.file).toContain("error.scss");
      expect(error.location.line).toBeGreaterThan(0);
    }
  });
});

